"""Retrieval-Augmented Generation (RAG) Engine for CivicAssist using ChromaDB.
Provides local persistent vector storage and semantic embeddings via sentence-transformers/all-MiniLM-L6-v2.
Features section-aware document chunking, cosine similarity retrieval, metadata filtering,
and explicit insufficient-evidence handling.
"""
import os
import json
import re
from typing import Dict, Any, List, Optional

# Ensure offline operation using cached local weights without network latency
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

GUIDELINES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "civic_guidelines")
)
CHROMA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "chroma_db")
)
COLLECTION_NAME = "civic_guidelines_semantic"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_SIMILARITY_THRESHOLD = 0.30

# Lazy global singletons
_embedding_model = None
_chroma_client = None
_chroma_collection = None


def get_embedding_model():
    """Retrieve or lazily initialize the SentenceTransformer embedding model."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, local_files_only=True)
        except Exception as e:
            print(f"Warning: Could not load local SentenceTransformer: {e}")
            _embedding_model = None
    return _embedding_model


def get_chroma_client():
    """Retrieve or lazily initialize the ChromaDB persistent client."""
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            os.makedirs(CHROMA_DIR, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
        except Exception as e:
            print(f"Warning: Could not initialize ChromaDB client: {e}")
            _chroma_client = None
    return _chroma_client


def get_chroma_collection():
    """Retrieve or lazily initialize the persistent ChromaDB collection."""
    global _chroma_collection
    if _chroma_collection is None:
        client = get_chroma_client()
        if client:
            try:
                _chroma_collection = client.get_or_create_collection(
                    name=COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"}
                )
            except Exception as e:
                print(f"Warning: Could not get/create collection '{COLLECTION_NAME}': {e}")
                _chroma_collection = None
    return _chroma_collection


def load_guidance_corpus() -> List[Dict[str, Any]]:
    """Load all identifiable documents from the civic guidelines corpus."""
    corpus: List[Dict[str, Any]] = []
    if not os.path.exists(GUIDELINES_DIR):
        return corpus

    for fname in sorted(os.listdir(GUIDELINES_DIR)):
        if fname.endswith(".json"):
            fpath = os.path.join(GUIDELINES_DIR, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    doc = json.load(f)
                    doc["source_file"] = os.path.relpath(
                        fpath, os.path.abspath(os.path.join(GUIDELINES_DIR, "..", ".."))
                    )
                    corpus.append(doc)
            except Exception as e:
                print(f"Error loading {fname}: {e}")
    return corpus


def chunk_section_content(heading: str, content: str, max_chars: int = 260) -> List[str]:
    """Split section content into meaningful sentence-bounded chunks.

    Args:
        heading: Section title/heading.
        content: Raw body text of the section.
        max_chars: Target maximum character length per chunk.

    Returns:
        List of chunk text strings.
    """
    clean_content = content.strip()
    if len(clean_content) <= max_chars:
        return [clean_content]

    # Split by sentence end boundary (.!?) followed by whitespace
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_content) if s.strip()]
    if len(sentences) <= 1:
        return [clean_content]

    chunks: List[str] = []
    current_sentences: List[str] = []
    current_length = 0

    for sentence in sentences:
        if current_sentences and (current_length + len(sentence) > max_chars):
            chunks.append(" ".join(current_sentences))
            current_sentences = [sentence]
            current_length = len(sentence)
        else:
            current_sentences.append(sentence)
            current_length += len(sentence)

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


def ingest_civic_corpus(force_reindex: bool = False) -> Dict[str, Any]:
    """Read civic guideline JSONs, chunk sections, embed, and store in persistent ChromaDB.

    Args:
        force_reindex: If True, re-embeds and upserts all chunks even if already present.

    Returns:
        Ingestion summary dictionary with counts and status.
    """
    corpus = load_guidance_corpus()
    collection = get_chroma_collection()
    model = get_embedding_model()

    if not collection or not model:
        return {
            "status": "error",
            "message": "ChromaDB collection or SentenceTransformer model unavailable.",
            "documents_count": len(corpus),
            "indexed_count": 0,
        }

    # Check if already indexed and force_reindex is False
    existing_count = collection.count()
    if existing_count > 0 and not force_reindex:
        return {
            "status": "ready",
            "message": "ChromaDB collection already populated. Reused existing index.",
            "documents_count": len(corpus),
            "sections_count": sum(len(d.get("sections", [])) for d in corpus),
            "chunks_count": existing_count,
            "indexed_count": existing_count,
            "collection_name": COLLECTION_NAME,
            "storage_dir": CHROMA_DIR,
        }

    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[Dict[str, Any]] = []

    total_sections = 0

    for doc in corpus:
        doc_id = doc["document_id"]
        short_title = doc.get("short_title", doc.get("title", ""))
        jurisdiction = doc.get("jurisdiction", "")
        regions_str = ", ".join(doc.get("applicable_regions", []))
        venue_types_str = ", ".join(doc.get("applicable_venue_types", []))
        doc_status = doc.get("document_status", "UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY")
        source_file = doc.get("source_file", "")
        version = doc.get("version", "2026.1-DEMO")

        for sec in doc.get("sections", []):
            total_sections += 1
            sec_id = sec["section_id"]
            heading = sec.get("heading", "")
            raw_content = sec.get("content", "")

            # Generate chunks
            chunks = chunk_section_content(heading=heading, content=raw_content)

            for chunk_idx, chunk_text in enumerate(chunks):
                chunk_id = f"{doc_id}_{sec_id}_c{chunk_idx}"
                # Embed text combines heading and chunk content for maximum semantic coverage
                embed_text = f"{heading}: {chunk_text}"

                citation = f"[{doc_id}] {short_title}, {sec_id}: {heading}"

                ids.append(chunk_id)
                documents.append(embed_text)
                metadatas.append({
                    "document_id": doc_id,
                    "short_title": short_title,
                    "document_title": doc.get("title", short_title),
                    "section_id": sec_id,
                    "section_heading": heading,
                    "jurisdiction": jurisdiction,
                    "applicable_regions": regions_str,
                    "applicable_venue_types": venue_types_str,
                    "document_status": doc_status,
                    "source_file": source_file,
                    "chunk_index": chunk_idx,
                    "citation": citation,
                    "version": version,
                    "raw_excerpt": chunk_text,
                })

    # Generate embeddings in batch via SentenceTransformer
    embeddings = model.encode(documents, convert_to_numpy=False, show_progress_bar=False)
    embeddings_list = [emb.tolist() if hasattr(emb, "tolist") else list(emb) for emb in embeddings]

    # Idempotent upsert into ChromaDB
    collection.upsert(
        ids=ids,
        embeddings=embeddings_list,
        documents=documents,
        metadatas=metadatas,
    )

    return {
        "status": "ready",
        "message": f"Successfully ingested {len(ids)} chunks across {len(corpus)} documents into ChromaDB.",
        "documents_count": len(corpus),
        "sections_count": total_sections,
        "chunks_count": len(ids),
        "indexed_count": collection.count(),
        "collection_name": COLLECTION_NAME,
        "storage_dir": CHROMA_DIR,
    }


def _retrieve_keyword_fallback(
    query: str,
    city: Optional[str] = None,
    venue_type: Optional[str] = None,
    max_evidence_items: int = 3,
) -> Dict[str, Any]:
    """Disclosed deterministic keyword fallback when vector retrieval is unavailable."""
    corpus = load_guidance_corpus()
    q_tokens = [t.strip().lower() for t in query.split() if len(t.strip()) > 3]
    city_token = city.strip().lower() if city else None
    vt_token = venue_type.strip().lower() if venue_type else None

    scored_sections: List[Dict[str, Any]] = []

    for doc in corpus:
        doc_regions = [r.lower() for r in doc.get("applicable_regions", [])]
        doc_types = [t.lower() for t in doc.get("applicable_venue_types", [])]

        doc_bonus = 0.0
        if city_token and any(city_token in r for r in doc_regions):
            doc_bonus += 5.0
        elif city_token:
            # Exclude non-matching cities
            continue

        if vt_token and any(vt_token in t or t in vt_token for t in doc_types):
            doc_bonus += 3.0

        for sec in doc.get("sections", []):
            sec_text = (sec.get("heading", "") + " " + sec.get("content", "")).lower()
            keywords = [k.lower() for k in sec.get("keywords", [])]

            match_score = doc_bonus
            for token in q_tokens:
                if token in sec_text:
                    match_score += 2.0
                if any(token in kw for kw in keywords):
                    match_score += 3.0

            if match_score > 0:
                scored_sections.append({
                    "score": match_score,
                    "similarity_score": round(min(match_score / 20.0, 1.0), 4),
                    "document_id": doc["document_id"],
                    "document_title": doc["title"],
                    "jurisdiction": doc["jurisdiction"],
                    "version": doc.get("version", "2026.1-DEMO"),
                    "effective_date": doc.get("effective_date", "2026-01-01"),
                    "section_id": sec["section_id"],
                    "heading": sec["heading"],
                    "excerpt": sec["content"],
                    "source_file": doc["source_file"],
                    "citation": f"[{doc['document_id']}] {doc['short_title']}, {sec['section_id']}: {sec['heading']}",
                })

    scored_sections.sort(key=lambda s: s["score"], reverse=True)
    evidence = scored_sections[:max_evidence_items]

    return {
        "retrieval_mode": "keyword_fallback",
        "query": query,
        "matched_documents_count": len({e["document_id"] for e in evidence}),
        "retrieved_evidence": evidence,
        "similarity_scores": [e["similarity_score"] for e in evidence],
        "insufficient_evidence": len(evidence) == 0,
        "general_recommendations": [
            "Plan sound checks strictly 30 minutes before reported curfew thresholds.",
            "Initiate bookings and police intimation 14-21 calendar days prior to event.",
        ],
        "missing_information": [
            "Municipal fee schedule and refundable escrow deposit.",
            "Local Zonal Health Officer and Station House Officer contact details.",
        ],
        "document_status": "UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY",
        "legal_disclaimer": (
            "NOTICE: Operating in disclosed keyword fallback mode. Guidance is unverified sample material for simulation only."
        ),
    }


def retrieve_civic_guidance_rag(
    query: str,
    jurisdiction: Optional[str] = None,
    venue_type: Optional[str] = None,
    city: Optional[str] = None,
    max_evidence_items: int = 3,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> Dict[str, Any]:
    """Retrieve verified excerpts using genuine ChromaDB semantic vector retrieval.

    Args:
        query: User question or topic (e.g. 'coastal acoustic curfew', 'turtle nesting safeguards').
        jurisdiction: Optional jurisdiction filter.
        venue_type: Optional venue type filter.
        city: Optional city filter (e.g. 'Chennai', 'Kolkata').
        max_evidence_items: Maximum excerpts to return.
        similarity_threshold: Minimum cosine similarity threshold (1.0 - distance).

    Returns:
        Structured RAG payload containing:
        - retrieval_mode: 'chromadb_semantic' (or 'keyword_fallback')
        - query: original user query
        - matched_documents_count: count of distinct documents matched
        - retrieved_evidence: identifiable citations with document ID, section, excerpt, similarity score
        - similarity_scores: list of cosine similarity scores
        - insufficient_evidence: True if no chunks exceeded similarity threshold
        - general_recommendations: synthesized operational guidance
        - missing_information: items unverified by sample documents
        - legal_disclaimer: statutory notice
    """
    collection = get_chroma_collection()
    model = get_embedding_model()

    # Graceful fallback if ChromaDB or embedding model is unavailable
    if not collection or not model:
        return _retrieve_keyword_fallback(
            query=query, city=city, venue_type=venue_type, max_evidence_items=max_evidence_items
        )

    # Ensure corpus is indexed in ChromaDB
    if collection.count() == 0:
        ingest_civic_corpus()

    # Generate query embedding
    query_clean = query.strip()
    if not query_clean:
        return {
            "retrieval_mode": "chromadb_semantic",
            "query": query,
            "matched_documents_count": 0,
            "retrieved_evidence": [],
            "similarity_scores": [],
            "insufficient_evidence": True,
            "general_recommendations": [],
            "missing_information": [],
            "document_status": "UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY",
            "legal_disclaimer": "No query provided.",
        }

    q_embedding = model.encode([query_clean], convert_to_numpy=False, show_progress_bar=False)[0]
    q_emb_list = q_embedding.tolist() if hasattr(q_embedding, "tolist") else list(q_embedding)

    # Query ChromaDB collection for top candidates (retrieving up to 10 for post-filtering)
    n_candidates = min(12, max(collection.count(), 1))
    results = collection.query(
        query_embeddings=[q_emb_list],
        n_results=n_candidates,
        include=["documents", "metadatas", "distances"],
    )

    raw_ids = results.get("ids", [[]])[0]
    raw_metadatas = results.get("metadatas", [[]])[0]
    raw_distances = results.get("distances", [[]])[0]

    city_filter = city.strip().lower() if city else None
    vt_filter = venue_type.strip().lower() if venue_type else None

    scored_candidates: List[Dict[str, Any]] = []
    seen_sections: set = set()

    for chunk_id, meta, dist in zip(raw_ids, raw_metadatas, raw_distances):
        # In cosine distance space, similarity = 1.0 - distance
        cosine_sim = round(max(0.0, 1.0 - dist), 4)

        # Apply city metadata filter strictly
        chunk_regions = meta.get("applicable_regions", "").lower()
        if city_filter:
            if city_filter not in chunk_regions:
                # Discard chunk if requested city does not match applicable regions
                continue

        # Optional venue type weighting
        chunk_venues = meta.get("applicable_venue_types", "").lower()
        if vt_filter and (vt_filter in chunk_venues or any(v in vt_filter for v in chunk_venues.split(","))):
            cosine_sim = min(1.0, round(cosine_sim + 0.04, 4))

        # Check relevance threshold
        if cosine_sim < similarity_threshold:
            continue

        # Deduplicate multiple chunks from the exact same section to maintain evidence diversity
        sec_key = f"{meta['document_id']}_{meta['section_id']}"
        if sec_key in seen_sections:
            continue
        seen_sections.add(sec_key)

        scored_candidates.append({
            "chunk_id": chunk_id,
            "document_id": meta["document_id"],
            "document_title": meta["document_title"],
            "short_title": meta["short_title"],
            "jurisdiction": meta["jurisdiction"],
            "version": meta.get("version", "2026.1-DEMO"),
            "section_id": meta["section_id"],
            "heading": meta["section_heading"],
            "excerpt": meta.get("raw_excerpt", meta.get("section_heading")),
            "source_file": meta["source_file"],
            "citation": meta["citation"],
            "similarity_score": cosine_sim,
            "relevance_tier": "HIGH" if cosine_sim >= 0.45 else "MODERATE",
            "score": cosine_sim * 100.0,  # Backward compatible score field
        })

    # Sort descending by cosine similarity
    scored_candidates.sort(key=lambda c: c["similarity_score"], reverse=True)
    evidence = scored_candidates[:max_evidence_items]

    insufficient_evidence = len(evidence) == 0

    # Operational recommendations synthesized from retrieved evidence
    recommendations: List[str] = []
    if any("curfew" in e["heading"].lower() or "decibel" in e["heading"].lower() for e in evidence):
        recommendations.append(
            "Plan sound checks and rehearsals to terminate live sound equipment strictly 30 minutes before reported silence thresholds."
        )
    if any("clearance" in e["heading"].lower() or "lead time" in e["heading"].lower() for e in evidence):
        recommendations.append(
            "Initiate venue booking approvals and formal police intimation at least 14-21 calendar days prior to performance date."
        )
    if any("plastic" in e["heading"].lower() or "ecology" in e["heading"].lower() for e in evidence):
        recommendations.append(
            "Enforce eco-friendly zero-plastic protocols and avoid unshielded coastal lighting during ecological sensitivity windows."
        )
    recommendations.append(
        "Establish a designated volunteer crowd & acoustic safety team to monitor perimeter volume and maintain clear emergency corridors."
    )

    # Missing information unverified by sample documents
    missing_info: List[str] = [
        "Current local municipal fee schedule and refundable sanitation escrow deposit amount (must be verified at local ward office).",
        "Specific names, office hours, and contact details of the active Zonal Health Officer and Station House Officer.",
        "Electrical safety load clearance certificate if deploying independent mobile lighting trusses or commercial PA generators.",
    ]

    return {
        "retrieval_mode": "chromadb_semantic",
        "query": query,
        "matched_documents_count": len({e["document_id"] for e in evidence}),
        "retrieved_evidence": evidence,
        "similarity_scores": [e["similarity_score"] for e in evidence],
        "insufficient_evidence": insufficient_evidence,
        "general_recommendations": recommendations,
        "missing_information": missing_info,
        "document_status": "UNVERIFIED_SAMPLE_GUIDANCE_FOR_SIMULATION_ONLY",
        "legal_disclaimer": (
            "NOTICE: RAG retrieval operates exclusively over an identifiable demonstration corpus "
            "(DOC-CIVIC-001 through DOC-CIVIC-004) indexed in local ChromaDB. This retrieval provides "
            "synthetic planning guidance and does NOT constitute authoritative government clearance, "
            "statutory law, or binding legal advice. Event organizers must independently verify all "
            "requirements with relevant municipal and law enforcement authorities."
        ),
    }
