import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Search for .env in potential locations
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback
    load_dotenv(dotenv_path='backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print(f"Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found. Checked: {env_path}")
    exit(1)

supabase: Client = create_client(url, key)

async def verify_data():
    print("--- Verifying 'Shabharish Venkata' in jira_timesheet_raw ---")
    try:
        # First, let's see any row to get column names
        cols_res = supabase.table("jira_timesheet_raw").select("*").limit(1).execute()
        if cols_res.data:
            columns = cols_res.data[0].keys()
            print(f"Available columns in jira_timesheet_raw: {list(columns)}")
            
            # Try to find a column name that might be the user
            user_col = next((c for c in columns if 'user' in c or 'author' in c or 'worker' in c), None)
            if user_col:
                print(f"Using column '{user_col}' for user search.")
                res_jira = supabase.table("jira_timesheet_raw")\
                    .select("*")\
                    .ilike(user_col, "%Shabharish Venkata%")\
                    .eq("billing_month", "2026-03")\
                    .execute()
                
                if res_jira.data:
                    print(f"Found {len(res_jira.data)} records for Shabharish Venkata (Raw).")
                    total_hours = sum(float(row.get('time_spent_hours', 0)) for row in res_jira.data)
                    print(f"Total Hours: {total_hours}")
                else:
                    print("No records found for the search.")
            else:
                print("Could not identify user column automatically.")
        else:
            print("No data in jira_timesheet_raw table.")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Verifying 'Talend Developer' in job_profiles ---")
    try:
        res_profile = supabase.table("job_profiles")\
            .select("*")\
            .ilike("role_name", "%Talend%")\
            .execute()
        
        if res_profile.data:
            print(f"Found {len(res_profile.data)} 'Talend' related profiles.")
            for row in res_profile.data:
                print(f"ID: {row['id']}, Role: {row['role_name']}, Tech: {row.get('technology', 'N/A')}")
        else:
            print("No 'Talend' related profiles found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_data())


