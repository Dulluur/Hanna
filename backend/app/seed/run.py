import asyncio
from datetime import datetime
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.passwords import hash_password
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import(
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

SEED_DIR = Path(__file__).parent

CATEGORIES = [
    ("restaurant", "Ресторан"),
    ("cafe", "Кафе"),
    ("bar", "Бар"),
    ("coffee", "Кофейня"),
    ("fastfood", "Фастфуд"),
    ("canteen", "Столовая"),
    ("venue", "Площадка"),
]

CUISINES = [
    ("yakut", "Якутская"),
    ("european", "Европейская"),
    ("asian", "Азиатская"),
    ("japanese", "Японская"),
    ("chinese", "Китайская"),
    ("italian", "Итальянская"),
    ("georgian", "Грузинская"),
    ("russian", "Русская"),
    ("mixed", "Смешанная"),
]

DIET_TAGS = [
    ('vegetarian', 'Вегетерианское'),
    ('vegan', 'Веганское'),
    ('halal', 'Халяль'),
    ('gluten_free', 'Без глютена'),
    ('lactose_free', 'Без лактозы'),
    ('kids_menu', 'Детское меню'),
    ('lent', 'Постное меню'),
]

AMENITY_TAGS = [
    ('wifi', 'Wi-Fi'),
    ('kids_zone', 'Детская зона'),
    ('terrace', 'Веранда'),
    ('live_music', 'Живая музыка'),
    ('parking', 'Парковка'),
    ('wheelchair', 'Доступная среда'),
    ('private_room', 'Отдельная комната'),
    ('pet_friendly', 'Можно с животными'),
]

EVENT_TYPES = [
    ('concert', 'Концерт'),
    ('movie', 'Кино'),
    ('theatre','Спектакль'),
    ('quiz', 'Квиз'),
    ('exhibition', 'Выставка'),
    ('masterclass', 'Мастер-класс'),
    ('sport', 'Спорт'),
    ('lecture', 'Лекция'),
    ('festival', 'Фестиваль'),
]

AGE_GROUPS = [
    ('0+', '0+', 0),
    ('6+', '6+', 6),
    ('12+', '12+', 12),
    ('16+', '16+', 16),
    ('18+', '18+', 18),
]

PRICE_BANDS = [
    ('P1', '₽', 0, 500),
    ('P2', '₽₽', 500, 1500),
    ('P3', '₽₽₽', 1500, 3000),
    ('P4', '₽₽₽₽', 3000, 10000),
]


async def _upsert(session: AsyncSession, model, columns: list[str], rows:list[tuple]) -> None:
    for row in rows:
        values = dict(zip(columns, row, strict=True))
        stmt = pg_insert(model).values(**values)
        update_cols = {c: stmt.excluded[c] for c in columns if c !="code"}
        stmt = stmt.on_conflict_do_update(index_elements=["code"],
        set_=update_cols)
        await session.execute(stmt)


async def seed_dictionaries(session: AsyncSession) -> None:
    await _upsert(session, Category, ["code", "name"], CATEGORIES)
    await _upsert(session, Cuisine, ["code", "name"], CUISINES)
    await _upsert(session, DietTag, ["code", "name"], DIET_TAGS)
    await _upsert(session, AmenityTag, ["code", "name"], AMENITY_TAGS)
    await _upsert(session, EventType, ["code", "name"], EVENT_TYPES)
    await _upsert(session, AgeGroup, ["code", "name", "min_age"], AGE_GROUPS)
    await _upsert(session, PriceBand, ["code", "name", "min_price", "max_price"], PRICE_BANDS)
    print("[seed] справочники: готово")

async def seed_places(session: AsyncSession) -> int:
    existing = (await session.execute(select(Place.id).limit(1))).scalar()
    if existing is not None:
        print("[seed] places: уже есть данные, пропускай")
        return 0
    data = yaml.safe_load((SEED_DIR / "places.yaml").read_text(encoding="utf-8"))

    cat_by_code = {c.code: c for c in (await session.scalars(select(Category))).all()}

    band_by_code = {b.code: b for b in (await session.scalars(select(PriceBand))).all()}

    cuisine_by_code = {c.code: c for c in (await session.scalars(select(Cuisine))).all()}

    diet_by_code = {d.code: d for d in (await session.scalars(select(DietTag))).all()}

    amenity_by_code = {a.code: a for a in (await session.scalars(select(AmenityTag))).all()}

    for item in data:
        place = Place(
            name=item["name"],
            description=item.get("description"),
            address=item["address"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            category=cat_by_code.get(item.get("category")),
            price_band=band_by_code.get(item.get("price_band")),
            work_hours=item.get("work_hours"),
            photo_url=item.get("photo_url"),
            phone=item.get("phone"),
            website=item.get("website"),
            rating_2gis=item.get("rating_2gis"),
            upsell_highlights=item.get("upsell_hightlights") or [],
            cuisines=[
                cuisine_by_code[c]
                for c in (item.get("cuisines") or [])
                if c in cuisine_by_code
            ],
            diet_tags=[
                diet_by_code[c]
                for c in (item.get("diet_tags") or [])
                if c in diet_by_code
            ],
            amenities=[
                amenity_by_code[c]
                for c in (item.get("amenities") or [])
                if c in amenity_by_code
            ],
        )
        session.add(place)

        print(f"[seed] places: загружено {len(data)}")
        return len(data)


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


async def seed_events(session: AsyncSession) -> int:
    existing = (await session.execute(select(Event.id).limit(1))).scalar()
    if existing is not None:
        print("[seed] events: уже есть данные, пропускаю")
        return 0

    data = yaml.safe_load((SEED_DIR / "events.yaml").read_text(encoding="utf-8"))

    place_by_name = {p.name: p for p in (await session.scalars(select(Place))).all()}
    type_by_code = {e.code: e for e in (await session.scalars(select(EventType))).all()}
    age_by_code = {a.code: a for a in (await session.scalars(select(AgeGroup))).all()}

    for item in data:
        place = place_by_name.get(item.get("place"))
        if item.get("place") and not place:
            print(f"[seed] events: '{item['title']}' - место '{item['place']}' не найдено, пропуск")
            continue
        event = Event(
            title=item["title"],
            description=item.get("description"),
            place=place,
            event_type=type_by_code.get(item.get("event_type")),
            age_group=age_by_code.get(item.get("age_group")),
            price=item.get("price"),
            starts_at=_parse_dt(item["starts_at"]),
            ends_at=_parse_dt(item.get("ends_at")),
            ticket_url=item.get("ticket_url"),
            photo_url=item.get("photo_url"),
        )
        session.add(event)

    print(f"[seed] events: загружено {len(data)}")
    return len(data)

async def seed_admin(session: AsyncSession) ->bool:
    existing = (
        await session.execute(select(User).where(User.email == settings.admin_email))
    ).scalar_one_or_none()
    if existing is not None:
        print(f"[seed] admin: уже существует ({settings.admin_email})")
        return False

    admin = User(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        name="Администратор",
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    print(
        f"[seed] admin: создан - email={settings.admin_email}, "
        f"пароль={settings.admin_password!r} (поменять после первого входа)"
    )
    return True


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_dictionaries(session)
        await session.commit()
        await seed_admin(session)
        await session.commit()
        await seed_places(session)
        await session.commit()
        await seed_events(session)
        await session.commit()
    print("[seed] готово")

if __name__ == "__main__":
    asyncio.run(main())
