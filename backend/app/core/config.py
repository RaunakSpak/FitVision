from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase: Project Settings → Database → Connection string → URI (Direct connection)
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/fitvision"
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    FRONTEND_URL: str = "http://localhost:3000"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_NAME: str = "fitvision_access_token"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        url = value.strip()
        if url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        is_supabase = "supabase.co" in url or "pooler.supabase.com" in url
        if is_supabase and "sslmode=" not in url:
            url += "&sslmode=require" if "?" in url else "?sslmode=require"
        return url


settings = Settings()


def get_cors_origins() -> list[str]:
    """FRONTEND_URL supports comma-separated origins for staging + production."""
    return [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]