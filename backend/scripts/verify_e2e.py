"""Comprehensive E2E verification — tests every endpoint against real seeded data."""
import httpx
import json
import sys

base = "http://127.0.0.1:8000/api"
results = []
passed = 0
failed = 0


def test(name, response, expected_status, check_fn=None):
    global passed, failed
    ok = response.status_code == expected_status
    extra = ""
    if ok and check_fn:
        try:
            ok = check_fn(response)
            if not ok:
                extra = " [check_fn failed]"
        except Exception as e:
            ok = False
            extra = f" [check_fn error: {e}]"
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"  [{status}] {name} -> {response.status_code}{extra}")
    return ok


# ===== AUTH =====
print("=== AUTH ===")
r = httpx.post(f"{base}/auth/login", json={"email": "admin@siprahub.com", "password": "Admin123!"})
test("Login Admin", r, 200, lambda r: "access_token" in r.json())
admin_token = r.json().get("access_token", "")
admin_headers = {"Authorization": f"Bearer {admin_token}"}

r = httpx.post(f"{base}/auth/login", json={"email": "recruiter@siprahub.com", "password": "Recruiter123!"})
test("Login Recruiter", r, 200, lambda r: r.json().get("role") == "RECRUITER")
rec_token = r.json().get("access_token", "")
rec_headers = {"Authorization": f"Bearer {rec_token}"}

r = httpx.get(f"{base}/auth/me", headers=admin_headers)
test("GET /auth/me (Admin)", r, 200, lambda r: r.json().get("role") == "ADMIN")

r = httpx.get(f"{base}/auth/me")
test("GET /auth/me (no token -> 401)", r, 401)

# ===== HEALTH =====
print("\n=== HEALTH ===")
r = httpx.get(f"{base}/health")
test("GET /health", r, 200, lambda r: r.json().get("status") == "ok")

# ===== JOB PROFILES =====
print("\n=== JOB PROFILES ===")
r = httpx.get(f"{base}/job-profiles/", headers=admin_headers)
test("GET /job-profiles/ (list)", r, 200, lambda r: len(r.json()) >= 3)

r = httpx.get(f"{base}/job-profiles/1", headers=admin_headers)
test("GET /job-profiles/1", r, 200, lambda r: "role_name" in r.json())

r = httpx.post(f"{base}/job-profiles/", json={"role_name": "Test QA", "technology": "Selenium"}, headers=admin_headers)
test("POST /job-profiles/ (Admin)", r, 201, lambda r: r.json().get("role_name") == "Test QA")
test_profile_id = r.json().get("id") if r.status_code == 201 else None

r = httpx.post(f"{base}/job-profiles/", json={"role_name": "Should Fail", "technology": "X"}, headers=rec_headers)
test("POST /job-profiles/ (Recruiter -> 403)", r, 403)

if test_profile_id:
    r = httpx.put(f"{base}/job-profiles/{test_profile_id}", json={"experience_level": "Junior"}, headers=admin_headers)
    test("PUT /job-profiles/ (update)", r, 200, lambda r: r.json().get("experience_level") == "Junior")

    r = httpx.delete(f"{base}/job-profiles/{test_profile_id}", headers=admin_headers)
    test("DELETE /job-profiles/ (cleanup)", r, 204)

# ===== RESOURCE REQUESTS =====
print("\n=== RESOURCE REQUESTS ===")
r = httpx.get(f"{base}/requests/", headers=admin_headers)
test("GET /requests/ (list)", r, 200, lambda r: len(r.json()) >= 5)

r = httpx.get(f"{base}/requests/?status=OPEN", headers=admin_headers)
test("GET /requests/?status=OPEN (filter)", r, 200, lambda r: all(x.get("status") == "OPEN" for x in r.json()))

r = httpx.get(f"{base}/requests/1", headers=admin_headers)
test("GET /requests/1", r, 200, lambda r: "request_display_id" in r.json())

