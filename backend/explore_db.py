#!/usr/bin/env python3
"""
Интерактивный скрипт для исследования БД (для демонстрации на защите).

Использование:
    cd backend
    python explore_db.py

Примеры команд:
    > places
    > place 2
    > users
    > sessions
    > events
    > help
    > exit
"""

import asyncio
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# Добавляем путь к app
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.models import (
    Category,
    Cuisine,
    DietTag,
    Event,
    Place,
    PlaceTopDish,
    PriceBand,
    Session as SessionModel,
    User,
)


class DBExplorer:
    def __init__(self):
        self.session: AsyncSession | None = None
        self.commands = {
            "help": self.cmd_help,
            "places": self.cmd_places,
            "place": self.cmd_place,
            "users": self.cmd_users,
            "user": self.cmd_user,
            "sessions": self.cmd_sessions,
            "events": self.cmd_events,
            "event": self.cmd_event,
            "categories": self.cmd_categories,
            "stats": self.cmd_stats,
            "exit": self.cmd_exit,
        }

    async def connect(self):
        self.session = AsyncSessionLocal()

    async def disconnect(self):
        if self.session:
            await self.session.close()

    async def cmd_help(self, *args):
        """Справка по командам"""
        print("""
╔════════════════════════════════════════════════════════════╗
║            Hanna Database Explorer (на защиту)            ║
╚════════════════════════════════════════════════════════════╝

КОМАНДЫ:
  places              → список всех мест
  place <id>          → детали конкретного места (с кухнями, блюдами)
  users               → все пользователи (админы, партнёры)
  user <id>           → детали пользователя
  sessions            → активные сессии
  events              → все события
  event <id>          → детали события
  categories          → справочник категорий
  stats               → статистика по таблицам

ПРИМЕРЫ:
  > places
  > place 2
  > users
  > event 1
  > exit

Для защиты используй эти команды, чтобы показать реальную структуру БД!
        """)

    async def cmd_places(self, *args):
        """Список всех мест"""
        places = (
            await self.session.execute(
                select(Place)
                .where(Place.is_active.is_(True))
                .order_by(Place.rating_2gis.desc().nullslast())
                .limit(10)
            )
        ).scalars().all()

        print(f"\n{'ID':<4} {'Название':<20} {'Адрес':<30} {'Рейтинг':<8} {'Статус'}")
        print("─" * 75)

        for p in places:
            status = "✓ Active" if p.is_active else "✗ Inactive"
            rating = f"{p.rating_2gis}" if p.rating_2gis else "–"
            print(
                f"{p.id:<4} {p.name[:19]:<20} {p.address[:29]:<30} {rating:<8} {status}"
            )

        print(f"\nВсего мест: {(await self.session.execute(select(func.count(Place.id)))).scalar()}")

    async def cmd_place(self, *args):
        """Детали конкретного места"""
        if not args or not args[0].isdigit():
            print("Использование: place <id>")
            return

        place_id = int(args[0])
        place = await self.session.get(Place, place_id)

        if not place:
            print(f"Место с ID {place_id} не найдено")
            return

        print(f"\n╔════════════════════════════════════════════╗")
        print(f"║  {place.name:<40} ║")
        print(f"╚════════════════════════════════════════════╝")
        print(f"ID:           {place.id}")
        print(f"Адрес:        {place.address}")
        print(f"Координаты:   ({place.latitude}, {place.longitude})")
        print(f"Рейтинг 2ГИС: {place.rating_2gis or '–'}")
        print(f"Статус:       {'✓ Active' if place.is_active else '✗ Inactive'}")

        if place.category:
            print(f"Категория:    {place.category.name}")
        if place.price_band:
            print(f"Ценовой диапазон: {place.price_band.name} ({place.price_band.min_price}–{place.price_band.max_price} ₽)")

        if place.cuisines:
            cuisine_names = ", ".join([c.name for c in place.cuisines])
            print(f"Кухни:        {cuisine_names}")

        if place.top_dishes:
            print(f"\nТоп-5 блюд:")
            for dish in place.top_dishes:
                tags = f" [{', '.join(dish.tags)}]" if dish.tags else ""
                print(f"  • {dish.name:<30} {dish.price:>4} ₽{tags}")
        else:
            print(f"\n(Нет добавленных блюд)")

    async def cmd_users(self, *args):
        """Все пользователи"""
        users = (
            await self.session.execute(
                select(User).order_by(User.created_at.desc())
            )
        ).scalars().all()

        print(f"\n{'ID':<4} {'Email':<30} {'Роль':<10} {'Place':<6} {'Статус'}")
        print("─" * 65)

        for u in users:
            place_id = str(u.place_id) if u.place_id else "–"
            status = "✓" if u.is_active else "✗"
            print(
                f"{u.id:<4} {u.email:<30} {u.role.value:<10} {place_id:<6} {status}"
            )

        print(f"\nВсего пользователей: {len(users)}")
        print(f"  • Админов: {sum(1 for u in users if u.role.value == 'admin')}")
        print(f"  • Партнёров: {sum(1 for u in users if u.role.value == 'partner')}")

    async def cmd_user(self, *args):
        """Детали пользователя"""
        if not args or not args[0].isdigit():
            print("Использование: user <id>")
            return

        user_id = int(args[0])
        user = await self.session.get(User, user_id)

        if not user:
            print(f"Пользователь с ID {user_id} не найден")
            return

        print(f"\n╔════════════════════════════════════════════╗")
        print(f"║  {user.email:<40} ║")
        print(f"╚════════════════════════════════════════════╝")
        print(f"ID:        {user.id}")
        print(f"Email:     {user.email}")
        print(f"Имя:       {user.name or '–'}")
        print(f"Роль:      {user.role.value} {'(admin)' if user.role.value == 'admin' else '(partner)'}")
        print(f"Место ID:  {user.place_id or '–'}")
        print(f"Активен:   {'✓ Да' if user.is_active else '✗ Нет'}")
        print(f"Создан:    {user.created_at.strftime('%Y-%m-%d %H:%M')}")

        # Показать связанное место
        if user.place_id:
            place = await self.session.get(Place, user.place_id)
            if place:
                print(f"\nУправляет местом: {place.name}")

    async def cmd_sessions(self, *args):
        """Активные сессии"""
        sessions = (
            await self.session.execute(
                select(SessionModel).order_by(SessionModel.expires_at.desc())
            )
        ).scalars().all()

        print(f"\n{'User ID':<8} {'Token (first 20 chars)':<25} {'Expires':<20} {'IP'}")
        print("─" * 70)

        for sess in sessions:
            token_short = sess.id[:20] + "..."
            expires = sess.expires_at.strftime("%Y-%m-%d %H:%M")
            ip = sess.ip_address or "–"
            print(f"{sess.user_id:<8} {token_short:<25} {expires:<20} {ip}")

        print(f"\nВсего сессий: {len(sessions)}")

    async def cmd_events(self, *args):
        """Все события"""
        events = (
            await self.session.execute(
                select(Event).where(Event.is_active.is_(True)).order_by(Event.starts_at)
            )
        ).scalars().all()

        print(f"\n{'ID':<4} {'Название':<30} {'Место':<15} {'Цена':<7} {'Дата'}")
        print("─" * 70)

        for e in events:
            place_name = e.place.name[:14] if e.place else "–"
            date_str = e.starts_at.strftime("%Y-%m-%d")
            print(f"{e.id:<4} {e.title[:29]:<30} {place_name:<15} {e.price or '–':<7} {date_str}")

        print(f"\nВсего событий: {len(events)}")

    async def cmd_event(self, *args):
        """Детали события"""
        if not args or not args[0].isdigit():
            print("Использование: event <id>")
            return

        event_id = int(args[0])
        event = await self.session.get(Event, event_id)

        if not event:
            print(f"Событие с ID {event_id} не найдено")
            return

        print(f"\n╔════════════════════════════════════════════╗")
        print(f"║  {event.title:<40} ║")
        print(f"╚════════════════════════════════════════════╝")
        print(f"ID:        {event.id}")
        print(f"Начало:    {event.starts_at.strftime('%Y-%m-%d %H:%M')}")
        if event.ends_at:
            print(f"Конец:     {event.ends_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"Цена:      {event.price or '–'} ₽")
        print(f"Описание:   {event.description or '–'}")

        if event.place:
            print(f"\nСвязанное место: {event.place.name} (ID {event.place.id})")
            if event.place.price_band:
                total = (event.price or 0) + event.place.price_band.min_price
                print(f"  → Билет + минимум ужина: {total} ₽")

        if event.ticket_url:
            print(f"Ссылка на билеты: {event.ticket_url}")

    async def cmd_categories(self, *args):
        """Справочник категорий"""
        categories = (
            await self.session.execute(select(Category))
        ).scalars().all()

        print(f"\n{'ID':<4} {'Code':<12} {'Name':<20}")
        print("─" * 40)

        for cat in categories:
            print(f"{cat.id:<4} {cat.code:<12} {cat.name:<20}")

    async def cmd_stats(self, *args):
        """Статистика по таблицам"""
        print("\n╔════════════════════════════════════════════╗")
        print("║  Статистика БД Hanna                       ║")
        print("╚════════════════════════════════════════════╝")

        counts = {
            "Места (is_active=true)": (
                await self.session.execute(
                    select(func.count()).select_from(Place).where(Place.is_active.is_(True))
                )
            ).scalar(),
            "События (is_active=true)": (
                await self.session.execute(
                    select(func.count()).select_from(Event).where(Event.is_active.is_(True))
                )
            ).scalar(),
            "Пользователи": (
                await self.session.execute(select(func.count()).select_from(User))
            ).scalar(),
            "Сессии": (
                await self.session.execute(select(func.count()).select_from(SessionModel))
            ).scalar(),
            "Блюда (top_dishes)": (
                await self.session.execute(select(func.count()).select_from(PlaceTopDish))
            ).scalar(),
        }

        for label, count in counts.items():
            print(f"{label:<30} {count:>5}")

    async def cmd_exit(self, *args):
        """Выход"""
        await self.disconnect()
        print("\nУдачи на защите! 🚀")
        sys.exit(0)

    async def run(self):
        """Главный цикл"""
        await self.connect()

        print("""
╔═══════════════════════════════════════════════════════════╗
║  Hanna Database Explorer — Для демонстрации на защиту    ║
╚═══════════════════════════════════════════════════════════╝

Введи команду (help для справки):
        """)

        try:
            while True:
                try:
                    cmd_input = input("\n> ").strip()
                    if not cmd_input:
                        continue

                    parts = cmd_input.split()
                    cmd = parts[0].lower()
                    args = parts[1:] if len(parts) > 1 else ()

                    if cmd in self.commands:
                        await self.commands[cmd](*args)
                    else:
                        print(f"Неизвестная команда: {cmd}. Введи 'help'.")

                except KeyboardInterrupt:
                    await self.cmd_exit()

        except Exception as e:
            print(f"Ошибка: {e}")
            await self.disconnect()


async def main():
    explorer = DBExplorer()
    await explorer.run()


if __name__ == "__main__":
    asyncio.run(main())
