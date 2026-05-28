from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import AgeGroup, Event, EventType
from app.schemas import EventDetail, EventListItem, Paginated

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=Paginated[EventListItem])
async def list_events(
    session: Annotated[AsyncSession, Depends(get_session)],
    event_type: str | None = None,
    age_group: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    price_max: int | None = Query(default=None, ge=0),
    place_id: int | None = None,
    search: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> Paginated[EventListItem]:
    base = select(Event).where(Event.is_active.is_(True))

    # Скрываем прошедшие события: сравниваем с ends_at, а если его нет — со starts_at.
    now = datetime.now(timezone.utc)
    base = base.where(func.coalesce(Event.ends_at, Event.starts_at) >= now)

    if event_type:
        base = base.join(EventType, Event.event_type_id == EventType.id).where(
            EventType.code == event_type
        )

    if age_group:
        base = base.join(AgeGroup, Event.age_group_id == AgeGroup.id).where(
            AgeGroup.code == age_group
        )

    if date_from is not None:
        base = base.where(Event.starts_at >= date_from)

    if date_to is not None:
        base = base.where(Event.starts_at <= date_to)

    if price_max is not None:
        base = base.where((Event.price.is_(None)) | (Event.price <= price_max))

    if place_id is not None:
        base = base.where(Event.place_id == place_id)

    if search:
        like = f"%{search.strip()}%"
        base = base.where(Event.title.ilike(like))

    total_stmt = select(func.count()).select_from(base.order_by(None).subquery())
    total = (await session.execute(total_stmt)).scalar_one()

    items_stmt = base.order_by(Event.starts_at).limit(limit).offset(offset)
    rows = (await session.scalars(items_stmt)).unique().all()

    return Paginated[EventListItem](
        items=[EventListItem.model_validate(e) for e in rows],
        total=total,
        limit=limit,
        offset=offset,
    )

@router.get("/{event_id}", response_model=EventDetail)
async def get_event(
    event_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> EventDetail:
    event = await session.get(Event, event_id)
    if event is None or not event.is_active:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventDetail.model_validate(event)
