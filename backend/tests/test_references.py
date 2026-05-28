async def test_references_returns_all_groups(client) -> None:
    r = await client.get("/api/references")
    assert r.status_code == 200
    data = r.json()

    assert {c["code"] for c in data["categories"]} == {"restaurant", "cafe"}
    assert {c["code"] for c in data["cuisines"]} == {"yakut", "italian"}
    assert {p["code"] for p in data["price_bands"]} == {"P1", "P2", "P3", "P4"}
    assert any(b["min_price"] == 0 for b in data["price_bands"])


async def test_age_groups_sorted_by_min_age(client) -> None:
    data = (await client.get("/api/references")).json()
    ages = [g["min_age"] for g in data["age_groups"]]
    assert ages == sorted(ages)
