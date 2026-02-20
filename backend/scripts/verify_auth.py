"""End-to-end auth flow verification script."""
import httpx
import json

base = "http://127.0.0.1:8000"

# Step 1: Login as Admin
print("=== STEP 1: Login as Admin ===")
r = httpx.post(f"{base}/auth/login", json={"email": "admin@siprahub.com", "password": "Admin123!"})
print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {json.dumps(data, indent=2)}")
token = data.get("access_token", "")

# Step 2: Call /auth/me
print()
print("=== STEP 2: GET /auth/me (with JWT) ===")
r2 = httpx.get(f"{base}/auth/me", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {r2.status_code}")
print(f"Response: {json.dumps(r2.json(), indent=2)}")

# Step 3: Call protected endpoint (dashboard)
print()
print("=== STEP 3: GET /dashboard/metrics (protected) ===")
r3 = httpx.get(f"{base}/dashboard/metrics", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {r3.status_code}")
print(f"Response: {json.dumps(r3.json(), indent=2)}")

# Step 4: Call protected endpoint WITHOUT token (should fail 401)
print()
print("=== STEP 4: GET /auth/me (NO token, expect 401) ===")
r4 = httpx.get(f"{base}/auth/me")
print(f"Status: {r4.status_code}")
print(f"Response: {json.dumps(r4.json(), indent=2)}")

# Step 5: Login as Recruiter
print()
print("=== STEP 5: Login as Recruiter ===")
r5 = httpx.post(f"{base}/auth/login", json={"email": "recruiter@siprahub.com", "password": "Recruiter123!"})
print(f"Status: {r5.status_code}")
r5_data = r5.json()
role = r5_data.get("role")
print(f"Role: {role}")
rec_token = r5_data.get("access_token", "")

# Step 6: Recruiter tries admin-only endpoint (should fail 403)
print()
print("=== STEP 6: POST /job-profiles/ as Recruiter (expect 403) ===")
r6 = httpx.post(f"{base}/job-profiles/", json={"title": "Test"}, headers={"Authorization": f"Bearer {rec_token}"})
print(f"Status: {r6.status_code}")
print(f"Response: {json.dumps(r6.json(), indent=2)}")
