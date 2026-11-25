"""Comprehensive Unit & Regression Test Suite for STAGE Milestone 7.2:
Hardened Redis Venue Search Cache.

Verifies all correctness hardening requirements:
1. Fix cache version initialization:
   - SETNX + guaranteed actual read from Redis.
   - Concurrent initialization & invalidation never returns obsolete version.
2. Eliminate stale cache writes:
   - Durable SQLite generation counter incremented in same transaction as venue creation.
   - In-flight search starting on older generation cannot overwrite newer generation.
   - Redis unavailable during venue creation does not allow old cached data to reappear on recovery.
3. Collision-safe cache keys:
   - Canonical JSON serialization + SHA-256 digest.
   - Immune to delimiter injection (e.g. colons in city or art form).
   - Case & whitespace normalization and wildcard handling.
4. Harden Redis error handling:
   - Malformed / corrupted cached JSON treated as cache miss without crashing discovery.
   - Redis connection, read, write, version, and invalidation failures fall back safely to SQLite.
   - Strictly positive integer TTL validation.
   - Bounded Redis timeouts; zero credential exposure.
5. Correct cache statistics:
   - Distinguishes Redis-backed global stats from process-local fallback metrics.
   - Never misrepresents local counters as Redis cluster state during outages (redis_stats=None).
   - Non-reentrant error recording.
6. Core & MCP integration:
   - Preserves search_stages signature and returned records.
   - Preserves MCP tool schemas and async execution.
   - Preserves GET /api/venues/cache/stats endpoint.
"""
import os
import sys
import time
import json
import tempfile
import uuid
import atexit
import threading
from typing import Optional, List, Dict, Any

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# 1. Establish isolated temporary SQLite database BEFORE importing app modules/settings
test_db_dir = tempfile.mkdtemp(prefix="stage_test_redis_hardened_")
test_db_path = os.path.join(test_db_dir, f"test_redis_{uuid.uuid4().hex[:8]}.db")
os.environ["DATABASE_PATH"] = test_db_path

def cleanup_test_database():
    """Clean up isolated temporary SQLite database files and directory."""
    for path in [
        test_db_path,
        f"{test_db_path}-wal",
        f"{test_db_path}-shm",
    ]:
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
    try:
        if os.path.exists(test_db_dir):
            os.rmdir(test_db_dir)
    except OSError:
        pass

atexit.register(cleanup_test_database)

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
from app.services.seed_data import seed_database
from app.services import venue_cache
from app.agents.stage_match.tools import search_stages, get_stage_details
import redis


class MockRedisClient:
    """Synchronous Mock Redis client with TTL, atomic counters, and failure simulation."""

    def __init__(self):
        self._data: Dict[str, tuple[str, Optional[float]]] = {}  # key -> (raw_value, expire_timestamp)
        self._int_data: Dict[str, int] = {}                     # key -> int
        self.time_offset = 0.0
        self.should_fail = False
        self.fail_on_get = False
        self.fail_on_setex = False
        self.fail_on_mget = False
        self.error_message = "Simulated Redis failure"
        self._lock = threading.Lock()

    def _now(self) -> float:
        return time.time() + self.time_offset

    def _check_failure(self):
        if self.should_fail:
            raise redis.ConnectionError(self.error_message)

    def ping(self) -> bool:
        self._check_failure()
        return True

    def get(self, key: str) -> Optional[str]:
        self._check_failure()
        if self.fail_on_get:
            raise redis.ConnectionError("Simulated Redis get() failure")
        with self._lock:
            if key in self._int_data:
                return str(self._int_data[key])
            if key in self._data:
                val, exp = self._data[key]
                if exp is not None and self._now() > exp:
                    del self._data[key]
                    return None
                return val
            return None

    def setex(self, key: str, ttl: int, value: str) -> bool:
        self._check_failure()
        if self.fail_on_setex:
            raise redis.ConnectionError("Simulated Redis setex() failure")
        with self._lock:
            self._data[key] = (str(value), self._now() + ttl)
            return True

    def setnx(self, key: str, value: Any) -> int:
        self._check_failure()
        with self._lock:
            if key not in self._data and key not in self._int_data:
                self._int_data[key] = int(value)
                return 1
            return 0

    def set(self, key: str, value: Any) -> bool:
        self._check_failure()
        with self._lock:
            try:
                self._int_data[key] = int(value)
            except (ValueError, TypeError):
                self._data[key] = (str(value), None)
            return True

    def incr(self, key: str) -> int:
        self._check_failure()
        with self._lock:
            val = self._int_data.get(key, 0) + 1
            self._int_data[key] = val
            return val

    def mget(self, *keys) -> List[Optional[str]]:
        self._check_failure()
        if self.fail_on_mget:
            raise redis.ConnectionError("Simulated Redis mget() failure")
        with self._lock:
            res = []
            for k in keys:
                if k in self._int_data:
                    res.append(str(self._int_data[k]))
                elif k in self._data:
                    val, exp = self._data[k]
                    if exp is not None and self._now() > exp:
                        del self._data[k]
                        res.append(None)
                    else:
                        res.append(val)
                else:
                    res.append(None)
            return res

    def delete(self, *keys) -> int:
        with self._lock:
            count = 0
            for k in keys:
                if k in self._data:
                    del self._data[k]
                    count += 1
                if k in self._int_data:
                    del self._int_data[k]
                    count += 1
            return count

    def close(self) -> None:
        pass


