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

def parse_date(d):
    if pd.isna(d) or d == "": return None
    try:
        parsed = pd.to_datetime(d)
        if pd.isna(parsed): return None
        return parsed.date().isoformat()
    except:
        return None

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

async def main():
    print("Loading mappings...")
    async with httpx.AsyncClient() as client:
        sow_map = await get_mapping("sows", "sow_number")
        job_map = await get_mapping("job_profiles", "role_name")
        
        print("Fetching existing data...")
        emp_resp = await client.get(f"{SUPABASE_URL}/rest/v1/employees?select=id,rms_name", headers=HEADERS)
        existing_employees = {e["rms_name"].lower().strip(): e["id"] for e in emp_resp.json()}
        
        cand_resp = await client.get(f"{SUPABASE_URL}/rest/v1/candidates?select=id,first_name,last_name,email", headers=HEADERS)
        existing_candidates = {}
        for c in cand_resp.json():
            name = f"{c['first_name']} {c['last_name']}".strip().lower()
            existing_candidates[name] = c["id"]
            if c.get("email"):
                existing_candidates[c["email"].lower().strip()] = c["id"]

        rr_resp = await client.get(f"{SUPABASE_URL}/rest/v1/resource_requests?select=id,request_display_id", headers=HEADERS)
        existing_rrs = {r["request_display_id"].strip().lower(): r["id"] for r in rr_resp.json()}

    df = pd.read_excel(EXCEL_PATH)
    df = df.fillna("")
    
    # 1. Filter target records
    target_statuses = ["ONBOARDED", "EXIT", "WITH CLIENT"]
    df['Status_Clean'] = df['Status'].astype(str).str.upper().str.strip()
    target_df = df[df['Status_Clean'].isin(target_statuses)]
    target_df = target_df[~target_df['Status_Clean'].str.contains("REDUNDANT")]
    
    print(f"Excel Total Target Rows: {len(target_df)}")
    
    # Group by name to handle duplicates
    processed = 0
    errors = 0
    
    async with httpx.AsyncClient() as client:
        # Group by Name
        for name, group in target_df.groupby('Name'):
            name_l = name.strip().lower()
            
            # Decide the consolidated status: prioritize EXIT
            has_exit = any(group['Status_Clean'] == 'EXIT')
            final_status_excel = 'EXIT' if has_exit else group.iloc[0]['Status_Clean']
            
            # Use the most recent row (last row in group) for other data, 
            # but if there's an EXIT row, use that for dates.
            exit_row = group[group['Status_Clean'] == 'EXIT'].iloc[-1] if has_exit else None
            main_row = exit_row if has_exit else group.iloc[-1]
            
            role_name = str(main_row["Role"]).strip().lower()
            sow_number = str(main_row["SOW"]).strip().lower()
            email = str(main_row["Siprahub email"]).strip()
            email_l = email.lower()
            
            # Resolve IDs
            sow_id = sow_map.get(sow_number)
            if not sow_id and sow_number.startswith("#"):
                sow_id = sow_map.get(sow_number[1:])
            
            # Fallback for empty SOW
            if not sow_id and (not sow_number or sow_number == 'nan' or sow_number == ''):
                sow_id = sow_map.get("#000")
            
            job_id = job_map.get(role_name)
            
            if not sow_id or not job_id:
                print(f"Error: Could not resolve SOW '{sow_number}' or Role '{role_name}' for '{name}'")
                errors += 1
                continue

            try:
                # 5. UPSERT Resource Request (One per name's main role/sow)
                request_id_val = str(main_row['Request ID']) if main_row['Request ID'] else f"GRP-{processed}"
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
                    await client.patch(f"{SUPABASE_URL}/rest/v1/resource_requests?id=eq.{rr_id}", headers=HEADERS, json=rr_payload)
                else:
                    rr_resp = await client.post(f"{SUPABASE_URL}/rest/v1/resource_requests", headers=HEADERS, json=rr_payload)
                    rr_id = rr_resp.json()[0]["id"]
                    existing_rrs[display_id_l] = rr_id

                # 6. UPSERT Candidate
                cand_id = existing_candidates.get(email_l) if email_l else existing_candidates.get(name_l)
                parts = name.strip().rsplit(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""

                candidate_payload = {
                    "request_id": rr_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email if email else None,
                    "status": "ONBOARDED" if final_status_excel in ["ONBOARDED", "WITH CLIENT"] else "EXIT",
                    "source": str(main_row["Source"]) if main_row["Source"] else "Import",
                    "total_experience": parse_yoe(main_row["YOE"])
                }

                if cand_id:
                    await client.patch(f"{SUPABASE_URL}/rest/v1/candidates?id=eq.{cand_id}", headers=HEADERS, json=candidate_payload)
                else:
                    candidate_payload["phone"] = "0000000000"
                    cand_resp = await client.post(f"{SUPABASE_URL}/rest/v1/candidates", headers=HEADERS, json=candidate_payload)
                    cand_id = cand_resp.json()[0]["id"]
                    if email_l: existing_candidates[email_l] = cand_id
                    existing_candidates[name_l] = cand_id

                # 7. UPSERT Employee
                emp_id = existing_employees.get(name_l)
                emp_payload = {
                    "candidate_id": cand_id,
                    "rms_name": name.strip(),
                    "aws_email": email if email and "@siprahub.com" in email else None,
                    "status": "ACTIVE" if final_status_excel in ["ONBOARDED", "WITH CLIENT"] else "EXITED",
                    "start_date": parse_date(main_row["Start Date"]),
                    "exit_date": parse_date(main_row["End Date"]) if final_status_excel == "EXIT" else None
                }

                if emp_id:
                    await client.patch(f"{SUPABASE_URL}/rest/v1/employees?id=eq.{emp_id}", headers=HEADERS, json=emp_payload)
                else:
                    emp_resp = await client.post(f"{SUPABASE_URL}/rest/v1/employees", headers=HEADERS, json=emp_payload)
                    emp_id = emp_resp.json()[0]["id"]
                    existing_employees[name_l] = emp_id

                processed += 1
                if processed % 10 == 0:
                    print(f"Processed: {processed} unique users...")

            except Exception as e:
                print(f"Exception for {name}: {e}")
                errors += 1

    print("\n--- Summary ---")
    print(f"Total Unique Processed: {processed}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    asyncio.run(main())
