import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import require_super_admin

def bypass_admin():
    return {"id": "123", "role": "SUPER_ADMIN", "email": "test@siprahub.com"}

app.dependency_overrides[require_super_admin] = bypass_admin

client = TestClient(app)

# 1. Create a user
print("Testing Create User...")
create_response = client.post("/auth/create-user", json={
    "email": "test-login-fix@siprahub.com",
    "password": "Password123",
    "full_name": "Test User",
    "role": "MANAGER"
})
print("Create Status:", create_response.status_code)
print("Create Body:", create_response.json())

# 2. Try to log in as that user
print("\nTesting Login...")
login_response = client.post("/auth/login", json={
    "email": "test-login-fix@siprahub.com",
    "password": "Password123"
})
print("Login Status:", login_response.status_code)
print("Login Body:", login_response.json())
