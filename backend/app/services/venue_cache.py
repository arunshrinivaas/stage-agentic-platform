"""STAGE Platform — Hardened Redis Venue Search Cache Service.

Provides high-performance, resilient, and concurrency-safe caching for venue
searches across both FastAPI application workers and the separate MCP venue server subprocess.

Key Design & Resilience Principles:
1. Concurrency-Safe Durable Generation: Uses a durable SQLite generation counter
   incremented in the exact same database transaction as venue creation. Searches
   that began against an older database generation cannot overwrite or pollute
   namespaces used by subsequent searches.
2. Collision-Safe Cache Keys: Canonical JSON serialization and SHA-256 digest
   covering normalized search filters (city, art_form, min_capacity, max_capacity),
   durable SQLite generation, and Redis version.
3. Robust Version Initialization: Replaces blind hardcoded version returns with
   SETNX followed by an immediate read of the actual active version from Redis,
   guaranteeing race conditions cannot trap a process on an obsolete version.
4. Resilient Error Handling & Silent Fallback: Corrupted or malformed cached JSON is
   safely treated as a cache miss. Redis connection, timeout, or command failures
   fall back cleanly to SQLite without disrupting venue discovery.
5. Strict TTL Validation: Enforces positive integer TTL bounds (> 0).
6. Accurate Telemetry & Isolation: Explicitly distinguishes Redis-backed global stats
   from process-local fallback metrics. Never reports partial local counts as
   aggregated Redis cluster state during outages. Non-reentrant error logging.
7. Zero Credential Exposure: Connection URLs and credentials are never logged or exposed.
8. Safe Process Cleanup: Registers safe exit hooks via atexit.
"""
import os
import sys
import json
import time
import hashlib
import atexit
import logging
import threading
from typing import Optional, List, Dict, Any

try:
    import redis
except ImportError:
    redis = None  # Fallback gracefully if redis client library is unavailable

from app.config import settings

logger = logging.getLogger(__name__)

# Redis key prefixes and namespaces
KEY_VERSION = "stage:venues:version"
KEY_STATS_HITS = "stage:venues:stats:hits"
KEY_STATS_MISSES = "stage:venues:stats:misses"
KEY_STATS_ERRORS = "stage:venues:stats:errors"

# Thread-safe connection singleton
_client: Optional[Any] = None
_client_lock = threading.Lock()

# In-memory local fallback counters (used if Redis is offline or fails)
_local_stats_lock = threading.Lock()
_local_hits = 0
_local_misses = 0
_local_errors = 0
_local_version = 1


def get_redis_client() -> Optional[Any]:
    """Retrieve or lazily initialize the synchronous Redis client with short timeouts."""
    global _client
    if _client is not None:
        return _client

    if redis is None:
        return None

    with _client_lock:
        if _client is not None:
            return _client

        try:
            # Mask credentials if present for any logging
            client = redis.Redis.from_url(
                settings.redis_url,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
                decode_responses=True,
            )
            # Quick ping to verify connectivity
            client.ping()
            _client = client
            logger.info("Connected to Redis venue search cache successfully.")
            return _client
        except Exception as exc:
            _record_error()
            logger.warning("Redis connection unavailable (%s). Falling back to SQLite.", type(exc).__name__)
            return None


def close_cache() -> None:
    """Safely close active Redis connections on process exit or service shutdown."""
    global _client
    with _client_lock:
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
            _client = None


atexit.register(close_cache)


# -----------------------------------------------------------------------------
# SQLite Durable Cache Generation
# -----------------------------------------------------------------------------

def get_durable_generation(conn: Optional[Any] = None, namespace: str = "venues") -> int:
    """Retrieve the durable cache generation counter from SQLite.

    Fails closed: propagates database exceptions rather than substituting generation 1.
    """
    if conn is not None:
        return _query_generation(conn, namespace)
    from app.database import get_db
    with get_db() as c:
        return _query_generation(c, namespace)


