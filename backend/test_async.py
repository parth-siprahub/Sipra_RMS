import asyncio
from supabase import acreate_client, ClientOptions
from app.config import settings

async def main():
    opts = ClientOptions(postgrest_client_timeout=10)
    c = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, options=opts)
    resp = await c.table('sows').select('id').execute()
    print(resp.data)

if __name__ == "__main__":
    asyncio.run(main())
