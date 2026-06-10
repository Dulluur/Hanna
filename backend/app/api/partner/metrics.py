from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_partner
from app.database import get_session
from app.models import ClickMetric, Event, User
from app.schemas.metric import METRIC_ACTIONS, PartnerMetrics

router = APIRouter(prefix="/api/partner/metrics", tags=["partner:metrics"])


@router.get("/me", response_model=PartnerMetrics)
async def my_metrics(
    user: Annotated[User, Depends(require_partner)],
    db: Annotated[AsyncSession, Depends(get_session)],
    days: int = Query(default=30, ge=1, le=365),
) -> PartnerMetrics:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    event_ids = (
        await db.scalars(select(Event.id).where(Event.place_id == user.place_id))
    ).all()

    scope = [
        and_(
            ClickMetric.entity_type == "place",
            ClickMetric.entity_id == user.place_id,
        )
    ]
    if event_ids:
        scope.append(
            and_(
                ClickMetric.entity_type == "event",
                ClickMetric.entity_id.in_(event_ids),
            )
        )

    rows = await db.execute(
        select(ClickMetric.action, func.count())
        .where(ClickMetric.created_at >= since, or_(*scope))
        .group_by(ClickMetric.action)
    )

    counts = {action: 0 for action in METRIC_ACTIONS}
    for action, count in rows.all():
        if action in counts:
            counts[action] = count

    return PartnerMetrics(
        period_days=days,
        actions=counts,
        total=sum(counts.values()),
    )
