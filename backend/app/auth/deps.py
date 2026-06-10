from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.sessions import get_user_by_session
from app.config import settings
from app.database import get_session
from app.models import User, UserRole

UNAUTHORIZED = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
FORBIDDEN = HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    sid = request.cookies.get(settings.session_cookie_name)
    if not sid:
        raise UNAUTHORIZED
    user = await get_user_by_session(db, sid)
    if user is None:
        raise UNAUTHORIZED
    return user


async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != UserRole.ADMIN:
        raise FORBIDDEN
    return user

async def require_partner(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != UserRole.PARTNER:
        raise FORBIDDEN
    if user.place_id is None:
        raise FORBIDDEN
    return user
