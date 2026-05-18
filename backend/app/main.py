from pathlib import Path

from fastapi import FastAPI
from pydantic_settings import BaseSettings

from app.api import events as events_api
from app.api import metrics as metrics_api
from app.api import places as places_api
from app.api import references as references_api

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Hanna API", version="0.1.0")

app.include_router(places_api.router)
app.include_router(metrics_api.router)
app.include_router(references_api.router)
app.include_router(events_api.router)


class Settings(BaseSettings):
    env: str = "development"

settings = Settings()

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}
