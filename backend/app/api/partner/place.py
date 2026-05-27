from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from app.auth.deps import require_partner
from app.database import get_session
from app.models import AmenityTag, Cuisine, DietTag, Place, User
from app.schemas import PlaceDetail, PlaceUpdate

"""
place.py - управление своим заведением.
Два эндпоинта: GET /me (посмотреть) и PUT /me (обновить). Партнёр привязан к одному заведению через user.place_id, поэтому id в URL не нужен. Редактирует описание, часы работы, фото, телефон, сайт, и связи многие-ко-многим: кухни / диет-теги / удобства (передаются кодами вроде vegan, бэк превращает в записи через _load_refs_by_code).
"""

router = APIRouter(prefix="/api/partner/place", tags=["parthner:place"])

async def _load_my_place(db: AsyncSession, user: User) -> Place:
    place = await db.get(Place, user.place_id)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
        detail="Место не найдено")
    return place


@router.get("/me", response_model=PlaceDetail)
async def get_my_place(
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceDetail:
    place = await _load_my_place(db, user)
    return PlaceDetail.model_validate(place)


@router.put("/me", response_model=PlaceDetail)
async def update_my_place(
    body: PlaceUpdate,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceDetail:
    place = await _load_my_place(db, user)

    scalar_fields = {"description", "work_hours", "photo_url", "phone", "website", "upsell_highlights"}
    payload = body.model_dump(exclude_unset=True)
    for field in scalar_fields & payload.keys():
        setattr(place, field, payload[field])

    if "cuisines" in payload:
        place.cuisines = await _load_refs_by_code(db, Cuisine, payload["cuisines"] or [])
    if "diet_tags" in payload:
        place.diet_tags = await _load_refs_by_code(db, DietTag, payload["diet_tags"] or [])
    if "amenities" in payload:
        place.amenities = await _load_refs_by_code(db, AmenityTag, payload["amenities"] or [])

    await db.commit()
    await db.refresh(place)
    return PlaceDetail.model_validate(place)


async def _load_refs_by_code(db: AsyncSession, model, codes: list[str]):
    if not codes:
        return []
    rows = (await db.scalars(select(model).where(model.code.in_(codes)))).all()
    return list(rows)