def _query_generation(conn: Any, namespace: str = "venues") -> int:
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS platform_cache_metadata (
        namespace TEXT PRIMARY KEY,
        generation INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("SELECT generation FROM platform_cache_metadata WHERE namespace = ?;", (namespace,))
    row = cursor.fetchone()
    if row is not None:
        return int(row[0] if isinstance(row, (tuple, list)) else row["generation"])

    cursor.execute("INSERT OR IGNORE INTO platform_cache_metadata (namespace, generation) VALUES (?, 1);", (namespace,))
    return 1


def increment_durable_generation(conn: Optional[Any] = None, namespace: str = "venues") -> int:
    """Increment durable cache generation counter in SQLite within the caller's transaction."""
    if conn is not None:
        return _do_increment_generation(conn, namespace)
    try:
        from app.database import get_db
        with get_db() as c:
            return _do_increment_generation(c, namespace)
    except Exception as exc:
        logger.warning("Failed to increment durable generation in SQLite (%s).", type(exc).__name__)
        return 1


def _do_increment_generation(conn: Any, namespace: str = "venues") -> int:
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS platform_cache_metadata (
        namespace TEXT PRIMARY KEY,
        generation INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("SELECT generation FROM platform_cache_metadata WHERE namespace = ?;", (namespace,))
    row = cursor.fetchone()
    if row is None:
        new_gen = 2
        cursor.execute("INSERT INTO platform_cache_metadata (namespace, generation) VALUES (?, ?);", (namespace, new_gen))
    else:
        curr = int(row[0] if isinstance(row, (tuple, list)) else row["generation"])
        new_gen = curr + 1
        cursor.execute("UPDATE platform_cache_metadata SET generation = ?, updated_at = CURRENT_TIMESTAMP WHERE namespace = ?;", (new_gen, namespace))
    return new_gen


# -----------------------------------------------------------------------------
# Collision-Safe Cache Key Building
# -----------------------------------------------------------------------------

def normalize_filter_token(val: Optional[Any]) -> str:
    """Normalize a filter argument to a canonical lowercase token or wildcard '*'."""
    if val is None:
        return "*"
    cleaned = str(val).strip().lower()
    return cleaned if cleaned else "*"


def build_cache_key(
    city: Optional[str] = None,
    art_form: Optional[str] = None,
    min_capacity: Optional[int] = None,
    max_capacity: Optional[int] = None,
    version: int = 1,
    generation: int = 1,
) -> str:
    """Generate a deterministic, versioned, collision-safe cache key.

    Uses canonical JSON serialization and a SHA-256 digest of normalized filters:
      stage:venues:g{generation}:v{version}:{sha256_hash}
    """
    n_city = normalize_filter_token(city)
    n_art = normalize_filter_token(art_form)
    n_min = str(int(min_capacity)) if min_capacity is not None else "*"
    n_max = str(int(max_capacity)) if max_capacity is not None else "*"

    canonical_payload = {
        "art_form": n_art,
        "city": n_city,
        "max_capacity": n_max,
        "min_capacity": n_min,
    }
    canonical_str = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":"))
    filter_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    return f"stage:venues:g{generation}:v{version}:{filter_hash}"


# -----------------------------------------------------------------------------
# Cache Version & Invalidation
# -----------------------------------------------------------------------------

def get_cache_version() -> int:
    """Retrieve current cache version from Redis or return local fallback.

    Fixes version initialization:
    If KEY_VERSION is unset in Redis, SETNX 1 is executed, and then
    the actual version is ALWAYS read from Redis to guarantee no race
    causes an obsolete version to be used.
    """
    global _local_version
    client = get_redis_client()
    if client is None:
        return _local_version

    try:
        ver = client.get(KEY_VERSION)
        if ver is None:
            client.setnx(KEY_VERSION, 1)
            # Read actual version from Redis after initialization
            ver = client.get(KEY_VERSION)

        if ver is not None:
            val = int(ver)
            with _local_stats_lock:
                if val > _local_version:
                    _local_version = val
            return val
        return _local_version
    except Exception as exc:
        _record_error()
        logger.warning("Failed to fetch cache version from Redis (%s). Using local version.", type(exc).__name__)
        return _local_version


def invalidate_venue_cache() -> bool:
    """Invalidate venue search cache by incrementing the Redis version namespace.

    All previously cached keys become instantly unreachable in O(1) time
    without requiring costly or blocking Redis scan operations.
    Does NOT increment SQLite generation (that is owned strictly by the DB transaction).
    """
    global _local_version
    with _local_stats_lock:
        _local_version += 1

    client = get_redis_client()
    if client is None:
        logger.info("Venue search cache version bumped locally to v%d.", _local_version)
        return False

    try:
        new_version = client.incr(KEY_VERSION)
        with _local_stats_lock:
            if new_version > _local_version:
                _local_version = new_version
        logger.info("Venue search cache invalidated; new version is v%d.", new_version)
        return True
    except Exception as exc:
        _record_error()
        logger.warning("Failed to increment cache version in Redis (%s).", type(exc).__name__)
        return False


