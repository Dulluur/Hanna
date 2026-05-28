"""5 обязательных тестов на алгоритм апселла +15-20% (CLAUDE.md, пункт 10 ВКР).

Тестовый сид (`_seed_upsell` в conftest):
- P1 (0-500): «Дешёвое кафе»
- P2 (500-1500): «Среднее место»
- P3 (1500-3000): 6 заведений с разными rating_2gis и upsell_highlights
- P4 (3000-10000): 1 заведение
"""


async def test_upsell_empty_when_no_budget(upsell_client) -> None:
    """Без `budget` блок апселла должен быть пустой."""
    data = (await upsell_client.get("/api/places")).json()
    assert data["upsell"] == []


async def test_upsell_within_20pct(upsell_client) -> None:
    """Все элементы апселла лежат в диапазоне (budget; budget*1.2] по min_price."""
    budget = 1499
    upper = int(budget * 1.20)  # 1798
    data = (await upsell_client.get(f"/api/places?budget={budget}")).json()
    assert data["upsell"], "ожидаются кандидаты в этом диапазоне"
    for item in data["upsell"]:
        min_price = item["place"]["price_band"]["min_price"]
        assert budget < min_price <= upper, f"{min_price} вне ({budget}; {upper}]"


async def test_upsell_no_dup_with_items(upsell_client) -> None:
    """Множества id в `items` и `upsell` не пересекаются."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    items_ids = {p["id"] for p in data["items"]}
    upsell_ids = {u["place"]["id"] for u in data["upsell"]}
    assert items_ids and upsell_ids
    assert items_ids.isdisjoint(upsell_ids)


async def test_upsell_max_5_items(upsell_client) -> None:
    """Лимит апселла — 5 карточек, даже если кандидатов больше."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    assert len(data["upsell"]) <= 5
    assert len(data["upsell"]) == 5  # сид содержит 6 кандидатов в P3


async def test_upsell_reasons_not_empty(upsell_client) -> None:
    """У каждой карточки апселла — от 1 до 3 пояснений."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    assert data["upsell"]
    for item in data["upsell"]:
        assert 1 <= len(item["reasons"]) <= 3


async def test_upsell_sorted_by_rating_nulls_last(upsell_client) -> None:
    """Кандидаты сортируются по `rating_2gis` desc, NULL — в конце."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    ratings = [u["place"]["rating_2gis"] for u in data["upsell"]]
    non_null = [float(r) for r in ratings if r is not None]
    assert non_null == sorted(non_null, reverse=True)
    if None in ratings:
        assert ratings.index(None) == len(ratings) - 1 or all(
            r is None for r in ratings[ratings.index(None):]
        )


async def test_upsell_delta_pct_formula(upsell_client) -> None:
    """`delta_pct == round(delta_rub * 100 / budget)`."""
    budget = 1499
    data = (await upsell_client.get(f"/api/places?budget={budget}")).json()
    for item in data["upsell"]:
        assert item["delta_pct"] == round(item["delta_rub"] * 100 / budget)


async def test_upsell_excludes_segment_at_budget(upsell_client) -> None:
    """Граница строгая: min_price > budget. P3 (min=1500) не попадает при budget=1500."""
    data = (await upsell_client.get("/api/places?budget=1500")).json()
    for item in data["upsell"]:
        assert item["place"]["price_band"]["min_price"] > 1500


async def test_upsell_rating_reason_when_above_4_5(upsell_client) -> None:
    """Если rating_2gis >= 4.5, в reasons есть строка с этим рейтингом."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    for item in data["upsell"]:
        rating = item["place"]["rating_2gis"]
        if rating is not None and float(rating) >= 4.5:
            assert any("Рейтинг 2ГИС" in r for r in item["reasons"])


async def test_upsell_fallback_reason_for_no_highlights_no_rating(upsell_client) -> None:
    """Если нет ни рейтинга, ни highlights — выводится fallback-строка."""
    data = (await upsell_client.get("/api/places?budget=1499")).json()
    fallback_seen = False
    for item in data["upsell"]:
        rating = item["place"]["rating_2gis"]
        # «P3 Премиум-6»: rating=None, highlights=[]
        if item["place"]["name"] == "P3 Премиум-6":
            fallback_seen = True
            assert item["reasons"] == ["Премиум-сегмент по версии каталога"]
    # На случай если он попал в топ-5 (последний по сортировке — может выпасть из лимита 5).
    # У нас 6 P3-мест, P3 Премиум-6 (rating=NULL) идёт последним → именно он отсекается limit(5).
    # Поэтому проверку выше дублируем юнит-тестом сервиса:
    from app.models import Place
    from app.services.upsell import build_reasons
    p = Place(rating_2gis=None, upsell_highlights=[])
    assert build_reasons(p) == ["Премиум-сегмент по версии каталога"]
