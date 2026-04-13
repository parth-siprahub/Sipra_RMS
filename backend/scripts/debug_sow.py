"""Quick SOW create debug."""
import httpx
base = "http://127.0.0.1:8000/api"
r = httpx.post(f"{base}/auth/login", json={"email": "admin@siprahub.com", "password": "Admin123!"})
t = r.json()["access_token"]
h = {"Authorization": f"Bearer {t}"}
r2 = httpx.post(f"{base}/sows/", json={"sow_number": "SOW-DEBUG-001", "client_name": "Debug Corp", "max_resources": 3}, headers=h)
print(f"Status: {r2.status_code}")
print(f"Body: {r2.text}")
