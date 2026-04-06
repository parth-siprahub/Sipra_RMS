import os
import pandas as pd
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv(r"D:\RMS_Siprahub\backend\.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

EXCEL_PATH = r"D:\RMS_Siprahub\Master_excel.xlsx"

async def main():
    print("Fetching DB records...")
    async with httpx.AsyncClient() as client:
        # Fetch Employees
        emp_resp = await client.get(f"{SUPABASE_URL}/rest/v1/employees?select=rms_name,status", headers=HEADERS)
        db_employees = {e["rms_name"].strip().lower(): e["status"] for e in emp_resp.json()}
        
        # Fetch Candidates
        cand_resp = await client.get(f"{SUPABASE_URL}/rest/v1/candidates?select=first_name,last_name,status", headers=HEADERS)
        db_candidates = {}
        for c in cand_resp.json():
            name = f"{c['first_name']} {c['last_name']}".strip().lower()
            db_candidates[name] = c["status"]

    print(f"DB Employees: {len(db_employees)}")
    print(f"DB Candidates: {len(db_candidates)}")

    df = pd.read_excel(EXCEL_PATH)
    df = df.fillna("")
    
    missing_employees = []
    status_mismatch = []
    targets = ["ONBOARDED", "EXIT", "WITH CLIENT"]
    
    target_df = df[df["Status"].str.upper().str.strip().isin(targets)]
    print(f"Excel Target Rows: {len(target_df)}")

    # Group Excel by name to match migration logic
    excel_consolidated = {}
    for _, row in target_df.iterrows():
        name = str(row["Name"]).strip()
        name_l = name.lower()
        excel_status = row["Status"].upper().strip()
        
        if name_l not in excel_consolidated:
            excel_consolidated[name_l] = {"name": name, "statuses": set()}
        excel_consolidated[name_l]["statuses"].add(excel_status)

    for name_l, data in excel_consolidated.items():
        name = data["name"]
        statuses = data["statuses"]
        
        # Priority: EXIT > ONBOARDED
        final_excel_status = "EXIT" if "EXIT" in statuses else next(iter(statuses))
        
        # Check Employee
        if name_l not in db_employees:
            missing_employees.append(name)
        else:
            db_status = db_employees[name_l]
            expected_db_status = "ACTIVE" if final_excel_status in ["ONBOARDED", "WITH CLIENT"] else "EXITED"
            if db_status != expected_db_status:
                status_mismatch.append((name, final_excel_status, db_status))

    print("\n--- Integrity Report ---")
    print(f"Missing Employees: {len(missing_employees)}")
    if missing_employees:
        print(f"Sample Missing: {missing_employees[:10]}")
    
    print(f"Status Mismatches: {len(status_mismatch)}")
    if status_mismatch:
        print(f"Sample Mismatch (Name, Excel, DB): {status_mismatch[:5]}")

    # Candidate check for ONBOARDED
    onboarded_excel = target_df[target_df["Status"].str.upper().isin(["ONBOARDED", "WITH CLIENT"])]
    missing_onboarded_cand = []
    for _, row in onboarded_excel.iterrows():
        name = str(row["Name"]).strip().lower()
        if name not in db_candidates:
            missing_onboarded_cand.append(name)
        elif db_candidates[name] != "ONBOARDED":
            # If candidate status is wrong
            pass

    print(f"Missing Onboarded Candidates: {len(missing_onboarded_cand)}")
    if missing_onboarded_cand:
        print(f"Sample Missing Cands: {missing_onboarded_cand[:10]}")

if __name__ == "__main__":
    asyncio.run(main())
