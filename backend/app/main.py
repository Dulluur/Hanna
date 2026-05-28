from pathlib import Path

from fastapi import FastAPI
from pydantic_settings import BaseSettings
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.admin import setup_admin
from app.api import events as events_api
from app.api import metrics as metrics_api
from app.api import places as places_api
from app.api import references as references_api
from app.api.partner import dishes as partner_dishes_api
from app.api.partner import events as partner_events_api
from app.api.partner import place as partner_place_api
from app.api.partner import uploads as partner_uploads_api
from app.auth import routes as auth_routes
from app.config import settings

app = FastAPI(title="Hanna API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)

app.include_router(places_api.router)
app.include_router(metrics_api.router)
app.include_router(references_api.router)
app.include_router(events_api.router)

app.include_router(partner_place_api.router)
app.include_router(partner_dishes_api.router)
app.include_router(partner_events_api.router)
app.include_router(partner_uploads_api.router)


_UPLOADS_DIR = Path("./uploads").resolve()
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")


setup_admin(app)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}
