from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.passwords import hash_password, verify_password
from app.auth.sessions import create_session, delete_session, session_ttl
from app.config import settings
from app.database import get_session
from app.middleware.rate_limit import login_rate_limit
from app.models import Place, User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserMe(BaseModel):
    id: int
    email: str
    name: str | None
    role: str
    place_id: int | None

    @classmethod
    def from_user(cls, user: User) -> "UserMe":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role.value,
            place_id=user.place_id,
        )


@router.post("/login", response_model=UserMe)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[None, Depends(login_rate_limit)],
) -> UserMe:
    user = (
        await db.execute(select(User).where(User.email == body.email))
    ).scalar_one_or_none()

    valid = (
        user is not None
        and user.is_active
        and verify_password(body.password, user.password_hash)
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    sess = await create_session(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    await db.commit()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=sess.id,
        max_age=int(session_ttl().total_seconds()),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return UserMe.from_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    sid = request.cookies.get(settings.session_cookie_name)
    if sid:
        await delete_session(db, sid)
        await db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserMe)
async def me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> UserMe:
    await db.commit()
    return UserMe.from_user(user)


class PartnerRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    contact_name: str = Field(min_length=2, max_length=100)

    place_name: str = Field(min_length=2, max_length=200)
    place_address: str = Field(min_length=3, max_length=300)
    place_phone: str | None = Field(default=None, max_length=50)
    place_description: str | None = Field(default=None, max_length=2000)


class PartnerRegisterResponse(BaseModel):
    status: str
    message: str


_YAKUTSK_LAT = Decimal("62.0282")
_YAKUTSK_LON = Decimal("129.7300")


@router.post(
    "/partner/register",
    response_model=PartnerRegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def partner_register(
    body: PartnerRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[None, Depends(login_rate_limit)],
) -> PartnerRegisterResponse:
    existing = (
        await db.execute(select(User.id).where(User.email == body.email))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email уже используется",
        )

    place = Place(
        name=body.place_name,
        address=body.place_address,
        latitude=_YAKUTSK_LAT,
        longitude=_YAKUTSK_LON,
        phone=body.place_phone,
        description=body.place_description,
        is_active=False,
    )
    db.add(place)
    await db.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.contact_name,
        role=UserRole.PARTNER,
        place_id=place.id,
        is_active=False,
    )
    db.add(user)
    await db.commit()

    return PartnerRegisterResponse(
        status="pending",
        message=(
            "Заявка принята. Администратор проверит её в ближайшее время."
            "После активации сможете войти в кабинет партнёра."
        ),
    )
