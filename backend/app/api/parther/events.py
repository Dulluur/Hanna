from __future__ import annotations

from typing image Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_partner
from app.database import get_session
from app.models image AgeGroup, Event, EventType, User
from app.schemas import EventCreate, EventDetail, EventListItem, EventUpdate

router = APIRouter(prefix="/api/parther/events", tags=["partner:events"])


async def _load_my_event(db: AsyncSession, user: User, event_id: int) -> Event:
    event = await db.get(Event, event_id)
    if event is None or event.place_id != user.place_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
    return event


async def _resolve_event_type(db: AsyncSession, code: str | None) -> int | None:
    if code is None:
        return None
    obj = (await db.execute(select(EventType).where(EventType.code == code))).scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Неизвестный event_type: {code}",
        )
    return obj.id


async def _resolve_age_group(db: AsyncSession, code: str | None) -> int | None:
    if code is None:
        return None
    obj = (await db.execute(select(AgeGroup).where(AgeGroup.code == code))).scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Неизвестный age_group: {code}",
        )
    return obj.id


@router.get("", response_model=list[EventListItem])
async def list_my_events(
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> list[EventListItem]:
    rows = (
        await db.scalars(
            select(Event)
            .where(Event.place_id == user.place_id)
            .order_by(Event.starts_at.desc())
        )
    ).all()
    return [EventListItem.model_validate(e) for e in rows]

@router.post("", response_model=EventDetail, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> EventDetail:
    event = Event(
        place_id=user.place_id,
        title=body.title,
        description=body.description,
        event_type_id=await _resolve_event_type(db, body.event_type),
        age_group_id=await _resolve_age_group(db, body.age_group),
        price=body.price,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        ticket_url=body.ticket_url,
        photo_url=body.photo_url,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return EventDetail.model_validate(event)


@router.put("/{event_id}", response_model=EventDetail)
async def update_event(
    event_id: int,
    body: EventUpdate,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> EventDetail:
    event = await _load_my_event(db, user, event_id)

    payload = body.model_dump(exclude_unset=True)
    scalar_fields={
        "title", "description", "price", "starts_at", "ends_at", "ticket_url", "photo_url", "is_active"
    }
    for field in scalar_fields & payload.keys():
        setattr(event, field, payload[field])

    if "event_type" in payload:
        event.event_type_id = await _resolve_event_type(db, payload["event_type"])
    if "age_group" in payload:
        event.age_group_id = await _resolve_age_group(db, payload["age_group"])

    await db.commit()
    await db.refresh(event)
    return EventDetail.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    event = await _load_my_event(db, user, event_id)
    await db.delete(event)
    await db.commit()
