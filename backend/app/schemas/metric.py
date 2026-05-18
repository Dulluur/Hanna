from typing import Literal

from pydantic import BaseModel, Field


MetricAction = Literal[
    "route_click",
    "taxi_click",
    "ticket_click",
    "phone_click",
    "website_click",
]


class MetricCreate(BaseModel):
    entity_type: Literal["place", "event"]
    entity_id: int = Field(..., ge=1)
    action: MetricAction