# -----------------------------------------------------------------------------
# Cache Retrieval and Write Operations
# -----------------------------------------------------------------------------

def get_cached_search(
    city: Optional[str] = None,
    art_form: Optional[str] = None,
    min_capacity: Optional[int] = None,
    max_capacity: Optional[int] = None,
    generation: Optional[int] = None,
    version: Optional[int] = None,
) -> Optional[List[Dict[str, Any]]]:
    """Look up cached search results for the given filters.

    Returns:
        List of venue dicts on cache hit, or None on cache miss, malformed JSON, or Redis error.
    """
    client = get_redis_client()
    if client is None:
        _record_miss()
        return None

    try:
        if generation is None:
            try:
                generation = get_durable_generation()
            except Exception as exc:
                _record_error()
                _record_miss()
                logger.warning("Failed to verify durable generation for cache read (%s). Bypassing cache.", type(exc).__name__)
                return None
        if version is None:
            version = get_cache_version()

        cache_key = build_cache_key(
            city=city,
            art_form=art_form,
            min_capacity=min_capacity,
            max_capacity=max_capacity,
            version=version,
            generation=generation,
        )
        raw_data = client.get(cache_key)
        if raw_data is not None:
            try:
                parsed = json.loads(raw_data)
                if isinstance(parsed, list):
                    _record_hit()
                    logger.debug("Venue search cache HIT for key: %s", cache_key)
                    return parsed
                else:
                    _record_error()
                    _record_miss()
                    logger.warning("Cached data for key %s is not a list. Treating as cache miss.", cache_key)
                    return None
            except (json.JSONDecodeError, TypeError, ValueError) as exc:
                _record_error()
                _record_miss()
                logger.warning("Malformed cached JSON for key %s (%s). Treating as cache miss.", cache_key, type(exc).__name__)
                return None

        _record_miss()
        logger.debug("Venue search cache MISS for key: %s", cache_key)
        return None
    except Exception as exc:
        _record_error()
        _record_miss()
        logger.warning("Venue search cache read failure (%s). Falling back to SQLite.", type(exc).__name__)
        return None


def set_cached_search(
    city: Optional[str] = None,
    art_form: Optional[str] = None,
    min_capacity: Optional[int] = None,
    max_capacity: Optional[int] = None,
    results: Optional[List[Dict[str, Any]]] = None,
    ttl: Optional[int] = None,
    generation: Optional[int] = None,
    version: Optional[int] = None,
) -> bool:
    """Store venue search results in cache under the generation & version namespace."""
    if results is None:
        return False

    # Strictly validate TTL: must be a strictly positive integer
    if ttl is not None:
        if not isinstance(ttl, int) or isinstance(ttl, bool) or ttl <= 0:
            raise ValueError(f"TTL must be a strictly positive integer, got: {ttl!r}")
        ttl_seconds = ttl
    else:
        ttl_seconds = settings.venue_cache_ttl_seconds
        if not isinstance(ttl_seconds, int) or isinstance(ttl_seconds, bool) or ttl_seconds <= 0:
            raise ValueError(f"Configured TTL must be a strictly positive integer, got: {ttl_seconds!r}")

    if generation is None:
        try:
            generation = get_durable_generation()
        except Exception as exc:
            _record_error()
            logger.warning("Cannot verify durable generation for cache write (%s). Returning False.", type(exc).__name__)
            return False

    # Stale-write elimination: if SQLite generation has moved forward since the search began,
    # skip caching to prevent obsolete data from polluting newer queries.
    # If latest-generation verification fails, fail closed: return False without writing to Redis.
    try:
        latest_gen = get_durable_generation()
    except Exception as exc:
        _record_error()
        logger.warning("Failed to verify latest durable generation before cache write (%s). Returning False.", type(exc).__name__)
        return False

    if latest_gen > generation:
        logger.info("Skipping stale cache write: search was on generation %d but latest generation is %d.", generation, latest_gen)
        return False

    client = get_redis_client()
    if client is None:
        return False

    try:
        if version is None:
            version = get_cache_version()

        cache_key = build_cache_key(
            city=city,
            art_form=art_form,
            min_capacity=min_capacity,
            max_capacity=max_capacity,
            version=version,
            generation=generation,
        )
        payload = json.dumps(results)
        client.setex(cache_key, ttl_seconds, payload)
        logger.debug("Venue search cache SET for key: %s (ttl: %ds)", cache_key, ttl_seconds)
        return True
    except Exception as exc:
        _record_error()
        logger.warning("Venue search cache write failure (%s).", type(exc).__name__)
        return False


