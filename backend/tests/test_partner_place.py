"""Тесты партнёрского API: чтение и редактирование своего заведения.

Главное, что проверяем:
- неавторизованный → 401
- админ → 403 (роль не подходит)
- партнёр видит ИМЕННО своё заведение (его id, не чужой)
- запрещённые поля (name/category/координаты) — игнорируются Pydantic'ом
- m2m-связи (cuisines/diet_tags/amenities) корректно перезаписываются
"""
import pytest

from tests.conftest import (
    ADMIN_EMAIL, ADMIN_PASSWORD,
    PARTNER_EMAIL, PARTNER_PASSWORD,
)


async def _login(client, email: str, password: str) -> None:
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text


async def test_partner_place_requires_auth(client) -> None:
    r = await client.get("/api/partner/place/me")
    assert r.status_code == 401


async def test_partner_place_forbidden_for_admin(client) -> None:
    """Админ не партнёр — для партнёрского API он чужой (403)."""
    await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    r = await client.get("/api/partner/place/me")
    assert r.status_code == 403


async def test_partner_gets_own_place(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.get("/api/partner/place/me")
    assert r.status_code == 200
    body = r.json()
    # Партнёр привязан к «Лена Кафе» (см. conftest._seed_minimal).
    assert body["name"] == "Лена Кафе"


async def test_partner_can_update_description(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.put(
        "/api/partner/place/me",
        json={"description": "Новое описание", "phone": "+7 4112 000-000"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["description"] == "Новое описание"
    assert body["phone"] == "+7 4112 000-000"


async def test_partner_cannot_change_name_via_update(client) -> None:
    """Поля name/category в схеме PlaceUpdate отсутствуют — приходящие данные
    игнорируются, потому что в Pydantic v2 default extra='ignore'."""
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    before = (await client.get("/api/partner/place/me")).json()
    r = await client.put(
        "/api/partner/place/me",
        json={"name": "Хакер-нейм", "category": "bar", "description": "x"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == before["name"]
    assert body["category"]["code"] == before["category"]["code"]
    assert body["description"] == "x"


async def test_partner_can_replace_cuisines_amenities(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.put(
        "/api/partner/place/me",
        json={"cuisines": ["italian"], "amenities": ["terrace"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert {c["code"] for c in body["cuisines"]} == {"italian"}
    assert {a["code"] for a in body["amenities"]} == {"terrace"}


async def test_partner_unknown_cuisine_codes_silently_skipped(client) -> None:
    """Если фронт прислал несуществующий код — просто игнорируется."""
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.put(
        "/api/partner/place/me",
        json={"cuisines": ["italian", "no-such-cuisine"]},
    )
    assert r.status_code == 200
    assert {c["code"] for c in r.json()["cuisines"]} == {"italian"}


async def test_partner_can_set_upsell_highlights(client) -> None:
    """upsell_highlights — список строк-фишек, попадает в карточку апселла."""
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.put(
        "/api/partner/place/me",
        json={"upsell_highlights": ["Вид на реку", "Завтраки до 14:00"]},
    )
    assert r.status_code == 200
    assert r.json()["upsell_highlights"] == ["Вид на реку", "Завтраки до 14:00"]
