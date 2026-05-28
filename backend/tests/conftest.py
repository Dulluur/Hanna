"""Тестовый conftest.

Использует отдельную БД (`HANNA_TEST_DATABASE_URL`, по умолчанию `hanna_test`
в том же контейнере), пересоздаёт схему через `Base.metadata.create_all`
и наполняет минимальный набор данных одним разом за сессию.
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth.passwords import hash_password
from app.database import Base, get_session
from app.main import app
from app.middleware.rate_limit import login_limiter
from app.models import (
    AgeGroup,
    AmenityTag,
    Category,
    Cuisine,
    DietTag,
    Event,
    EventType,
    Place,
    PriceBand,
    User,
    UserRole,
)

ADMIN_EMAIL = "admin@test.example"
ADMIN_PASSWORD = "AdminP@ss123"
PARTNER_EMAIL = "partner@test.example"
PARTNER_PASSWORD = "PartnerP@ss123"
# Второй партнёр привязан к ДРУГОМУ заведению, чтобы тесты могли проверить
# IDOR-защиту: чужие dish/event для первого партнёра должны давать 404.
PARTNER2_EMAIL = "partner2@test.example"
PARTNER2_PASSWORD = "Partner2P@ss123"
INACTIVE_EMAIL = "inactive@test.example"
INACTIVE_PASSWORD = "InactiveP@ss123"

TEST_DB_URL = os.getenv(
    "HANNA_TEST_DATABASE_URL",
    "postgresql+asyncpg://hanna:hanna@db:5433/hanna_test",
)

TEST_UPSELL_DB_URL = os.getenv(
    "HANNA_UPSELL_TEST_DATABASE_URL",
    "postgresql+asyncpg://hanna:hanna@db:5433/hanna_test_upsell",
)


@pytest_asyncio.fixture(scope="session")
async def _engine():
    engine = create_async_engine(TEST_DB_URL, future=True, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:  # подключения нет — тесты-интеграции скипаются
        await engine.dispose()
        pytest.skip(f"Тестовая БД недоступна: {exc}", allow_module_level=False)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# Имена всех таблиц для TRUNCATE между тестами. Порядок не важен — `CASCADE`
# разруливает FK, `RESTART IDENTITY` обнуляет id-последовательности.
_ALL_TABLES = (
    "click_metrics, sessions, users, events, place_top_dishes, "
    "place_amenities, place_diet_tags, place_cuisines, places, "
    "price_bands, age_groups, event_types, amenity_tags, diet_tags, "
    "cuisines, categories"
)


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Лимитер /auth/login — singleton в памяти процесса.

    Между тестами счётчик не сбрасывается сам собой, поэтому 6+ login-вызовов
    через несколько тестов начнут давать 429. Чистим перед и после каждого теста.
    """
    login_limiter.reset()
    yield
    login_limiter.reset()


@pytest_asyncio.fixture(scope="session")
async def _password_hashes() -> dict[str, str]:
    """Считаем bcrypt-хеши один раз за сессию.

    bcrypt cost=12 — это ~250мс на хеш. Перед каждым тестом сидер вызывается
    заново (см. `_seeded`), поэтому без кэша мы бы тратили ~1с на каждый тест
    только на хеширование.
    """
    return {
        "admin": hash_password(ADMIN_PASSWORD),
        "partner": hash_password(PARTNER_PASSWORD),
        "partner2": hash_password(PARTNER2_PASSWORD),
        "inactive": hash_password(INACTIVE_PASSWORD),
    }


@pytest_asyncio.fixture
async def _seeded(_engine, _password_hashes) -> AsyncIterator[None]:
    """Function-scope: чистим БД и пересеиваем перед КАЖДЫМ тестом.

    Тесты партнёрского API и /auth/login пишут в places/users/sessions,
    их побочные эффекты не должны протекать в соседние тесты.
    """
    async with _engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE TABLE {_ALL_TABLES} RESTART IDENTITY CASCADE"))

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        await _seed_minimal(s, _password_hashes)
        await s.commit()
    yield


@pytest_asyncio.fixture
async def client(_seeded, _engine) -> AsyncIterator[AsyncClient]:
    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with Session() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="session")
