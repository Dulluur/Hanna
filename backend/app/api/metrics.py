from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import ClickMetric
from app.schemas.metric import MetricCreate

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def track_click(
    body: MetricCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    metric = ClickMetric(
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        action=body.action,
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(metric)
    await db.commit()
