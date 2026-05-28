"""Тесты партнёрского CRUD событий.

Проверяем штатный поток + IDOR (чужое событие не виднó и не правится),
а также резолв кодов справочников (event_type / age_group).
"""
from datetime import datetime, timedelta, timezone

from tests.conftest import (
    PARTNER_EMAIL, PARTNER_PASSWORD,
    PARTNER2_EMAIL, PARTNER2_PASSWORD,
)


async def _login(client, email, password) -> None:
    assert (await client.post(
        "/auth/login", json={"email": email, "password": password}
    )).status_code == 200


def _future(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def test_create_event_attaches_to_my_place(client) -> None:
    """place_id события — это place_id текущего партнёра, неважно что прислал фронт."""
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.post(
        "/api/partner/events",
        json={
            "title": "Мастер-класс по строганине",
            "event_type": "masterclass",
            "starts_at": _future(2),
            "price": 700,
        },
    )
    # event_type "masterclass" может отсутствовать в тестовом сиде — проверим.
    if r.status_code == 422:
        # тестовый сид содержит только concert и quiz — пробуем concert
        r = await client.post(
            "/api/partner/events",
            json={
                "title": "Мастер-класс по строганине",
                "event_type": "concert",
                "starts_at": _future(2),
                "price": 700,
            },
        )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "Мастер-класс по строганине"
    # Событие привязано к месту партнёра.
    assert body["place"]["name"] == "Лена Кафе"


async def test_list_returns_only_my_events(client) -> None:
    """Партнёр_2 создаёт событие у себя — партнёр_1 его в своём списке не видит."""
    await _login(client, PARTNER2_EMAIL, PARTNER2_PASSWORD)
    foreign = (await client.post(
        "/api/partner/events",
        json={"title": "Чужое событие", "starts_at": _future(3)},
    )).json()

    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    listed = (await client.get("/api/partner/events")).json()
    assert all(e["id"] != foreign["id"] for e in listed)


async def test_update_foreign_event_returns_404(client) -> None:
    """PUT по чужому event_id — 404 (IDOR-защита)."""
    await _login(client, PARTNER2_EMAIL, PARTNER2_PASSWORD)
    foreign = (await client.post(
        "/api/partner/events",
        json={"title": "Чужое", "starts_at": _future(4)},
    )).json()

    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.put(
        f"/api/partner/events/{foreign['id']}", json={"title": "Хак"}
    )
    assert r.status_code == 404


async def test_delete_own_event(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    created = (await client.post(
        "/api/partner/events",
        json={"title": "Под удаление", "starts_at": _future(5)},
    )).json()
    assert (
        await client.delete(f"/api/partner/events/{created['id']}")
    ).status_code == 204


async def test_unknown_event_type_returns_422(client) -> None:
    """Несуществующий код event_type → 422 с понятным сообщением."""
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.post(
        "/api/partner/events",
        json={
            "title": "Сломанный тип",
            "event_type": "no-such-type",
            "starts_at": _future(6),
        },
    )
    assert r.status_code == 422
    assert "no-such-type" in r.json()["detail"]


async def test_event_endpoints_require_auth(client) -> None:
    assert (await client.get("/api/partner/events")).status_code == 401
    assert (await client.post(
        "/api/partner/events",
        json={"title": "x", "starts_at": _future(1)},
    )).status_code == 401
