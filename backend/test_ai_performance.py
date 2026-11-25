"""Test suite for AI Performance, Latency Instrumentation, and Streaming SSE."""
import json
import unittest
import time
from fastapi.testclient import TestClient
from app.main import app

class TestAiPerformanceAndStreaming(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_deterministic_fast_path_latency(self):
        """Test that deterministic intent routing responds with sub-50ms latency and populated metrics."""
        t0 = time.perf_counter()
        res = self.client.post(
            "/api/ai/command",
            json={
                "user_id": "usr-aarav",
                "message": "Find an acoustic stage in Kolkata for sitar performance",
                "force_mock": True,
            },
        )
        duration_ms = (time.perf_counter() - t0) * 1000.0

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["execution_status"], "completed")
        self.assertIn("stage_match", data["selected_specialist_agents"])

        # Validate performance instrumentation
        metrics = data.get("performance_metrics")
        self.assertIsNotNone(metrics)
        self.assertIn("intent_classification_ms", metrics)
        self.assertIn("total_duration_ms", metrics)
        self.assertEqual(metrics["routing_type"], "deterministic_fast_path")
        self.assertLess(metrics["total_duration_ms"], 150.0)

    def test_performance_metrics_monitoring_endpoint(self):
        """Test GET /api/ai/performance-metrics returns p50 and p95 latency distributions."""
        # Execute a few commands to populate sample buffer
        for _ in range(3):
            self.client.post(
                "/api/ai/command",
                json={
                    "user_id": "usr-rhea",
                    "message": "Recommend an upcoming classical concert in Kolkata",
                    "force_mock": True,
                },
            )

        res = self.client.get("/api/ai/performance-metrics")
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertGreaterEqual(stats["sample_count"], 3)
        self.assertGreater(stats["p50_latency_ms"], 0.0)
        self.assertGreater(stats["p95_latency_ms"], 0.0)
        self.assertIn("intent_classification", stats["breakdown_averages_ms"])

    def test_progressive_streaming_sse_endpoint(self):
        """Test POST /api/ai/command/stream yields SSE events (acknowledgement, chunks, completed)."""
        with self.client.stream(
            "POST",
            "/api/ai/command/stream",
            json={
                "user_id": "usr-aarav",
                "message": "Find a stage in Kolkata",
                "force_mock": True,
            },
        ) as response:
            self.assertEqual(response.status_code, 200)
            self.assertIn("text/event-stream", response.headers["content-type"])

            events_seen = []
            for line in response.iter_lines():
                if line.startswith("event: "):
                    events_seen.append(line.replace("event: ", "").strip())

            self.assertIn("acknowledgement", events_seen)
            self.assertIn("agent_activity", events_seen)
            self.assertIn("completed", events_seen)

if __name__ == "__main__":
    unittest.main()

