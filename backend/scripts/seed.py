"""Seed script — populate realistic sample data for dashboard testing."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from supabase import create_client
from datetime import date, datetime

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
client = create_client(url, key)


def seed():
    print("=== Seeding RMS Sample Data ===\n")

    # 1. Ensure Users Exist (Admin & Recruiter)
    print("--- Users ---")
    
    def get_or_create_user(email, password, role_claim="ADMIN"):
        try:
            # Try listing first
            user_id = None
            users = client.auth.admin.list_users()
            for u in users:
                if u.email == email:
                    print(f"  [SKIP] User {email} already exists -> {u.id}")
                    user_id = u.id
                    break
            
            # If not found, create
            if not user_id:
                user = client.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": email.split("@")[0].capitalize(), "role": role_claim}
                })
                print(f"  [OK] Created user {email} -> {user.user.id}")
                user_id = user.user.id

            # Manually ensure profile exists (idempotent insert)
            try:
                # Check if profile exists first to avoid constant error logging on re-runs if unique constraint hits
                # But insert with on_conflict ignore is better if supbase-py supports it.
                # Standard insert might fail if exists.
                # Let's try select first.
                p_check = client.table("profiles").select("id").eq("id", user_id).execute()
                if not p_check.data:
                    client.table("profiles").insert({
                        "id": user_id,
                        "email": email,
                        "full_name": email.split("@")[0].capitalize(),
                        "role": role_claim
                    }).execute()
                    print(f"  [OK] Created profile for {email}")
                else:
                    print(f"  [SKIP] Profile for {email} already exists")
            except Exception as pe:
                print(f"  [WARN] Could not create profile: {pe}")

            return user_id
        except Exception as e:
            print(f"  [ERROR] Could not create user {email}: {e}")
            # Fallback: try to find if it was a race condition
            users = client.auth.admin.list_users()
            for u in users:
                if u.email == email:
                    return u.id
            raise e

    # Create users with @siprarms.com domain
    admin_id = get_or_create_user("admin@siprarms.com", "Admin123!", "ADMIN")
    recruiter_id = get_or_create_user("recruiter@siprarms.com", "Recruiter123!", "RECRUITER")
    
    # QA Admin accounts for HR team review
    qa_admin_1 = get_or_create_user("hr.qa1@siprarms.com", "SipraQA2026!", "ADMIN")
    qa_admin_2 = get_or_create_user("hr.qa2@siprarms.com", "SipraQA2026!", "ADMIN")
    
    # New Demo Admin accounts for HR & Managers
    hr_demo = get_or_create_user("hr.lead@sipra.demo", "SipraAdmin@2026", "ADMIN")
    manager_demo = get_or_create_user("hiring.manager@sipra.demo", "SipraAdmin@2026", "ADMIN")
    
    if not admin_id or not recruiter_id:
        print("CRITICAL: Could not get ID for admin or recruiter. Exiting.")
        return

    print(f"Primary Admin ID: {admin_id}")
    print(f"Primary Recruiter ID: {recruiter_id}")
    print(f"QA Admin 1: {qa_admin_1}")
    print(f"QA Admin 2: {qa_admin_2}\n")

    # 1. Seed Job Profiles
    print("--- Job Profiles ---")
    profiles_data = [
        {"role_name": "React Developer", "technology": "React, TypeScript", "experience_level": "Mid"},
        {"role_name": "Python Backend Engineer", "technology": "Python, FastAPI", "experience_level": "Senior"},
        {"role_name": "DevOps Engineer", "technology": "AWS, Docker, Kubernetes", "experience_level": "Senior"},
    ]
    for p in profiles_data:
        # Skip if exists
        existing = client.table("job_profiles").select("id").eq("role_name", p["role_name"]).execute()
        if existing.data:
            print(f"  [SKIP] {p['role_name']} already exists")
            continue
        r = client.table("job_profiles").insert(p).execute()
        print(f"  [OK] {p['role_name']} -> id={r.data[0]['id']}")

    # Get job profile IDs
    jp = client.table("job_profiles").select("id, role_name").execute()
    jp_map = {p["role_name"]: p["id"] for p in jp.data}

    # 2. Seed SOWs
    print("\n--- SOWs ---")
    sows_data = [
        {"sow_number": "SOW-2026-001", "client_name": "Acme Corp", "start_date": "2026-01-01", "target_date": "2026-12-31", "max_resources": 10},
        {"sow_number": "SOW-2026-002", "client_name": "TechStart Inc", "start_date": "2026-03-01", "target_date": "2026-09-30", "max_resources": 5},
    ]
    for s in sows_data:
        existing = client.table("sows").select("id").eq("sow_number", s["sow_number"]).execute()
        if existing.data:
            print(f"  [SKIP] {s['sow_number']} already exists")
            continue
        r = client.table("sows").insert(s).execute()
        print(f"  [OK] {s['sow_number']} -> id={r.data[0]['id']}")

    sow = client.table("sows").select("id, sow_number").execute()
    sow_map = {s["sow_number"]: s["id"] for s in sow.data}

    # 3. Seed Resource Requests
    print("\n--- Resource Requests ---")
    requests_data = [
        {"request_display_id": "REQ-20260115-001", "job_profile_id": jp_map.get("React Developer"), "sow_id": sow_map.get("SOW-2026-001"), "priority": "HIGH", "status": "OPEN", "source": "JOB_BOARDS", "created_by_id": admin_id},
        {"request_display_id": "REQ-20260120-002", "job_profile_id": jp_map.get("Python Backend Engineer"), "sow_id": sow_map.get("SOW-2026-001"), "priority": "URGENT", "status": "OPEN", "source": "PORTAL", "created_by_id": admin_id},
        {"request_display_id": "REQ-20260201-003", "job_profile_id": jp_map.get("DevOps Engineer"), "sow_id": sow_map.get("SOW-2026-002"), "priority": "MEDIUM", "status": "OPEN", "source": "NETWORK", "created_by_id": recruiter_id},
        {"request_display_id": "REQ-20260210-004", "job_profile_id": jp_map.get("React Developer"), "sow_id": sow_map.get("SOW-2026-002"), "priority": "LOW", "status": "HOLD", "source": "VENDORS", "created_by_id": recruiter_id},
        {"request_display_id": "REQ-20260215-005", "job_profile_id": jp_map.get("Python Backend Engineer"), "sow_id": sow_map.get("SOW-2026-001"), "priority": "HIGH", "status": "CLOSED", "source": "PORTAL", "created_by_id": admin_id},
    ]
    for req in requests_data:
        existing = client.table("resource_requests").select("id").eq("request_display_id", req["request_display_id"]).execute()
        if existing.data:
            print(f"  [SKIP] {req['request_display_id']} already exists")
            continue
        r = client.table("resource_requests").insert(req).execute()
        print(f"  [OK] {req['request_display_id']} -> id={r.data[0]['id']}")

    rr = client.table("resource_requests").select("id, request_display_id").execute()
    rr_map = {r["request_display_id"]: r["id"] for r in rr.data}

    # 4. Seed Candidates
    print("\n--- Candidates ---")
    candidates_data = [
        {"request_id": rr_map.get("REQ-20260115-001"), "first_name": "Aarav", "last_name": "Sharma", "email": "aarav@siprarms.com", "vendor": "INTERNAL", "skills": "React, TypeScript, Redux", "total_experience": 4.5, "relevant_experience": 3, "current_ctc": 12, "expected_ctc": 16, "current_location": "Bangalore", "work_location": "Bangalore", "notice_period": 30, "status": "WITH_CLIENT", "owner_id": recruiter_id},
        {"request_id": rr_map.get("REQ-20260115-001"), "first_name": "Priya", "last_name": "Patel", "email": "priya@siprarms.com", "vendor": "WRS", "skills": "React, Next.js", "total_experience": 3, "relevant_experience": 2, "current_ctc": 8, "expected_ctc": 12, "current_location": "Pune", "work_location": "Remote", "notice_period": 60, "status": "SUBMITTED_TO_ADMIN", "owner_id": recruiter_id},
        {"request_id": rr_map.get("REQ-20260120-002"), "first_name": "Rohan", "last_name": "Gupta", "email": "rohan@siprarms.com", "vendor": "GFM", "skills": "Python, FastAPI, PostgreSQL", "total_experience": 6, "relevant_experience": 4, "current_ctc": 18, "expected_ctc": 24, "current_location": "Hyderabad", "work_location": "Hybrid", "notice_period": 90, "status": "ONBOARDED", "onboarding_date": "2026-02-01", "owner_id": admin_id},
        {"request_id": rr_map.get("REQ-20260120-002"), "first_name": "Sneha", "last_name": "Rao", "email": "sneha@siprarms.com", "vendor": "INTERNAL", "skills": "Python, Django, AWS", "total_experience": 5, "relevant_experience": 3.5, "current_ctc": 15, "expected_ctc": 20, "current_location": "Mumbai", "work_location": "Bangalore", "notice_period": 30, "status": "REJECTED_BY_CLIENT", "owner_id": recruiter_id},
        {"request_id": rr_map.get("REQ-20260201-003"), "first_name": "Karthik", "last_name": "Nair", "email": "karthik@siprarms.com", "vendor": "INTERNAL", "skills": "AWS, Docker, Terraform, CI/CD", "total_experience": 8, "relevant_experience": 6, "current_ctc": 25, "expected_ctc": 32, "current_location": "Chennai", "work_location": "Remote", "notice_period": 60, "status": "INTERVIEW_SCHEDULED", "interview_date": "2026-03-01", "interview_time": "14:00", "owner_id": admin_id},
        {"request_id": rr_map.get("REQ-20260201-003"), "first_name": "Anjali", "last_name": "Verma", "email": "anjali@siprarms.com", "vendor": "WRS", "skills": "Kubernetes, Jenkins, AWS", "total_experience": 4, "relevant_experience": 2.5, "current_ctc": 10, "expected_ctc": 14, "current_location": "Delhi", "work_location": "Bangalore", "notice_period": 30, "status": "NEW", "owner_id": recruiter_id},
        {"request_id": rr_map.get("REQ-20260215-005"), "first_name": "Vikram", "last_name": "Singh", "email": "vikram@siprarms.com", "vendor": "INTERNAL", "skills": "Python, FastAPI, Docker", "total_experience": 7, "relevant_experience": 5, "current_ctc": 22, "expected_ctc": 28, "current_location": "Bangalore", "work_location": "Bangalore", "notice_period": 30, "status": "SELECTED", "owner_id": admin_id},
        {"request_id": rr_map.get("REQ-20260210-004"), "first_name": "Meera", "last_name": "Iyer", "email": "meera@siprarms.com", "vendor": "GFM", "skills": "React, Vue.js, CSS", "total_experience": 3, "relevant_experience": 2, "current_ctc": 9, "expected_ctc": 13, "current_location": "Pune", "work_location": "Remote", "notice_period": 15, "status": "ON_HOLD", "owner_id": recruiter_id},
    ]
    for c in candidates_data:
        existing = client.table("candidates").select("id").eq("email", c["email"]).execute()
        if existing.data:
            print(f"  [SKIP] {c['first_name']} {c['last_name']} already exists")
            continue
        r = client.table("candidates").insert(c).execute()
        print(f"  [OK] {c['first_name']} {c['last_name']} ({c['status']}) -> id={r.data[0]['id']}")

    # 5. Seed Communication Logs
    print("\n--- Communication Logs ---")
    cand = client.table("candidates").select("id, email").execute()
    cand_map = {c["email"]: c["id"] for c in cand.data}

    logs_data = [
        {"request_id": rr_map.get("REQ-20260115-001"), "candidate_id": cand_map.get("aarav@siprarms.com"), "logged_by_id": recruiter_id, "log_type": "EMAIL", "message": "Sent profile to Acme Corp HR team for review", "external_contact_name": "Ravi Kumar (Acme HR)"},
        {"request_id": rr_map.get("REQ-20260120-002"), "candidate_id": cand_map.get("rohan@siprarms.com"), "logged_by_id": admin_id, "log_type": "CALL", "message": "Confirmed onboarding date with candidate. Joining Feb 1st.", "external_contact_name": "Rohan Gupta"},
        {"request_id": rr_map.get("REQ-20260201-003"), "candidate_id": cand_map.get("karthik@siprarms.com"), "logged_by_id": admin_id, "log_type": "MEETING", "message": "Technical round scheduled for March 1st at 2 PM IST with TechStart team", "external_contact_name": "John D (TechStart CTO)"},
    ]
    for log in logs_data:
        # Just insert — logs don't have unique constraints
        r = client.table("communication_logs").insert(log).execute()
        print(f"  [OK] {log['log_type']}: {log['message'][:50]}...")

    print("\n=== Seed Complete ===")
    print(f"  Job Profiles: {len(profiles_data)}")
    print(f"  SOWs: {len(sows_data)}")
    print(f"  Resource Requests: {len(requests_data)}")
    print(f"  Candidates: {len(candidates_data)}")
    print(f"  Communication Logs: {len(logs_data)}")


if __name__ == "__main__":
    seed()