r = httpx.post(f"{base}/requests/", json={"priority": "LOW", "source": "EMAIL"}, headers=admin_headers)
test("POST /requests/ (create)", r, 201, lambda r: r.json().get("request_display_id", "").startswith("REQ-"))
test_req_id = r.json().get("id") if r.status_code == 201 else None

if test_req_id:
    r = httpx.patch(f"{base}/requests/{test_req_id}/status", json={"status": "HOLD"}, headers=admin_headers)
    test("PATCH /requests/status (OPEN->HOLD)", r, 200, lambda r: r.json().get("status") == "HOLD")

# ===== CANDIDATES =====
print("\n=== CANDIDATES ===")
r = httpx.get(f"{base}/candidates/", headers=admin_headers)
test("GET /candidates/ (list)", r, 200, lambda r: len(r.json()) >= 8)

r = httpx.get(f"{base}/candidates/?status=ONBOARDED", headers=admin_headers)
test("GET /candidates/?status=ONBOARDED", r, 200, lambda r: all(x.get("status") == "ONBOARDED" for x in r.json()))

r = httpx.get(f"{base}/candidates/1", headers=admin_headers)
test("GET /candidates/1", r, 200, lambda r: "first_name" in r.json())

r = httpx.post(f"{base}/candidates/", json={
    "first_name": "Test", "last_name": "User", "email": "test@test.com",
    "vendor": "INTERNAL", "skills": "Testing"
}, headers=rec_headers)
test("POST /candidates/ (create)", r, 201, lambda r: r.json().get("status") == "NEW")

r = httpx.patch(f"{base}/candidates/2/review", json={"status": "WITH_ADMIN", "remarks": "Good profile"}, headers=admin_headers)
test("PATCH /candidates/2/review (Admin review)", r, 200, lambda r: r.json().get("status") == "WITH_ADMIN")

# ===== SOWS =====
print("\n=== SOWs ===")
r = httpx.get(f"{base}/sows/", headers=admin_headers)
test("GET /sows/ (list)", r, 200, lambda r: len(r.json()) >= 2)

r = httpx.get(f"{base}/sows/1", headers=admin_headers)
test("GET /sows/1", r, 200, lambda r: "sow_number" in r.json())

r = httpx.post(f"{base}/sows/", json={
    "sow_number": "SOW-TEST-001", "client_name": "Test Corp", "max_resources": 3
}, headers=admin_headers)
test("POST /sows/ (create)", r, 201, lambda r: r.json().get("sow_number") == "SOW-TEST-001")

r = httpx.post(f"{base}/sows/", json={"sow_number": "SOW-TEST-001", "client_name": "Dup"}, headers=admin_headers)
test("POST /sows/ (duplicate -> 409)", r, 409)

# ===== COMMUNICATION LOGS =====
print("\n=== COMMUNICATION LOGS ===")
r = httpx.get(f"{base}/logs/", headers=admin_headers)
test("GET /logs/ (list)", r, 200, lambda r: len(r.json()) >= 3)

r = httpx.post(f"{base}/logs/", json={
    "request_id": 1, "log_type": "NOTE", "message": "E2E test log entry"
}, headers=admin_headers)
test("POST /logs/ (create)", r, 201, lambda r: r.json().get("log_type") == "NOTE")

# ===== DASHBOARD =====
print("\n=== DASHBOARD ===")
r = httpx.get(f"{base}/dashboard/metrics", headers=admin_headers)
test("GET /dashboard/metrics", r, 200, lambda r: r.json().get("total_requests", 0) >= 5)

data = r.json() if r.status_code == 200 else {}
print(f"    -> total_requests: {data.get('total_requests', '?')}")
print(f"    -> total_candidates: {data.get('total_candidates', '?')}")
print(f"    -> requests_by_status: {data.get('requests_by_status', '?')}")
print(f"    -> candidates_by_status: {data.get('candidates_by_status', '?')}")

# ===== SUMMARY =====
print(f"\n{'='*50}")
print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
print(f"{'='*50}")

if failed > 0:
    sys.exit(1)
