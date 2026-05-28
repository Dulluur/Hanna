from pydantic import BaseModel, ConfigDict


class _RefBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str


class CategoryRead(_RefBase):
    icon: str | None = None


class CuisineRead(_RefBase):
    pass


class DietTagRead(_RefBase):
    pass


class AmenityTagRead(_RefBase):
    pass


class EventTypeRead(_RefBase):
    icon: str | None = None


class AgeGroupRead(_RefBase):
    min_age: int


class PriceBandRead(_RefBase):
    min_price: int
    max_price: int


class ReferencesBundle(BaseModel):
    categories: list[CategoryRead]
    cuisines: list[CuisineRead]
    diet_tags: list[DietTagRead]
    amenities: list[AmenityTagRead]
    event_types: list[EventTypeRead]
    age_groups: list[AgeGroupRead]
    price_bands: list[PriceBandRead]
