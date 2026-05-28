from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    database_url: str = "postgresql+asyncpg://hanna:hanna@localhost:5432/hanna"
    env: str = "development"

    admin_email: str = "admin@hanna.local"
    admin_password: str = "admin"

    session_cookie_name: str = "session_id"
    session_cookie_secure: bool = False
    session_ttl_days: int = 7
    secret_key: str = "dev-secret-change-me"

    cors_origins: list[str] = [
        "http://localhost:5173",  # Vite dev
        "http://localhost:4173",  # Vite preview (production-сборка локально)
        "http://localhost:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, value):
        if isinstance(value, str) and not value.startswith("["):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


settings = Settings()
