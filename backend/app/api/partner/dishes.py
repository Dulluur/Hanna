from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_partner
from app.database import get_session
from app.models import PlaceTopDish, User
from app.schemas import PlaceTopDishCreate, PlaceTopDishRead, PlaceTopDishUpdate

router = APIRouter(prefix="/api/partner/dishes", tags=["partner:dishes"])


async def _load_my_dish(db: AsyncSession, user: User, dish_id: int) -> PlaceTopDish:
    dish = await db.get(PlaceTopDish, dish_id)
    if dish is None or dish.place_id != user.place_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Блюдо не найдено")
    return dish


@router.get("", response_model=list[PlaceTopDishRead])
async def list_my_dishes(
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlaceTopDishRead]:
    rows = (
        await db.scalars(
            select(PlaceTopDish)
            .where(PlaceTopDish.place_id == user.place_id)
            .order_by(PlaceTopDish.sort_order, PlaceTopDish.id)
        )
    ).all()
    return [PlaceTopDishRead.model_validate(d) for d in rows]


@router.post(
    "",
    response_model=PlaceTopDishRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dish(
    body: PlaceTopDishCreate,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceTopDishRead:
    dish = PlaceTopDish(
        place_id=user.place_id,
        **body.model_dump(),
    )
    db.add(dish)
    await db.commit()
    await db.refresh(dish)
    return PlaceTopDishRead.model_validate(dish)


@router.put("/{dish_id}", response_model=PlaceTopDishRead)
async def update_dish(
    dish_id: int,
    body: PlaceTopDishUpdate,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceTopDishRead:
    dish = await _load_my_dish(db, user, dish_id)

    payload = body.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(dich, field, value)

    await db.commit()
    await db.refresh(dish)
    return PlaceTopDishRead.model_validate(dish)


@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dish(
    dish_id: int,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    dish = await _load_my_dish(db, user, dish_id)
    await db.delete(dish)
    await db.commit()
