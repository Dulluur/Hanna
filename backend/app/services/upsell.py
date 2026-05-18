from __future__ import annotations

from decimal import Decimal

from app.models import Place
from app.schemas.place import PlaceListItem, UpsellItem

UPSELL_LIMIT = 5
UPSELL_RATIO = Decimal("1.20")
RATING_THRESHOLD = Decimal("4.5")
MAX_REASONS = 3
HIGHLIGHTS_PER_REASON = 2

def upsell_upper_bound(budget: int) -> int:
    return int(Decimal(budget) * UPSELL_RATIO)

def build_reasons(place: Place) -> list[str]:
    reasons: list[str] = []

    if place.rating_2gis is not None and place.rating_2gis >= RATING_THRESHOLD:
        reasons.append(f"Рейтинг 2ГИС {place.rating_2gis}")

    if place.upsell_highlights:
        for highlight in place.upsell_highlights[:HIGHLIGHTS_PER_REASON]:
            reasons.append(highlight)

    if not reasons:
        reasons.append("Премиум-сегмент по версии каталога")

    return reasons[:MAX_REASONS]

def make_upsell_item(place: Place, budget: int) -> UpsellItem:
    min_price = place.price_band.min_price
    delta_rub = min_price - budget
    delta_pct = round(delta_rub * 100 / budget)
    return UpsellItem(
        place=PlaceListItem.model_validate(place),
        delta_pct=delta_pct,
        delta_rub=delta_rub,
        reasons=build_reasons(place),
    )