async def _upsell_engine():
    engine = create_async_engine(TEST_UPSELL_DB_URL, future=True, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        await engine.dispose()
        pytest.skip(f"Тестовая БД для апселла недоступна: {exc}", allow_module_level=False)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def _upsell_seeded(_upsell_engine) -> AsyncIterator[None]:
    Session = async_sessionmaker(_upsell_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        await _seed_upsell(s)
        await s.commit()
    yield


@pytest_asyncio.fixture
async def upsell_client(_upsell_seeded, _upsell_engine) -> AsyncIterator[AsyncClient]:
    Session = async_sessionmaker(_upsell_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with Session() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _seed_minimal(s: AsyncSession, hashes: dict[str, str]) -> None:
    """Минимальный сид: 2 категории, 4 ценовых сегмента, 3 заведения, 3 события."""
    cat_rest = Category(code="restaurant", name="Ресторан")
    cat_cafe = Category(code="cafe", name="Кафе")

    cui_yakut = Cuisine(code="yakut", name="Якутская")
    cui_italian = Cuisine(code="italian", name="Итальянская")

    diet_veg = DietTag(code="vegetarian", name="Вегетарианское")

    am_wifi = AmenityTag(code="wifi", name="Wi-Fi")
    am_terrace = AmenityTag(code="terrace", name="Веранда")

    et_concert = EventType(code="concert", name="Концерт")
    et_quiz = EventType(code="quiz", name="Квиз")

    ag_0 = AgeGroup(code="0+", name="0+", min_age=0)
    ag_18 = AgeGroup(code="18+", name="18+", min_age=18)

    pb_p1 = PriceBand(code="P1", name="₽", min_price=0, max_price=500)
    pb_p2 = PriceBand(code="P2", name="₽₽", min_price=500, max_price=1500)
    pb_p3 = PriceBand(code="P3", name="₽₽₽", min_price=1500, max_price=3000)
    pb_p4 = PriceBand(code="P4", name="₽₽₽₽", min_price=3000, max_price=10000)

    s.add_all(
        [
            cat_rest, cat_cafe,
            cui_yakut, cui_italian,
            diet_veg,
            am_wifi, am_terrace,
            et_concert, et_quiz,
            ag_0, ag_18,
            pb_p1, pb_p2, pb_p3, pb_p4,
        ]
    )
    await s.flush()

    # Хеши приходят уже готовые — считать их в каждом тесте слишком дорого.
    admin_hash = hashes["admin"]
    partner_hash = hashes["partner"]
    partner2_hash = hashes["partner2"]
    inactive_hash = hashes["inactive"]

    cheap_cafe = Place(
        name="Лена Кафе",
        address="пр. Ленина, 1",
        latitude=62.0282,
        longitude=129.7300,
        category=cat_cafe,
        price_band=pb_p1,
        cuisines=[cui_yakut],
        diet_tags=[diet_veg],
        amenities=[am_wifi],
        upsell_highlights=["Wi-Fi", "Авторские десерты"],
        rating_2gis=4.3,
    )
    mid_italian = Place(
        name="Италиано",
        address="ул. Кирова, 10",
        latitude=62.0290,
        longitude=129.7310,
        category=cat_rest,
        price_band=pb_p2,
        cuisines=[cui_italian],
        amenities=[am_terrace],
        upsell_highlights=["Веранда с видом"],
        rating_2gis=4.5,
    )
    premium_yakut = Place(
        name="Тыгын Дархан",
        address="пр. Ленина, 5",
        latitude=62.0270,
        longitude=129.7280,
        category=cat_rest,
        price_band=pb_p4,
        cuisines=[cui_yakut, cui_italian],
        amenities=[am_terrace, am_wifi],
        upsell_highlights=["Живая музыка по выходным", "Панорамный зал"],
        rating_2gis=4.7,
    )
    s.add_all([cheap_cafe, mid_italian, premium_yakut])
    await s.flush()

    s.add_all(
        [
            User(
                email=ADMIN_EMAIL,
                password_hash=admin_hash,
                name="Test Admin",
                role=UserRole.ADMIN,
            ),
            User(
                email=PARTNER_EMAIL,
                password_hash=partner_hash,
                name="Test Partner",
                role=UserRole.PARTNER,
                place_id=cheap_cafe.id,
            ),
            User(
                email=PARTNER2_EMAIL,
                password_hash=partner2_hash,
                name="Test Partner 2",
                role=UserRole.PARTNER,
                place_id=mid_italian.id,  # ДРУГОЕ заведение
            ),
            User(
                email=INACTIVE_EMAIL,
                password_hash=inactive_hash,
                name="Inactive",
                role=UserRole.PARTNER,
                place_id=mid_italian.id,
                is_active=False,
            ),
        ]
    )

    now = datetime.now(timezone.utc)
    s.add_all(
        [
            Event(
                title="Концерт в Лене",
                place=cheap_cafe,
                event_type=et_concert,
                age_group=ag_0,
                price=500,
                starts_at=now + timedelta(days=1),
            ),
            Event(
                title="Большой концерт",
                place=premium_yakut,
                event_type=et_concert,
                age_group=ag_0,
                price=1500,
                starts_at=now + timedelta(days=7),
            ),
            Event(
                title="Квиз для взрослых",
                place=None,
                event_type=et_quiz,
                age_group=ag_18,
                price=300,
                starts_at=now + timedelta(days=2),
            ),
        ]
    )


async def _seed_upsell(s: AsyncSession) -> None:
    """Сид специально под алгоритм апселла.

    Ценовые сегменты: P1 (0-500), P2 (500-1500), P3 (1500-3000), P4 (3000-10000).
    При budget=1499 верхняя граница апселла = 1798, поэтому в окно (1499; 1798]
    попадают все P3 (min_price=1500). Их 6 — лимит апселла (5) должен сработать.
    """
    cat_rest = Category(code="restaurant", name="Ресторан")
    cat_cafe = Category(code="cafe", name="Кафе")

    cui_yakut = Cuisine(code="yakut", name="Якутская")
    cui_european = Cuisine(code="european", name="Европейская")

    pb_p1 = PriceBand(code="P1", name="₽", min_price=0, max_price=500)
    pb_p2 = PriceBand(code="P2", name="₽₽", min_price=500, max_price=1500)
    pb_p3 = PriceBand(code="P3", name="₽₽₽", min_price=1500, max_price=3000)
    pb_p4 = PriceBand(code="P4", name="₽₽₽₽", min_price=3000, max_price=10000)

    s.add_all([cat_rest, cat_cafe, cui_yakut, cui_european, pb_p1, pb_p2, pb_p3, pb_p4])
    await s.flush()

    cheap = Place(
        name="Дешёвое кафе",
        address="ул. 1, 1",
        latitude=62.0, longitude=129.7,
        category=cat_cafe, price_band=pb_p1, cuisines=[cui_yakut],
        rating_2gis=4.0,
    )
    mid = Place(
        name="Среднее место",
        address="ул. 2, 2",
        latitude=62.0, longitude=129.7,
        category=cat_rest, price_band=pb_p2, cuisines=[cui_yakut],
        rating_2gis=4.2,
    )
    s.add_all([cheap, mid])

    p3_data = [
        ("P3 Премиум-1", 4.8, ["Шеф с международным опытом", "Сезонное меню"]),
        ("P3 Премиум-2", 4.7, ["Живая музыка по выходным"]),
        ("P3 Премиум-3", 4.6, ["Веранда с видом на Лену"]),
        ("P3 Премиум-4", 4.5, []),
        ("P3 Премиум-5", 4.2, ["Авторская подача"]),
        ("P3 Премиум-6", None, []),
    ]
    for name, rating, highlights in p3_data:
        s.add(Place(
            name=name,
            address=f"ул. {name}",
            latitude=62.0, longitude=129.7,
            category=cat_rest,
            price_band=pb_p3,
            cuisines=[cui_european],
            rating_2gis=rating,
            upsell_highlights=highlights,
        ))

    s.add(Place(
        name="P4 Только для богатых",
        address="ул. P4",
        latitude=62.0, longitude=129.7,
        category=cat_rest, price_band=pb_p4, cuisines=[cui_yakut],
        rating_2gis=4.9,
    ))
