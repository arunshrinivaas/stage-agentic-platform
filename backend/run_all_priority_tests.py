#!/usr/bin/env python3
"""Run and collect results for all 10 priority verification tasks.

Outputs machine-readable exit codes, durations, and output summaries.
"""

import subprocess
import time
import sys
import os

STAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(STAGE_ROOT, "backend")
FRONTEND_DIR = os.path.join(STAGE_ROOT, "frontend")
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "bin", "python")

TESTS = [
    ("npm run build", FRONTEND_DIR, ["npm", "run", "build"]),
    ("verify_infrastructure_rehearsal.py", BACKEND_DIR, [VENV_PYTHON, "verify_infrastructure_rehearsal.py"]),
    ("verify_demo_roles_and_ai.py", BACKEND_DIR, [VENV_PYTHON, "verify_demo_roles_and_ai.py"]),
    ("test_product_transformation.py", BACKEND_DIR, [VENV_PYTHON, "test_product_transformation.py"]),
    ("test_security_audit.py", BACKEND_DIR, [VENV_PYTHON, "test_security_audit.py"]),
    ("test_auth_and_requests.py", BACKEND_DIR, [VENV_PYTHON, "test_auth_and_requests.py"]),
    ("test_mcp_integration.py", BACKEND_DIR, [VENV_PYTHON, "test_mcp_integration.py"]),
    ("test_redis_cache.py", BACKEND_DIR, [VENV_PYTHON, "test_redis_cache.py"]),
    ("test_kafka_integration.py", BACKEND_DIR, [VENV_PYTHON, "test_kafka_integration.py"]),
    ("test_final_e2e.py", BACKEND_DIR, [VENV_PYTHON, "test_final_e2e.py"]),
    ("test_device_intelligence.py", BACKEND_DIR, [VENV_PYTHON, "test_device_intelligence.py"]),
    ("test_settings_and_theme.py", BACKEND_DIR, [VENV_PYTHON, "test_settings_and_theme.py"]),
    ("test_ai_performance.py", BACKEND_DIR, [VENV_PYTHON, "test_ai_performance.py"]),
    ("test_digital_passes.py", BACKEND_DIR, [VENV_PYTHON, "test_digital_passes.py"]),
    ("test_financial_settlement.py", BACKEND_DIR, [VENV_PYTHON, "test_financial_settlement.py"]),
]

def main():
    print("=" * 80)
    print("STAGE PRIORITY PASS 1 — MASTER VERIFICATION RUNNER")
    print(f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    print("=" * 80)

    results = []

    for name, cwd, cmd in TESTS:
        print(f"\n>>> Running: {name} in {cwd}...")
        start_time = time.time()
        try:
            proc = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=300
            )
            elapsed = time.time() - start_time
            status = "PASSED" if proc.returncode == 0 else "FAILED"
            print(f"    Exit Code: {proc.returncode} | Status: {status} | Elapsed: {elapsed:.2f}s")
            
            # Print last few lines of stdout
            lines = [l for l in proc.stdout.strip().splitlines() if l.strip()]
            tail = "\n      ".join(lines[-4:]) if lines else "(no stdout)"
            print(f"    Tail Output:\n      {tail}")
            
            if proc.returncode != 0 and proc.stderr:
                err_lines = [l for l in proc.stderr.strip().splitlines() if l.strip()]
                err_tail = "\n      ".join(err_lines[-6:])
                print(f"    Stderr:\n      {err_tail}")

            results.append({
                "name": name,
                "exit_code": proc.returncode,
                "status": status,
                "elapsed": elapsed,
                "tail": lines[-1] if lines else ""
            })
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"    EXCEPTION: {e}")
            results.append({
                "name": name,
                "exit_code": -1,
                "status": "EXCEPTION",
                "elapsed": elapsed,
                "tail": str(e)
            })

    print("\n" + "=" * 80)
    print("FINAL SUMMARY MATRIX")
    print("=" * 80)
    all_passed = True
    for r in results:
        indicator = "✓" if r["status"] == "PASSED" else "✗"
        print(f"{indicator} {r['name']:<40} Exit: {r['exit_code']:<4} Status: {r['status']:<8} ({r['elapsed']:.2f}s)")
        if r["status"] != "PASSED":
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("ALL 15 VERIFICATION TASKS COMPLETED SUCCESSFULLY (100% PASS)")
        sys.exit(0)
    else:
        print("SOME VERIFICATION TASKS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()

