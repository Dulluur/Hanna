"""Тесты аутентификации (серверные сессии).

Проверяем:
- успешный логин и установку cookie
- одинаковую 401 на «нет email» и «неверный пароль»
- /auth/me без cookie / с cookie / после logout
- неактивного пользователя
- истечение сессии
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.models import Session as SessionModel

from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    INACTIVE_EMAIL,
    INACTIVE_PASSWORD,
    PARTNER_EMAIL,
    PARTNER_PASSWORD,
)


COOKIE = settings.session_cookie_name


async def test_login_success_sets_cookie(client) -> None:
    r = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    # cookie выдан и валидной длины
    assert COOKIE in r.cookies
    assert len(r.cookies[COOKIE]) >= 30


async def test_login_invalid_password_returns_401(client) -> None:
    r = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
    )
    assert r.status_code == 401
    assert COOKIE not in r.cookies


async def test_login_unknown_email_returns_same_401(client) -> None:
    """Чтобы не давать перебор email'ов — ответ должен быть идентичный."""
    r1 = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
    )
    r2 = await client.post(
        "/auth/login", json={"email": "nobody@nowhere.io", "password": "wrong"}
    )
    assert r1.status_code == r2.status_code == 401
    assert r1.json() == r2.json()


async def test_login_inactive_user_returns_401(client) -> None:
    r = await client.post(
        "/auth/login", json={"email": INACTIVE_EMAIL, "password": INACTIVE_PASSWORD}
    )
    assert r.status_code == 401


async def test_login_email_validation(client) -> None:
    r = await client.post("/auth/login", json={"email": "not-email", "password": "x"})
    assert r.status_code == 422


async def test_me_without_cookie_returns_401(client) -> None:
    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_me_with_valid_cookie(client) -> None:
    await client.post(
        "/auth/login", json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
    )
    r = await client.get("/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == PARTNER_EMAIL
    assert body["role"] == "partner"
    assert body["place_id"] is not None


async def test_logout_clears_session(client) -> None:
    await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert (await client.get("/auth/me")).status_code == 200

    r = await client.post("/auth/logout")
    assert r.status_code == 204

    assert (await client.get("/auth/me")).status_code == 401


async def test_expired_session_returns_401(client, _engine) -> None:
    """Сессия с expires_at в прошлом не должна авторизовать."""
    login = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    sid = login.cookies[COOKIE]

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        await db.execute(
            update(SessionModel)
            .where(SessionModel.id == sid)
            .values(expires_at=datetime.now(timezone.utc) - timedelta(hours=1))
        )
        await db.commit()

    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_login_creates_session_in_db(client, _engine) -> None:
    """После login в БД лежит запись с user_agent и ip."""
    r = await client.post(
        "/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"User-Agent": "test-agent/1.0"},
    )
    sid = r.cookies[COOKIE]

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        sess = await db.get(SessionModel, sid)
        assert sess is not None
        assert sess.user_agent == "test-agent/1.0"
        assert sess.expires_at > datetime.now(timezone.utc)


async def test_password_hash_unit() -> None:
    """Юнит: hash_password создаёт bcrypt-хеш, verify_password его принимает."""
    from app.auth.passwords import hash_password, verify_password

    h = hash_password("hello123")
    assert h.startswith("$2") and len(h) >= 50
    assert verify_password("hello123", h) is True


# ====================== Регистрация партнёра (заявка) ======================


async def test_partner_register_creates_pending_user_and_place(client, _engine) -> None:
    """Заявка создаёт User и Place в is_active=False, входить ещё нельзя."""
    payload = {
        "email": "newcafe@test.example",
        "password": "Some$tr0ngPass",
        "contact_name": "Иван Иванов",
        "place_name": "Кафе «Сосны»",
        "place_address": "ул. Ленина, 1",
        "place_phone": "+7-924-000-00-00",
        "place_description": "Кофе, выпечка, авторская кухня",
    }
    r = await client.post("/auth/partner/register", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending"

    # Проверяем БД напрямую: записи появились, но обе НЕ активны.
    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        from sqlalchemy import select as _select

        from app.models import Place, User

        user = (
            await db.execute(_select(User).where(User.email == payload["email"]))
        ).scalar_one()
        assert user.is_active is False
        assert user.role.value == "partner"
        assert user.place_id is not None

        place = await db.get(Place, user.place_id)
        assert place is not None
        assert place.is_active is False
        assert place.name == payload["place_name"]

    # Логин до активации — должен возвращать 401 (тот же ответ, что
    # и при неверном пароле — защита от перебора email'ов).
    login_r = await client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_r.status_code == 401


async def test_partner_register_duplicate_email_returns_409(client) -> None:
    """Повторная заявка с тем же email — 409 Conflict."""
    payload = {
        "email": "dup@test.example",
        "password": "Some$tr0ngPass",
        "contact_name": "Тест",
        "place_name": "Кафе",
        "place_address": "ул. Тестовая, 2",
    }
    r1 = await client.post("/auth/partner/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/auth/partner/register", json=payload)
    assert r2.status_code == 409


async def test_partner_register_validates_fields(client) -> None:
    """Pydantic-валидация: короткий пароль и невалидный email → 422."""
    bad = {
        "email": "not-email",
        "password": "short",  # <8 символов
        "contact_name": "Т",
        "place_name": "К",
        "place_address": "у",
    }
    r = await client.post("/auth/partner/register", json=bad)
    assert r.status_code == 422
