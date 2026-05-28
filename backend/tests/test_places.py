async def test_list_returns_only_active_with_total(client) -> None:
    r = await client.get("/api/places")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert data["limit"] == 100 and data["offset"] == 0


async def test_filter_by_category(client) -> None:
    data = (await client.get("/api/places?category=cafe")).json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Лена Кафе"


async def test_filter_by_budget_keeps_only_lower_segments(client) -> None:
    """Бюджет 1000 — только сегменты, у которых max_price <= 1000 (P1: 0-500)."""
    data = (await client.get("/api/places?budget=1000")).json()
    assert data["total"] == 1
    assert data["items"][0]["price_band"]["code"] == "P1"


async def test_filter_by_budget_includes_segment_at_budget(client) -> None:
    """Бюджет 1500 — попадает P1 и P2 (max_price 500 и 1500)."""
    codes = {
        p["price_band"]["code"]
        for p in (await client.get("/api/places?budget=1500")).json()["items"]
    }
    assert codes == {"P1", "P2"}


async def test_filter_by_cuisines_intersection(client) -> None:
    """Передача нескольких кухонь — пересечение (заведение должно иметь все)."""
    data = (
        await client.get("/api/places?cuisines=yakut&cuisines=italian")
    ).json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Тыгын Дархан"


async def test_filter_by_amenities(client) -> None:
    data = (await client.get("/api/places?amenities=terrace")).json()
    assert {p["name"] for p in data["items"]} == {"Италиано", "Тыгын Дархан"}


async def test_search_by_name_case_insensitive(client) -> None:
    data = (await client.get("/api/places?search=тыгын")).json()
    assert data["total"] == 1


async def test_pagination_offset_limit(client) -> None:
    page1 = (await client.get("/api/places?limit=2&offset=0")).json()
    page2 = (await client.get("/api/places?limit=2&offset=2")).json()
    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 1
    assert page1["total"] == page2["total"] == 3
    ids = {p["id"] for p in page1["items"]} | {p["id"] for p in page2["items"]}
    assert len(ids) == 3


async def test_detail_includes_full_fields(client) -> None:
    list_data = (await client.get("/api/places")).json()
    pid = list_data["items"][0]["id"]
    detail = (await client.get(f"/api/places/{pid}")).json()
    for key in ("description", "amenities", "diet_tags", "top_dishes", "upsell_highlights"):
        assert key in detail


async def test_detail_404_for_unknown_id(client) -> None:
    r = await client.get("/api/places/99999")
    assert r.status_code == 404


async def test_invalid_query_validation(client) -> None:
    """Pydantic-валидация: limit > 100 запрещён, offset < 0 запрещён."""
    assert (await client.get("/api/places?limit=500")).status_code == 422
    assert (await client.get("/api/places?offset=-1")).status_code == 422
    assert (await client.get("/api/places?budget=-1")).status_code == 422
