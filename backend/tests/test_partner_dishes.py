"""Тесты партнёрского CRUD топ-блюд.

Помимо штатного потока (list/create/update/delete) проверяем самое важное —
ИЗОЛЯЦИЮ: партнёр_1 не должен видеть/менять блюда партнёра_2 (IDOR).
"""
from tests.conftest import (
    PARTNER_EMAIL, PARTNER_PASSWORD,
    PARTNER2_EMAIL, PARTNER2_PASSWORD,
)


async def _login(client, email, password) -> None:
    assert (await client.post(
        "/auth/login", json={"email": email, "password": password}
    )).status_code == 200


async def test_dishes_list_requires_partner(client) -> None:
    assert (await client.get("/api/partner/dishes")).status_code == 401


async def test_create_and_list_dish(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.post(
        "/api/partner/dishes",
        json={"name": "Строганина из чира", "price": 850, "sort_order": 1},
    )
    assert r.status_code == 201
    created = r.json()
    assert created["name"] == "Строганина из чира"

    listed = (await client.get("/api/partner/dishes")).json()
    assert any(d["id"] == created["id"] for d in listed)


async def test_update_own_dish(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    create = await client.post(
        "/api/partner/dishes", json={"name": "Жеребятина", "price": 1200}
    )
    dish_id = create.json()["id"]

    r = await client.put(
        f"/api/partner/dishes/{dish_id}",
        json={"price": 1500, "description": "На углях"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["price"] == 1500
    assert body["description"] == "На углях"
    # Поля, которые не передавали, не должны измениться.
    assert body["name"] == "Жеребятина"


async def test_delete_own_dish(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    create = await client.post(
        "/api/partner/dishes", json={"name": "Удалить меня", "price": 100}
    )
    dish_id = create.json()["id"]

    assert (await client.delete(f"/api/partner/dishes/{dish_id}")).status_code == 204
    # После удаления блюдо в списке отсутствует.
    listed = (await client.get("/api/partner/dishes")).json()
    assert all(d["id"] != dish_id for d in listed)


async def test_partner_cannot_touch_foreign_dish(client) -> None:
    """IDOR-защита: партнёр_2 создаёт блюдо, партнёр_1 не должен его править/удалять."""
    # Шаг 1: партнёр_2 заводит блюдо у себя.
    await _login(client, PARTNER2_EMAIL, PARTNER2_PASSWORD)
    foreign = (await client.post(
        "/api/partner/dishes",
        json={"name": "Чужое блюдо", "price": 999},
    )).json()
    foreign_id = foreign["id"]

    # Шаг 2: партнёр_1 логинится (это сменит cookie на новую сессию).
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)

    # Партнёр_1 не видит чужое блюдо в своём списке.
    listed = (await client.get("/api/partner/dishes")).json()
    assert all(d["id"] != foreign_id for d in listed)

    # PUT по чужому id должен ответить 404 (не 403 — не подсказываем, существует ли ID).
    r = await client.put(
        f"/api/partner/dishes/{foreign_id}", json={"price": 1}
    )
    assert r.status_code == 404

    # DELETE по чужому id — тот же 404.
    assert (await client.delete(f"/api/partner/dishes/{foreign_id}")).status_code == 404


async def test_dish_validation_rejects_negative_price(client) -> None:
    await _login(client, PARTNER_EMAIL, PARTNER_PASSWORD)
    r = await client.post(
        "/api/partner/dishes", json={"name": "Цена-баг", "price": -1}
    )
    assert r.status_code == 422
