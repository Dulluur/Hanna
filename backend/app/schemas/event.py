from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.place import PlaceListItem
from app.schemas.reference import AgeGroupRead, EventTypeRead


class EventListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    photo_url: str | None = None
    price: int | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    ticket_url: str | None = None
    event_type: EventTypeRead | None = None
    age_group: AgeGroupRead | None = None
    place: PlaceListItem | None = None


class EventDetail(EventListItem):
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class EventQuery(BaseModel):
    event_type: str | None = None
    age_group: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    price_max: int | None = Field(default=None, ge=0)
    place_id: int | None = None
    search: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    event_type: str | None = None
    age_group: str | None = None
    price: int | None = Field(default=None, ge=0)
    starts_at: datetime
    ends_at: datetime | None = None
    ticket_url: str | None = None
    photo_url: str | None = None

class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    event_type: str | None = None
    age_group: str | None = None
    price: int | None = Field(default=None, ge=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    ticket_url: str | None = None
    photo_url: str | None = None
    is_active: bool | None = None
