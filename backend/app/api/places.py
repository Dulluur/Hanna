from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import(
    AmenityTag,
    Category,
    Cuisine,
    DietTag,
    Place,
    PriceBand,
    place_amenities,
    place_cuisines,
    place_diet_tags,
)
from app.schemas import PlaceDetail, PlaceListItem, PlaceListResponse
from app.services.upsell import(
    UPSELL_LIMIT,
    make_upsell_item,
    upsell_upper_bound,
)

router = APIRouter(prefix="/api/places", tags=["places"])


def _apply_basic_filters(
    stmt,
    *,
    category: str | None,
    cuisines: list[str],
    diet_tags: list[str],
    amenities: list[str],
    search: str | None,
):

    stmt = stmt.where(Place.is_active.is_(True))

    if category:
        stmt = stmt.join(Category, Place.category_id == Category.id).where(
            Category.code == category
        )

    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(Place.name.ilike(like))

    for code in cuisines:
        sub = (
            select(place_cuisines.c.place_id)
            .join(Cuisine, Cuisine.id == place_cuisines.c.cuisine_id)
            .where(Cuisine.code == code)
        )
        stmt = stmt.where(Place.id.in_(sub))

    for code in diet_tags:
        sub = (
            select(place_diet_tags.c.place_id)
            .join(DietTag, DietTag.id == place_diet_tags.c.diet_tag_id)
            .where(DietTag.code == code)
        )
        stmt = stmt.where(Place.id.in_(sub))

    for code in amenities:
        sub = (
            select(place_amenities.c.place_id)
            .join(AmenityTag, AmenityTag.id == place_amenities.c.amentity_id)
            .where(AmenityTag.code == code)
        )
        stmt = stmt.where(Place.id.in_(sub))

    return stmt


def _apply_price_filters(stmt, *, price_band: str | None, budget: int | None):
    if price_band or budget is not None:
        stmt = stmt.join(PriceBand, Place.price_band_id == PriceBand.id)
        if price_band:
            stmt = stmt.where(PriceBand.code == price_band)
        if budget is not None:
            stmt = stmt.where(PriceBand.max_price <= budget)
    return stmt


def _build_upsell_query(stmt, *, budget: int):
    upper = upsell_upper_bound(budget)
    return (
        stmt.join(PriceBand, Place.price_band_id == PriceBand.id)
        .where(PriceBand.min_price > budget, PriceBand.min_price <= upper)
        .order_by(Place.rating_2gis.desc().nullslast(), Place.id)
        .limit(UPSELL_LIMIT)
    )


@router.get("", response_model=PlaceListResponse)
async def list_places(
    session: Annotated[AsyncSession, Depends(get_session)],
    category: str | None = None,
    cuisines: Annotated[list[str], Query()] = [],
    diet_tags: Annotated[list[str], Query()] = [],
    amenities: Annotated[list[str], Query()] = [],
    price_band: str | None = None,
    budget: int | None = Query(default=None, ge=0),
    search: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> PlaceListResponse:
    basic = _apply_basic_filters(
        select(Place),
        category=category,
        cuisines=cuisines,
        diet_tags=diet_tags,
        amenities=amenities,
        search=search,
    )

    items_stmt = _apply_price_filters(basic, price_band=price_band, budget=budget)

    total_stmt = select(func.count()).select_from(items_stmt.order_by(None).subquery())
    total = (await session.execute(total_stmt)).scalar_one()

    # Сортировка по убыванию id: новые заведения (партнёрские регистрации)
    # появляются вверху списка, не теряются за дефолтным limit=20. Если в
    # будущем добавим UI-сортировку (по рейтингу / цене) — параметр заменит
    # этот дефолт.
    items_rows = (
        await session.scalars(items_stmt.order_by(Place.id.desc()).limit(limit).offset(offset))
    ).unique().all()

    upsell = []
    if budget is not None:
        upsell_stmt = _build_upsell_query(basic, budget=budget)
        upsell_rows = (await session.scalars(upsell_stmt)).unique().all()
        upsell = [make_upsell_item(p, budget) for p in upsell_rows]

    return PlaceListResponse(
        items=[PlaceListItem.model_validate(p) for p in items_rows],
        upsell=upsell,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{place_id}", response_model=PlaceDetail)
async def get_place(
    place_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceDetail:
    place = await session.get(Place, place_id)
    if place is None or not place.is_active:
        raise HTTPException(status_code=404, detail="Place not found")
    return PlaceDetail.model_validate(place)
