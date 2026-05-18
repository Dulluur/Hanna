from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import(
    AgeGroup,
    AmenityTag,
    Category,
    Cuisine,
    DietTag,
    EventType,
    PriceBand,
)
from app.schemas import ReferencesBundle

router = APIRouter(prefix="/api/references", tags=["references"])


@router.get("", response_model=ReferencesBundle)
async def get_references(
    session: AsyncSession = Depends(get_session),
) -> ReferencesBundle:
    categories = (await session.scalars(select(Category).order_by(Category.id))).all()
    cuisines = (await session.scalars(select(Cuisine).order_by(Cuisine.id))).all()
    diet_tags = (await session.scalars(select(DietTag).order_by(DietTag.id))).all()
    amenities = (await session.scalars(select(AmenityTag).order_by(AmenityTag.id))).all()
    event_types = (await session.scalars(select(EventType).order_by(EventType.id))).all()
    age_groups = (await session.scalars(select(AgeGroup).order_by(AgeGroup.min_age))).all()
    price_bands = (await session.scalars(select(PriceBand).order_by(PriceBand.min_price))).all()

    return ReferencesBundle(
        categories=list(categories),
        cuisines=list(cuisines),
        diet_tags=list(diet_tags),
        amenities=list(amenities),
        event_types=list(event_types),
        age_groups=list(age_groups),
        price_bands=list(price_bands),
    )
