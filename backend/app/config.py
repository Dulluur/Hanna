from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    database_url: str = "postgresql+asyncpg://hanna:hanna@localhost:5432/hanna"
    env: str = "development"

    admin_email: str = "admin@hanna.example"
    admin_password: str = "admin"

    session_cookie_name: str = "session_id"
    session_cookie_secure: bool = False
    session_ttl_days: int = 7
    secret_key: str = "dev-secret-change-me"

    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, value):
        if isinstance(value, str) and not value.startswith("["):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


settings = Settings()
