import os
import pandas as pd
import httpx
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(r"D:\RMS_Siprahub\backend\.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

EXCEL_PATH = r"D:\RMS_Siprahub\Master_excel.xlsx"

async def get_mapping(table, col_name):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id,{col_name}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=HEADERS)
        data = r.json()
        if not isinstance(data, list):
            print(f"Error fetching mapping for {table}: {data}")
            return {}
        return {str(item[col_name]).strip().lower(): item["id"] for item in data if item[col_name]}

async def main():
    print("Loading mappings...")
    async with httpx.AsyncClient() as client:
        sow_map = await get_mapping("sows", "sow_number")
        job_map = await get_mapping("job_profiles", "role_name")
        
        # Get existing data for idempotency
        print("Fetching existing data...")
        emp_resp = await client.get(f"{SUPABASE_URL}/rest/v1/employees?select=id,rms_name", headers=HEADERS)
        existing_employees = {e["rms_name"].lower().strip(): e["id"] for e in emp_resp.json()}
        
        cand_resp = await client.get(f"{SUPABASE_URL}/rest/v1/candidates?select=id,first_name,last_name,email,request_id", headers=HEADERS)
        existing_candidates = {}
        for c in cand_resp.json():
            name = f"{c['first_name']} {c['last_name']}".strip().lower()
            existing_candidates[name] = c["id"]
            if c.get("email"):
                existing_candidates[c["email"].lower().strip()] = c["id"]

        rr_resp = await client.get(f"{SUPABASE_URL}/rest/v1/resource_requests?select=id,request_display_id", headers=HEADERS)
        existing_rrs = {r["request_display_id"].strip().lower(): r["id"] for r in rr_resp.json()}

        print(f"Existing Employees: {len(existing_employees)}")
        print(f"Existing Candidates: {len(existing_candidates)}")
        print(f"Existing Resource Requests: {len(existing_rrs)}")
        
        print(f"SOWs: {len(sow_map)}")
        print(f"Jobs: {len(job_map)}")

    df = pd.read_excel(EXCEL_PATH)
    print(f"Excel Rows: {len(df)}")

    # Basic cleanup: remove extra whitespace and handle NaNs
    df = df.fillna("")
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].astype(str).str.strip()

    # Filtering according to rules
    processed = 0
    skipped_status = 0
    skipped_redundant = 0
    errors = 0

    async with httpx.AsyncClient() as client:
        for idx, row in df.iterrows():
            # 1. Status Filter (Include "WITH CLIENT")
            status = row["Status"].upper().strip()
            
            # Explicitly skip redundant statuses
            if "REDUNDANT" in status:
                skipped_redundant += 1
                continue

            if status not in ["ONBOARDED", "EXIT", "WITH CLIENT"]:
                skipped_status += 1
                continue
            
            # 2. Extract Data
            name = row["Name"].strip()
            name_l = name.lower()
            
            # 3. Data Extraction
            role_name = str(row["Role"]).strip().lower() if pd.notna(row["Role"]) else ""
            sow_number = str(row["SOW"]).strip().lower() if pd.notna(row["SOW"]) else ""
            email = str(row["Siprahub email"]).strip() if pd.notna(row["Siprahub email"]) else ""
            email_l = email.lower()
            
            # 4. Resolve IDs
            sow_id = sow_map.get(sow_number)
            if not sow_id and sow_number.startswith("#"):
                sow_id = sow_map.get(sow_number[1:])
            
            job_id = job_map.get(role_name)
            
            if not sow_id or not job_id:
                print(f"Error: Could not resolve SOW '{sow_number}' or Role '{role_name}' for '{name}'")
                errors += 1
                continue

            try:
                # 5. UPSERT Resource Request
                request_id_val = str(row['Request ID']) if pd.notna(row['Request ID']) else f"AUTO-{idx}"
                display_id = f"IMP-{request_id_val}"
                display_id_l = display_id.lower()
                
                rr_payload = {
                    "request_display_id": display_id,
                    "sow_id": sow_id,
                    "job_profile_id": job_id,
                    "status": "CLOSED",
                    "priority": "MEDIUM"
                }

                if display_id_l in existing_rrs:
                    rr_id = existing_rrs[display_id_l]
                    # Update existing RR
                    await client.patch(f"{SUPABASE_URL}/rest/v1/resource_requests?id=eq.{rr_id}", headers=HEADERS, json=rr_payload)
                else:
                    rr_resp = await client.post(f"{SUPABASE_URL}/rest/v1/resource_requests", headers=HEADERS, json=rr_payload)
                    if rr_resp.status_code not in [200, 201]:
                        print(f"Failed to create RR for {name}: {rr_resp.status_code} - {rr_resp.text}")
                        errors += 1
                        continue
                    rr_id = rr_resp.json()[0]["id"]
                    existing_rrs[display_id_l] = rr_id

                # 6. UPSERT Candidate
                cand_id = existing_candidates.get(email_l) if email_l else existing_candidates.get(name_l)
                
                parts = name.rsplit(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""

                def parse_yoe(y):
                    if pd.isna(y) or y == "": return 0
                    y_str = str(y).strip().lower()
                    try:
                        if "+" in y_str:
                            return sum(float(p) for p in y_str.split("+") if p.strip() and p.strip().replace('.','',1).isdigit())
                        if "/" in y_str:
                            return float(y_str.split("/")[0])
                        return float(y_str)
                    except:
                        return 0

                candidate_payload = {
                    "request_id": rr_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email if email else None,
                    "status": "ONBOARDED" if status in ["ONBOARDED", "WITH CLIENT"] else "EXIT",
                    "source": str(row["Source"]) if pd.notna(row["Source"]) else "Import",
                    "total_experience": parse_yoe(row["YOE"])
                }

                if cand_id:
                    await client.patch(f"{SUPABASE_URL}/rest/v1/candidates?id=eq.{cand_id}", headers=HEADERS, json=candidate_payload)
                else:
                    candidate_payload["phone"] = "0000000000"
                    cand_resp = await client.post(f"{SUPABASE_URL}/rest/v1/candidates", headers=HEADERS, json=candidate_payload)
                    if cand_resp.status_code not in [200, 201]:
                        print(f"Failed to create Candidate for {name}: {cand_resp.status_code} - {cand_resp.text}")
                        errors += 1
                        continue
                    cand_id = cand_resp.json()[0]["id"]
                    if email_l: existing_candidates[email_l] = cand_id
                    existing_candidates[name_l] = cand_id

                # 7. UPSERT Employee
                emp_id = existing_employees.get(name_l)
                
                def parse_date(d):
                    if pd.isna(d) or d == "": return None
                    try:
                        parsed = pd.to_datetime(d)
                        if pd.isna(parsed): return None
                        return parsed.date().isoformat()
                    except:
                        return None

                emp_payload = {
                    "candidate_id": cand_id,
                    "rms_name": name,
                    "aws_email": email if email and "@siprahub.com" in email else None,
                    "status": "ACTIVE" if status in ["ONBOARDED", "WITH CLIENT"] else "EXITED",
                    "start_date": parse_date(row["Start Date"]),
                    "exit_date": parse_date(row["End Date"]) if status == "EXIT" else None
                }

                if emp_id:
                    await client.patch(f"{SUPABASE_URL}/rest/v1/employees?id=eq.{emp_id}", headers=HEADERS, json=emp_payload)
                else:
                    emp_resp = await client.post(f"{SUPABASE_URL}/rest/v1/employees", headers=HEADERS, json=emp_payload)
                    if emp_resp.status_code not in [200, 201]:
                        print(f"Failed to create Employee for {name}: {emp_resp.status_code} - {emp_resp.text}")
                        errors += 1
                        continue
                    emp_id = emp_resp.json()[0]["id"]
                    existing_employees[name_l] = emp_id

                processed += 1
                if processed % 10 == 0:
                    print(f"Processed: {processed}...")

            except Exception as e:
                import traceback
                print(f"Exception for row {idx} ({name}): {e}")
                # traceback.print_exc()
                errors += 1

    print("\n--- Summary ---")
    print(f"Total Processed: {processed}")
    print(f"Skipped (Status): {skipped_status}")
    print(f"Skipped (Redundant): {skipped_redundant}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    asyncio.run(main())
