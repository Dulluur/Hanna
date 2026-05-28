"""Тесты публичного эндпоинта POST /api/metrics.

Проверяем:
- успешная запись (204)
- запись попадает в БД с user-agent
- невалидные значения action / entity_type → 422
- эндпоинт открыт без авторизации (гость может фиксировать клик)
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import ClickMetric


async def test_track_click_returns_204(client) -> None:
    r = await client.post(
        "/api/metrics",
        json={"entity_type": "place", "entity_id": 1, "action": "route_click"},
    )
    assert r.status_code == 204


async def test_track_click_persists_to_db(client, _engine) -> None:
    """После запроса в click_metrics появляется ровно одна новая запись с правильным user_agent."""
    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    await client.post(
        "/api/metrics",
        json={"entity_type": "event", "entity_id": 42, "action": "ticket_click"},
        headers={"User-Agent": "Mozilla/5.0 test"},
    )

    async with Session() as db:
        rows = (await db.scalars(select(ClickMetric))).all()
        assert len(rows) == 1
        m = rows[0]
        assert m.entity_type == "event"
        assert m.entity_id == 42
        assert m.action == "ticket_click"
        assert m.user_agent == "Mozilla/5.0 test"


async def test_track_click_no_auth_required(client) -> None:
    """Гость не залогинен — эндпоинт всё равно работает."""
    r = await client.post(
        "/api/metrics",
        json={"entity_type": "place", "entity_id": 1, "action": "taxi_click"},
    )
    assert r.status_code == 204


async def test_invalid_action_returns_422(client) -> None:
    r = await client.post(
        "/api/metrics",
        json={"entity_type": "place", "entity_id": 1, "action": "hack_action"},
    )
    assert r.status_code == 422


async def test_invalid_entity_type_returns_422(client) -> None:
    r = await client.post(
        "/api/metrics",
        json={"entity_type": "user", "entity_id": 1, "action": "route_click"},
    )
    assert r.status_code == 422


async def test_long_user_agent_truncated(client, _engine) -> None:
    """User-Agent длиннее 500 символов — обрезается, не падает."""
    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    long_ua = "x" * 1000
    await client.post(
        "/api/metrics",
        json={"entity_type": "place", "entity_id": 1, "action": "phone_click"},
        headers={"User-Agent": long_ua},
    )
    async with Session() as db:
        m = (await db.scalars(select(ClickMetric))).first()
        assert m is not None
        assert len(m.user_agent) == 500
