from datetime import datetime, timedelta, timezone


async def test_list_returns_all_active(client) -> None:
    data = (await client.get("/api/events")).json()
    assert data["total"] == 3


async def test_filter_by_event_type(client) -> None:
    data = (await client.get("/api/events?event_type=concert")).json()
    assert data["total"] == 2
    assert all(e["event_type"]["code"] == "concert" for e in data["items"])


async def test_filter_by_age_group(client) -> None:
    data = (await client.get("/api/events?age_group=18%2B")).json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Квиз для взрослых"


async def test_filter_by_price_max_includes_free_events(client) -> None:
    """price_max должен пропускать события с NULL-ценой и с price <= max."""
    data = (await client.get("/api/events?price_max=400")).json()
    assert {e["title"] for e in data["items"]} == {"Квиз для взрослых"}


async def test_filter_by_date_range(client) -> None:
    after = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    data = (await client.get("/api/events", params={"date_from": after})).json()
    assert {e["title"] for e in data["items"]} == {"Большой концерт"}


async def test_filter_by_place(client) -> None:
    places = (await client.get("/api/places?category=cafe")).json()["items"]
    cafe_id = places[0]["id"]
    data = (await client.get(f"/api/events?place_id={cafe_id}")).json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Концерт в Лене"


async def test_events_sorted_by_starts_at(client) -> None:
    items = (await client.get("/api/events")).json()["items"]
    starts = [e["starts_at"] for e in items]
    assert starts == sorted(starts)


async def test_event_detail_404(client) -> None:
    assert (await client.get("/api/events/99999")).status_code == 404


async def test_event_detail_has_place(client) -> None:
    events = (await client.get("/api/events?event_type=concert")).json()["items"]
    eid = events[0]["id"]
    detail = (await client.get(f"/api/events/{eid}")).json()
    assert detail["place"] is not None
    assert "name" in detail["place"]
