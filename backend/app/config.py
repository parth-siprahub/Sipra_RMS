from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    # Not used for login (Supabase issues JWTs); kept for future custom auth / docs parity with .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Environment — set to "production" in hosting platform env vars
    ENVIRONMENT: str = "development"

    # CORS — add FRONTEND_URL in hosting platform to allow your deployed frontend
    FRONTEND_URL: Optional[str] = None

    @property
    def CORS_ORIGINS(self) -> list[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"

settings = Settings()
