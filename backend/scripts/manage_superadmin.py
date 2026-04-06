import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def manage_superadmin():
    email = "admin@siprarms.com"
    password = "SuperSipra2024!"
    full_name = "Super Administrator"
    role = "SUPER_ADMIN"

    print(f"Syncing SuperAdmin account: {email}")

    try:
        # 1. Fetch user to get ID
        users_resp = supabase.auth.admin.list_users()
        user = next((u for u in users_resp if u.email == email), None)

        if user:
            print(f"User {email} exists. ID: {user.id}. Resetting password.")
            supabase.auth.admin.update_user_by_id(
                user.id,
                {"password": password}
            )
            user_id = user.id
        else:
            print(f"User {email} does not exist. Creating new.")
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name}
            })
            user_id = auth_response.user.id

        # 2. Upsert profile with proper role
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role
        }
        
        supabase.table("profiles").upsert(profile_data).execute()
        print(f"SUCCESS: SuperAdmin credentials synced.")
        print(f"ID: {email}")
        print(f"Password: {password}")

    except Exception as e:
        print(f"Error during superadmin management: {e}")

if __name__ == "__main__":
    manage_superadmin()