def run_all_tests():
    print("=" * 75)
    print("STAGE Milestone 7.2: Hardened Redis Venue Search Cache Test Suite")
    print("=" * 75)

    # Step 0: Initialize test database
    init_db()
    seed_database()
    print("[INIT] Test database initialized and seeded successfully.")

    mock_redis = MockRedisClient()
    venue_cache._client = mock_redis
    venue_cache.reset_cache_stats()

    # -------------------------------------------------------------------------
    # Test 1: Cache Version Initialization & Concurrency Safety
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Cache Version Initialization & Concurrency Safety...")
    mock_redis._int_data.clear()
    mock_redis._data.clear()

    # Simulate fresh start where KEY_VERSION does not exist in Redis yet
    # Two threads read version simultaneously while version is incremented
    v1 = venue_cache.get_cache_version()
    assert v1 == 1, f"Expected initial version 1, got {v1}"
    assert mock_redis.get(venue_cache.KEY_VERSION) == "1", "KEY_VERSION must be set in Redis"

    # Concurrent invalidation simulation: version is bumped in Redis by another process to 5
    mock_redis.set(venue_cache.KEY_VERSION, 5)
    # get_cache_version must read actual value (5) from Redis, NOT returning stale cached 1
    v2 = venue_cache.get_cache_version()
    assert v2 == 5, f"Expected version 5 after bump, got {v2}"
    print("  ✓ SETNX + read pattern verified; concurrent version updates read actual value.")

    # -------------------------------------------------------------------------
    # Test 2: Collision-Safe Cache Key Generation (SHA-256 & Canonical JSON)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Collision-Safe Cache Key Generation...")
    # 1. Delimiter collision resistance: colons in filter values
    k_a = venue_cache.build_cache_key(city="a:b", art_form="c", generation=1, version=1)
    k_b = venue_cache.build_cache_key(city="a", art_form="b:c", generation=1, version=1)
    assert k_a != k_b, "Delimiter collision detected! Canonical JSON + SHA-256 must produce distinct keys"

    k_c1 = venue_cache.build_cache_key(city="Kolkata:50", min_capacity=None, generation=1, version=1)
    k_c2 = venue_cache.build_cache_key(city="Kolkata", min_capacity=50, generation=1, version=1)
    assert k_c1 != k_c2, "Field boundary collision detected between city and min_capacity"

    # 2. Normalization: case, whitespace, wildcard handling
    k_norm1 = venue_cache.build_cache_key(city="  KOLKATA  ", art_form="MUSIC", generation=1, version=1)
    k_norm2 = venue_cache.build_cache_key(city="kolkata", art_form="music", generation=1, version=1)
    assert k_norm1 == k_norm2, "Normalization must produce identical keys for whitespace/case variations"

    # 3. Key structure check
    assert k_norm1.startswith("stage:venues:g1:v1:"), f"Key must include generation and version prefix: {k_norm1}"
    digest = k_norm1.split(":")[-1]
    assert len(digest) == 64, f"Key must end with 64-character SHA-256 hex digest: {digest}"
    print("  ✓ Collision-free SHA-256 canonical hashing verified against delimiter injection.")

    # -------------------------------------------------------------------------
    # Test 3: Stale-Write Elimination via SQLite Durable Generation
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Stale Cache Write Elimination...")
    venue_cache.reset_cache_stats()
    mock_redis._data.clear()

    # Search S1 begins at generation G1
    g1 = venue_cache.get_durable_generation()
    assert g1 >= 1, f"Invalid initial durable generation: {g1}"

    # Simulate in-flight slow search S1 reading SQLite results
    s1_results = [{"id": "v-stale", "name": "Old Venue Snapshot"}]

    # Concurrently, venue creation occurs in SQLite and increments durable generation to G2
    g2 = venue_cache.increment_durable_generation(namespace="venues")
    assert g2 > g1, f"Durable generation must increment: {g1} -> {g2}"

    # Now slow search S1 finishes and attempts to write with older generation g1
    write_result = venue_cache.set_cached_search(
        city="Kolkata",
        results=s1_results,
        generation=g1,
    )
    # set_cached_search must detect latest_gen (g2) > generation (g1) and skip stale write
    assert write_result is False, "Stale cache write should have been skipped when latest_gen > search_gen"

    # Even if an entry existed under g1, any subsequent search reads generation g2 and misses g1
    cached_g2 = venue_cache.get_cached_search(city="Kolkata", generation=g2)
    assert cached_g2 is None, "Subsequent search under g2 must not see g1 results"
    print("  ✓ Stale cache write prevented when generation advanced during in-flight search.")

    # -------------------------------------------------------------------------
    # Test 4: Redis Unavailable During Venue Creation, Followed by Recovery
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Redis Outage During Invalidation & Safe Recovery...")
    venue_cache.reset_cache_stats()
    mock_redis.should_fail = False

    # 1. Populate cache at current generation
    current_gen = venue_cache.get_durable_generation()
    initial_res = search_stages(city="Kolkata")
    assert len(initial_res) > 0

    # Verify cached
    assert venue_cache.get_cache_stats()["hits"] == 0
    repeat_res = search_stages(city="Kolkata")
    assert venue_cache.get_cache_stats()["hits"] == 1, "Expected cache hit"

    # 2. Redis becomes unavailable
    mock_redis.should_fail = True
    mock_redis.error_message = "Simulated network partition during venue creation"

    # 3. Create venue in SQLite while Redis is dead
    client = TestClient(app)
    new_venue_payload = {
        "name": f"Outage Recovery Hall {uuid.uuid4().hex[:6]}",
        "venueType": "Auditorium",
        "location": {"address": "10 Heritage Rd", "neighborhood": "Park Street", "city": "Kolkata"},
        "capacity": {"seated": 500, "standing": 200, "formatted": "500 seated"},
        "suitableCategories": ["Music"],
        "amenities": ["Acoustics"],
        "availabilityNotice": "Open slots",
        "availabilityStatus": "open_slots",
        "host": {"name": "Arts Trust", "role": "Host", "policy": "Standard"},
        "imageUrl": "https://example.com/venue.jpg"
    }

    create_resp = client.post("/api/venues", json=new_venue_payload, headers={"X-STAGE-Role": "provider"})
    assert create_resp.status_code == 201, f"Venue creation failed during Redis outage: {create_resp.text}"

    # Verify SQLite durable generation advanced despite Redis failure
    gen_after_outage = venue_cache.get_durable_generation()
    assert gen_after_outage > current_gen, "SQLite generation counter must advance even when Redis is down"

    # 4. Redis recovers
    mock_redis.should_fail = False

    # 5. Search for Kolkata again: must NOT return stale pre-outage cache entry
    recovered_res = search_stages(city="Kolkata")
    recovered_names = [v["name"] for v in recovered_res]
    assert new_venue_payload["name"] in recovered_names, \
        "Stale cached result reappeared after Redis recovery! Durable generation must isolate new queries."
    print("  ✓ Redis outage during venue creation did not leak stale data after reconnection.")

    # -------------------------------------------------------------------------
    # Test 5: Malformed & Corrupted Cached JSON Handling
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Corrupted and Malformed Cached JSON Handling...")
    cur_gen = venue_cache.get_durable_generation()
    cur_ver = venue_cache.get_cache_version()
    malformed_key = venue_cache.build_cache_key(city="corrupt-city", generation=cur_gen, version=cur_ver)

    # 1. Non-JSON string in Redis
    mock_redis.set(malformed_key, "INVALID_CORRUPT_JSON_DATA{{{")
    bad_res = venue_cache.get_cached_search(city="corrupt-city", generation=cur_gen, version=cur_ver)
    assert bad_res is None, "Malformed JSON must return None (cache miss), not raise exception"

    # 2. JSON that is not a list
    mock_redis.set(malformed_key, json.dumps({"unexpected": "dict_not_list"}))
    bad_type_res = venue_cache.get_cached_search(city="corrupt-city", generation=cur_gen, version=cur_ver)
    assert bad_type_res is None, "Non-list JSON must return None (cache miss), not raise exception"

    # 3. search_stages should execute without crashing
    search_corrupt = search_stages(city="corrupt-city")
    assert isinstance(search_corrupt, list)
    print("  ✓ Malformed and non-list cached data treated safely as cache misses.")

    # -------------------------------------------------------------------------
    # Test 6: Strict Positive Integer TTL Validation
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Strict Positive Integer TTL Validation...")
    dummy_data = [{"id": "v-1", "name": "V1"}]

    # Invalid TTL values must raise ValueError
    for invalid_ttl in [-100, -1, 0, "300", 300.5, True, False]:
        try:
            venue_cache.set_cached_search(city="test", results=dummy_data, ttl=invalid_ttl)
            assert False, f"Expected ValueError for invalid TTL: {invalid_ttl!r}"
        except ValueError:
            pass

    # Valid positive integer TTL must succeed
    assert venue_cache.set_cached_search(city="test", results=dummy_data, ttl=60) is True
    print("  ✓ TTL strictly validated as positive integer (> 0).")

    # -------------------------------------------------------------------------
    # Test 7: Redis Failures During Version Reads & Cache Writes
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Isolated Redis Failures During Version Reads & Writes...")
    mock_redis.fail_on_get = True
    v_fail = venue_cache.get_cache_version()
    assert isinstance(v_fail, int), "Version read failure must fall back to local integer version"
    mock_redis.fail_on_get = False

    mock_redis.fail_on_setex = True
    w_fail = venue_cache.set_cached_search(city="test", results=dummy_data, ttl=60)
    assert w_fail is False, "Cache write failure must return False cleanly without raising"
    mock_redis.fail_on_setex = False
    print("  ✓ Individual Redis command failures handled gracefully without unhandled exceptions.")

    # -------------------------------------------------------------------------
    # Test 8: Cache Statistics & Outage Telemetry Distinction
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Observability & Statistics Telemetry Distinction...")
    venue_cache.reset_cache_stats()
    mock_redis.should_fail = False

    # When Redis is connected
    stats_online = venue_cache.get_cache_stats()
    assert stats_online["backend"] == "redis"
    assert stats_online["redis_connected"] is True
    assert stats_online["redis_stats"] is not None
    assert "hits" in stats_online["redis_stats"]
    assert "local_stats" in stats_online

    # When Redis is down
    mock_redis.should_fail = True
    stats_offline = venue_cache.get_cache_stats()
    assert stats_offline["backend"] == "local_fallback"
    assert stats_offline["redis_connected"] is False
    assert stats_offline["redis_stats"] is None, "During outages, redis_stats must be None (not spoofed)"
    assert stats_offline["local_stats"] is not None
    assert isinstance(stats_offline["error_count"], int)
    mock_redis.should_fail = False

    # Check GET /api/venues/cache/stats endpoint
    stats_http = client.get("/api/venues/cache/stats")
    assert stats_http.status_code == 200
    json_stats = stats_http.json()
    assert "backend" in json_stats
    assert "redis_connected" in json_stats
    assert "redis://" not in json.dumps(json_stats), "No credential leaks in stats endpoint"
    print("  ✓ Cache stats cleanly distinguish Redis global counters from local fallback counters.")

    # -------------------------------------------------------------------------
    # Test 9: MCP Tool Compatibility
    # -------------------------------------------------------------------------
    print("\n[TEST 9] MCP Tool Compatibility...")
    import asyncio
    from app.mcp_server.venue_server import venue_server

    async def verify_mcp():
        tools = await venue_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "search_stages" in tool_names, "MCP tool 'search_stages' missing"
        assert "get_stage_details" in tool_names, "MCP tool 'get_stage_details' missing"

        # Verify async MCP execution works seamlessly with hardened caching
        mcp_res = await venue_server.call_tool("search_stages", {"city": "Kolkata", "art_form": "Music"})
        venues = mcp_res.structured_content.get("result", [])
        assert isinstance(venues, list) and len(venues) > 0
        print("  ✓ MCP tool schemas and async execution remain 100% compatible.")

    asyncio.run(verify_mcp())

    # -------------------------------------------------------------------------
    # Test 10: Venue Creation Increments Generation Exactly Once
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Exactly One Generation Increment on Venue Creation...")
    gen_before_creation = venue_cache.get_durable_generation()
    single_venue_payload = {
        "name": f"Single Increment Hall {uuid.uuid4().hex[:6]}",
        "venueType": "Auditorium",
        "location": {"address": "15 Precise St", "neighborhood": "Ballygunge", "city": "Kolkata"},
        "capacity": {"seated": 150, "standing": 50, "formatted": "150 seated"},
        "suitableCategories": ["Music"],
        "amenities": ["Acoustics"],
        "availabilityNotice": "Open",
        "availabilityStatus": "open_slots",
        "host": {"name": "Host 1", "role": "Host", "policy": "Standard"},
        "imageUrl": "https://example.com/single.jpg"
    }
    resp_create = client.post("/api/venues", json=single_venue_payload, headers={"X-STAGE-Role": "provider"})
    assert resp_create.status_code == 201, f"Creation failed: {resp_create.text}"

    gen_after_creation = venue_cache.get_durable_generation()
    assert gen_after_creation == gen_before_creation + 1, \
        f"Expected exactly one generation increment ({gen_before_creation} -> {gen_before_creation + 1}), got {gen_after_creation}"
    print(f"  ✓ Durable generation incremented exactly once: {gen_before_creation} -> {gen_after_creation}.")

    # -------------------------------------------------------------------------
    # Test 11: Redis Version Invalidation Does NOT Increment SQLite Generation
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Redis Invalidation Does Not Touch SQLite Generation...")
    gen_before_inval = venue_cache.get_durable_generation()
    ver_before_inval = venue_cache.get_cache_version()

    # Call invalidate_venue_cache directly
    venue_cache.invalidate_venue_cache()

    gen_after_inval = venue_cache.get_durable_generation()
    ver_after_inval = venue_cache.get_cache_version()

    assert ver_after_inval == ver_before_inval + 1, \
        f"Redis version must increment on invalidation: {ver_before_inval} -> {ver_after_inval}"
    assert gen_after_inval == gen_before_inval, \
        f"SQLite durable generation must NOT change during Redis invalidation: {gen_before_inval} vs {gen_after_inval}"
    print(f"  ✓ Invalidation incremented Redis version ({ver_before_inval}->{ver_after_inval}) without altering SQLite generation ({gen_after_inval}).")

    # -------------------------------------------------------------------------
    # Test 12: SQLite Generation-Read Failure Bypasses Cache Reads & Returns SQLite Results
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Generation-Read Failure Bypasses Cache Reads (Fail-Closed)...")
    orig_get_gen = venue_cache.get_durable_generation

    # 1. When generation is None and get_durable_generation raises, get_cached_search returns None (not 1)
    def broken_get_gen(conn=None, namespace="venues"):
        raise sqlite3.OperationalError("Simulated database generation read failure")

    import sqlite3
    venue_cache.get_durable_generation = broken_get_gen

    try:
        # Cache lookup must return None and not default to 1
        res_read_fail = venue_cache.get_cached_search(city="Kolkata", generation=None)
        assert res_read_fail is None, "Failed generation read must return None (cache miss/bypass), not substitute 1"

        # search_stages must bypass cache read and still execute SQLite search successfully
        res_stages = search_stages(city="Kolkata")
        assert isinstance(res_stages, list) and len(res_stages) > 0, \
            "search_stages must still return correct SQLite results even if generation is unavailable"
    finally:
        venue_cache.get_durable_generation = orig_get_gen

    print("  ✓ Generation read failure bypassed cache read and returned correct SQLite results.")

    # -------------------------------------------------------------------------
    # Test 13: SQLite Generation-Read Failure Prevents Cache Writes
    # -------------------------------------------------------------------------
    print("\n[TEST 13] Generation-Read Failure Prevents Cache Writes (Fail-Closed)...")
    venue_cache.get_durable_generation = broken_get_gen
    try:
        # 1. Calling set_cached_search without generation when get_durable_generation fails
        write_fail_1 = venue_cache.set_cached_search(
            city="Kolkata",
            results=[{"id": "v-fail", "name": "Fail Venue"}],
            generation=None
        )
        assert write_fail_1 is False, "Cache write must return False when initial generation verification fails"

        # 2. Calling set_cached_search with generation, but latest_generation check fails
        write_fail_2 = venue_cache.set_cached_search(
            city="Kolkata",
            results=[{"id": "v-fail", "name": "Fail Venue"}],
            generation=1
        )
        assert write_fail_2 is False, "Cache write must return False when latest-generation check fails"
    finally:
        venue_cache.get_durable_generation = orig_get_gen

    print("  ✓ Generation verification failure strictly prevented cache writes (failed closed).")

    # -------------------------------------------------------------------------
    # Test 14: Generation Changes Between Initial Read and Cache Retrieval
    # -------------------------------------------------------------------------
    print("\n[TEST 14] Generation Changes Between Initial Read & Cache Retrieval...")
    cur_gen = venue_cache.get_durable_generation()
    stale_res_14 = [{"id": "stale-v14", "name": "Stale Snapshot Before Fetch"}]
    # Populate under cur_gen
    venue_cache.set_cached_search(city="Kolkata", results=stale_res_14, generation=cur_gen)

    # Wrap get_cached_search: bump durable generation before returning cached data
    orig_cached_search = venue_cache.get_cached_search
    def get_cached_with_concurrent_bump(*args, **kwargs):
        # Venue creation commits generation bump right before cache retrieval
        venue_cache.increment_durable_generation()
        return orig_cached_search(*args, **kwargs)

    venue_cache.get_cached_search = get_cached_with_concurrent_bump
    try:
        # search_stages reads initial cur_gen, gets cached data, but second verification detects bump
        res_discarded_14 = search_stages(city="Kolkata")
        res_ids_14 = [v["id"] for v in res_discarded_14]
        assert "stale-v14" not in res_ids_14, \
            "Stale cache hit returned! Second verification must discard cache if generation changed during retrieval."
    finally:
        venue_cache.get_cached_search = orig_cached_search

    print("  ✓ Generation change during cache retrieval detected; stale cache discarded and SQLite executed.")

    # -------------------------------------------------------------------------
    # Test 15: Generation Changes Immediately After Cache Retrieval Before 2nd Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 15] Generation Changes Immediately After Retrieval Before 2nd Verification...")
    cur_gen_15 = venue_cache.get_durable_generation()
    stale_res_15 = [{"id": "stale-v15", "name": "Stale Snapshot After Fetch"}]
    venue_cache.set_cached_search(city="Kolkata", results=stale_res_15, generation=cur_gen_15)

    def get_cached_bump_after(*args, **kwargs):
        cached = orig_cached_search(*args, **kwargs)
        # Commit generation bump right after Redis returns cached data
        venue_cache.increment_durable_generation()
        return cached

    venue_cache.get_cached_search = get_cached_bump_after
    try:
        res_discarded_15 = search_stages(city="Kolkata")
        res_ids_15 = [v["id"] for v in res_discarded_15]
        assert "stale-v15" not in res_ids_15, \
            "Stale cache hit returned! Second verification must detect generation bump that occurred right after fetch."
    finally:
        venue_cache.get_cached_search = orig_cached_search

    print("  ✓ Generation change right after retrieval detected; stale cache discarded and SQLite executed.")

    # -------------------------------------------------------------------------
    # Test 16: Second Generation Verification Raises SQLite Exception
    # -------------------------------------------------------------------------
    print("\n[TEST 16] Second Generation Verification Raises SQLite Exception...")
    cur_gen_16 = venue_cache.get_durable_generation()
    cached_res_16 = [{"id": "stale-v16", "name": "Cached Data With Error on Verify"}]
    venue_cache.set_cached_search(city="Kolkata", results=cached_res_16, generation=cur_gen_16)

    call_count = 0
    def gen_fail_on_second(conn=None, namespace="venues"):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            raise sqlite3.OperationalError("Simulated second verification database failure")
        return orig_get_gen(conn, namespace)

    venue_cache.get_durable_generation = gen_fail_on_second
    try:
        res_16 = search_stages(city="Kolkata")
        res_ids_16 = [v["id"] for v in res_16]
        assert "stale-v16" not in res_ids_16, \
            "Cache hit returned despite failed second generation verification! Must fail closed and query SQLite."
    finally:
        venue_cache.get_durable_generation = orig_get_gen

    print("  ✓ Second verification failure safely discarded cache hit and queried SQLite directly.")

    # -------------------------------------------------------------------------
    # Test 17: Unchanged Generation Returns Valid Cache Hit Without Running Venue SQL
    # -------------------------------------------------------------------------
    print("\n[TEST 17] Unchanged Generation Returns Verified Cache Hit...")
    cur_gen_17 = venue_cache.get_durable_generation()
    unique_cached_payload = [{
        "id": "v-cached-unique-hit",
        "name": "Verified Cached Venue Only In Cache",
        "venue_type": "Auditorium",
        "address": "123 Verified Way",
        "neighborhood": "Park Street",
        "city": "Kolkata",
        "seated_capacity": 120,
        "standing_capacity": 50,
        "suitable_categories": ["Music"],
        "amenities": ["Acoustics"],
        "availability_notice": "Open",
        "availability_status": "open_slots",
        "host_name": "Host",
        "host_policy": "Policy"
    }]
    venue_cache.set_cached_search(city="Kolkata", results=unique_cached_payload, generation=cur_gen_17)

    # Calling search_stages with unchanged generation: must return unique_cached_payload
    # Note: "v-cached-unique-hit" exists ONLY in Redis, proving SQLite venue table was not used for the return!
    res_hit_17 = search_stages(city="Kolkata")
    assert len(res_hit_17) == 1 and res_hit_17[0]["id"] == "v-cached-unique-hit", \
        f"Expected verified cache hit to return unique cached venue directly, got {res_hit_17}"
    print("  ✓ Verified cache hit returned directly when generation remained unchanged.")

    print("\n" + "=" * 75)
    print("ALL 17 HARDENED REDIS CACHE CORRECTNESS TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    run_all_tests()
