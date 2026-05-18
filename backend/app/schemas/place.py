from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.reference import (
    AmenityTagRead,
    CategoryRead,
    CuisineRead,
    DietTagRead,
    PriceBandRead,
)


class PlaceTopDishRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: int
    description: str | None = None
    weight: str | None = None
    photo_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class PlaceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal
    photo_url: str | None = None
    rating_2gis: Decimal | None = None
    category: CategoryRead | None = None
    price_band: PriceBandRead | None = None
    cuisines: list[CuisineRead] = []


class PlaceDetail(PlaceListItem):
    description: str | None = None
    work_hours: dict[str, Any] | str | None = None
    phone: str | None = None
    website: str | None = None
    upsell_highlights: list[str] = []
    diet_tags: list[DietTagRead] = []
    amenities: list[AmenityTagRead] = []
    top_dishes: list[PlaceTopDishRead] = []
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PlaceQuery(BaseModel):
    category: str | None = None
    cuisines: list[str] = Field(default_factory=list)
    diet_tags: list[str] = Field(default_factory=list)
    amenities: list[str] = Field(default_factory=list)
    price_band: str | None = None
    budget: int | None = Field(default=None, ge=0)
    search: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class UpsellItem(BaseModel):
    place: PlaceListItem
    delta_pct: int
    delta_rub: int
    reasons: list[str]


class PlaceListResponse(BaseModel):
    items: list[PlaceListItem]
    upsell: list[UpsellItem]
    total: int
    limit: int
    offset: int


class PlaceUpdate(BaseModel):
    description: str | None = None
    work_hours: dict[str, Any] | str | None = None
    photo_url: str | None = None
    phone: str | None = None
    website: str | None = None
    upsell_highlights: list[str] | None = None

    cuisines: list[str] | None = None
    diet_tags: list[str] | None = None
    amenities: list[str] | None = None


class PlaceTopDishCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    price: int = Field(..., ge=0)
    description: str | None = None
    sort_order: int = 0
    weight: str | None = Field(default=None, max_length=50)
    photo_url: str | None = Field(default=None, max_length=2000)
    tags: list[str] = Field(default_factory=list)


class PlaceTopDishUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    price: int | None = Field(default=None, ge=0)
    description: str | None = None
    sort_order: int | None = None
    weight: str | None = Field(default=None, max_length=50)
    photo_url: str | None = Field(default=None, max_length=2000)
    tags: list[str] | None = None