# -----------------------------------------------------------------------------
# Observability & Statistics
# -----------------------------------------------------------------------------

def _record_hit() -> None:
    global _local_hits
    with _local_stats_lock:
        _local_hits += 1
    client = _client
    if client is not None:
        try:
            client.incr(KEY_STATS_HITS)
        except Exception:
            pass


def _record_miss() -> None:
    global _local_misses
    with _local_stats_lock:
        _local_misses += 1
    client = _client
    if client is not None:
        try:
            client.incr(KEY_STATS_MISSES)
        except Exception:
            pass


def _record_error() -> None:
    global _local_errors
    with _local_stats_lock:
        _local_errors += 1
    client = _client
    if client is not None:
        try:
            client.incr(KEY_STATS_ERRORS)
        except Exception:
            pass


def get_cache_stats() -> Dict[str, Any]:
    """Retrieve operational cache statistics clearly distinguishing Redis-backed from local counters."""
    with _local_stats_lock:
        local_h = _local_hits
        local_m = _local_misses
        local_e = _local_errors
        local_v = _local_version

    try:
        gen = get_durable_generation()
    except Exception:
        gen = None

    client = get_redis_client()
    if client is not None:
        try:
            raw_hits, raw_misses, raw_errors, raw_ver = client.mget(
                KEY_STATS_HITS, KEY_STATS_MISSES, KEY_STATS_ERRORS, KEY_VERSION
            )
            r_hits = int(raw_hits) if raw_hits is not None else 0
            r_misses = int(raw_misses) if raw_misses is not None else 0
            r_errors = int(raw_errors) if raw_errors is not None else 0
            r_ver = int(raw_ver) if raw_ver is not None else local_v

            total = r_hits + r_misses
            ratio = round(r_hits / total, 4) if total > 0 else 0.0

            return {
                "backend": "redis",
                "redis_connected": True,
                "hit_count": r_hits,
                "miss_count": r_misses,
                "error_count": r_errors,
                "hit_ratio": ratio,
                "hits": r_hits,
                "misses": r_misses,
                "errors": r_errors,
                "version": r_ver,
                "generation": gen,
                "redis_stats": {
                    "hits": r_hits,
                    "misses": r_misses,
                    "errors": r_errors,
                    "hit_ratio": ratio,
                },
                "local_stats": {
                    "hits": local_h,
                    "misses": local_m,
                    "errors": local_e,
                },
            }
        except Exception as exc:
            _record_error()
            logger.warning("Failed to read cache stats from Redis (%s). Using local fallback counters.", type(exc).__name__)

    # Fallback when Redis is unavailable or mget failed
    total_local = local_h + local_m
    ratio_local = round(local_h / total_local, 4) if total_local > 0 else 0.0

    return {
        "backend": "local_fallback",
        "redis_connected": False,
        "hit_count": local_h,
        "miss_count": local_m,
        "error_count": local_e,
        "hit_ratio": ratio_local,
        "hits": local_h,
        "misses": local_m,
        "errors": local_e,
        "version": local_v,
        "generation": gen,
        "redis_stats": None,
        "local_stats": {
            "hits": local_h,
            "misses": local_m,
            "errors": local_e,
        },
    }


def reset_cache_stats() -> None:
    """Reset statistics counters (primarily used for test isolation)."""
    global _local_hits, _local_misses, _local_errors, _local_version
    with _local_stats_lock:
        _local_hits = 0
        _local_misses = 0
        _local_errors = 0
        _local_version = 1

    client = get_redis_client()
    if client is not None:
        try:
            client.delete(KEY_STATS_HITS, KEY_STATS_MISSES, KEY_STATS_ERRORS)
            client.set(KEY_VERSION, 1)
        except Exception:
            pass
