from fastapi import FastAPI
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    env: str = "development"

settings = Settings()
app = FastAPI(title="Hanna API", version="0.1.0")

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}
