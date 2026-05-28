from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Session as SessionModel
from app.models import User


def session_ttl() -> timedelta:
    return timedelta(days=settings.session_ttl_days)


async def create_session(
    db: AsyncSession,
    user: User,
    *,
    user_agent: str | None,
    ip: str | None,
) -> SessionModel:
    sid = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    sess = SessionModel(
        id=sid,
        user_id=user.id,
        expires_at=now + session_ttl(),
        last_seen_at=now,
        user_agent=user_agent,
        ip_address=ip,
    )
    db.add(sess)
    await db.flush()
    return sess


async def get_user_by_session(db: AsyncSession, session_id: str) -> User | None:
    now = datetime.now(timezone.utc)
    sess = (
        await db.execute(
            select(SessionModel).where(
                SessionModel.id == session_id,
                SessionModel.expires_at > now,
            )
        )
    ).scalar_one_or_none()
    if sess is None:
        return None

    user = await db.get(User, sess.user_id)
    if user is None or not user.is_active:
        return None

    sess.last_seen_at = now
    return user

async def delete_session(db: AsyncSession, session_id: str) -> None:
    await db.execute(delete(SessionModel).where(SessionModel.id == session_id))
