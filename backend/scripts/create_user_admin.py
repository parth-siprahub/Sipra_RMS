import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def create_admin_user():
    email = "parth.patojoshi@siprahub.com"
    password = "Stinky123!"
    full_name = "Parth Patojoshi"
    role = "ADMIN"

    print(f"Attempting to create user: {email} with role: {role}")

    try:
        # 1. Create user in auth.users
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name}
        })
        
        user_id = auth_response.user.id
        print(f"User created in Auth with ID: {user_id}")

        # 2. Check if profile exists, if not create it
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role
        }
        
        # Upsert profile
        supabase.table("profiles").upsert(profile_data).execute()
        print(f"Profile created/updated for user {email} with role {role}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_admin_user()
