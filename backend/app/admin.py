from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request
from wtforms import PasswordField, StringField

from app.auth.passwords import hash_password, verify_password
from app.auth.sessions import create_session, delete_session, get_user_by_session
from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import(
    AgeGroup,
    AmenityTag,
    Category,
    ClickMetric,
    Cuisine,
    DietTag,
    Event,
    EventType,
    Place,
    PlaceTopDish,
    PriceBand,
    Session,
    User,
    UserRole,
)

ADMIN_SESSION_KEY = "sid"


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) ->bool:
        form = await request.form()
        email = form.get("username", "")
        password = form.get("password", "")

        async with AsyncSessionLocal() as db:
            user = (
                await db.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()

            if (
                user is None
                or not user.is_active
                or user.role != UserRole.ADMIN
                or not verify_password(password, user.password_hash)
            ):
                return False


            sess = await create_session(
                db,
                user,
                user_agent=request.headers.get("user-agent"),
                ip=request.client.host if request.client else None,
            )
            await db.commit()

        request.session.update({ADMIN_SESSION_KEY: sess.id})
        return True

    async def logout(self, request: Request) -> bool:
        sid = request.session.pop(ADMIN_SESSION_KEY, None)
        if sid:
            async with AsyncSessionLocal() as db:
                await delete_session(db, sid)
                await db.commit()
        return True

    async def authenticate(self, request: Request) -> bool:
        sid = request.session.get(ADMIN_SESSION_KEY)
        if not sid:
            return False

        async with AsyncSessionLocal() as db:
            user = await get_user_by_session(db, sid)
            if user is None or user.role != UserRole.ADMIN:
                return False
            await db.commit()
        return True


class PlaceAdmin(ModelView, model=Place):
    name = "Заведение"
    name_plural = "Заведения"
    icon = "fa-solid fa-utensils"

    column_list = [
        Place.id, Place.name, Place.address, Place.category,
        Place.price_band, Place.rating_2gis, Place.is_active,
    ]
    column_searchable_list = [Place.name, Place.address]
    column_sortable_list = [Place.id, Place.name, Place.rating_2gis]
    form_excluded_columns = [Place.created_at, Place.updated_at]

    form_extra_fields = {
        "coords_paste": StringField(
            description=(
                "Например: 62.0282, 129.7355. Если заполнено - "
                "перезапишет поля latitude/longtitude ниже."
            ),
        ),
    }

    async def on_model_change(
        self,
        data: dict[str, Any],
        model: Place,
        is_created: bool,
        request: Request,
    ) -> None:

        paste = (data.pop("coords_paste", "") or "").strip()
        if not paste:
            return
        parts = re.split(r"[,;\s]+", paste)
        if len(parts) < 2:
            raise ValueError(
                "Координаты: ожидаются два числа через запятую, например 62.0282, 129.7355"
            )
        try:
            lat = Decimal(parts[0])
            lon = Decimal(parts[1])
        except InvalidOperation as exc:
            raise ValueError(
                "Координаты: не получилось распознать числа."
                "Пример: 62.0282, 129.7355"
            ) from exc

        if not(-90 <= lat <=90):
            raise ValueError("Широта(lat) должна быть от -90 до 90")
        if not(-180 <= lon <=180):
            raise ValueError("Долгота (lon) должна быть от -180 до 180")
        model.latitude = lat
        model.longitude = lon


class PlaceTopDishAdmin(ModelView, model=PlaceTopDish):
    name = "Топ блюдо"
    name_plural = "Топ-блюда"
    column_list = [PlaceTopDish.id, PlaceTopDish.place, PlaceTopDish.name, PlaceTopDish.price]
    column_searchable_list = [PlaceTopDish.name]


class EventAdmin(ModelView, model=Event):
    name = "Мероприятие"
    name_plural = "Мероприятия"
    icon = "fa-solid fa-calendar"

    column_list = [
        Event.id, Event.title, Event.place, Event.event_type,
        Event.starts_at, Event.price, Event.is_active,
    ]
    column_searchable_list = [Event.title]
    column_sortable_list = [Event.starts_at, Event.price]
    form_excluded_columns = [Event.created_at, Event. updated_at]


class UserAdmin(ModelView, model=User):
    name = "Пользователь"
    name_plural = "Пользователи"
    icon = "fa-solid fa-user"

    column_list = [User.id, User.email, User.name, User.role, User.place_id, User.is_active]
    column_searchable_list = [User.email]
    form_excluded_columns = [User.created_at, User.password_hash]
    form_extra_fields = {
        "password": PasswordField(
            "Пароль",
            description=(
                "Для нового пользователя - обязательно поле."
                "При редактировании оставьте пустым, чтобы не менять пароль."
            ),
            render_kw={"autocomplete": "new-password"},
        ),
    }

    async def on_model_change(
        self,
        data: dict[str, Any],
        model: User,
        is_created: bool,
        request: Request,
    ) -> None:
        pwd = (data.pop("password", "") or "").strip()
        if pwd:
            if len(pwd) < 6:
                raise ValueError("Пароль слишком короткий - минимум 6 символов")
            model.password_hash = hash_password(pwd)
        elif is_created:
            raise ValueError(
                "Укажите пароль для нового пользователя в поле «Пароль»"
            )


class SessionAdmin(ModelView, model=Session):
    name = "Сессия"
    name_plural = "Сессии"
    icon = "fa-solid fa-key"

    can_create = False
    can_edit = False
    column_list = [
        Session.id, Session.user_id, Session.created_at, Session.expires_at, Session.last_seen_at, Session.ip_address,
    ]


class _RefBase:
    can_export = True
    column_searchable_list = ["code", "name"]


class CategoryAdmin(ModelView, _RefBase, model=Category):
    name, name_plural = "Категория", "Категории"


class CuisineAdmin(ModelView, _RefBase, model=Cuisine):
    name, name_plural = "Кухня", "Кухни"


class DietTagAdmin(ModelView, _RefBase, model=DietTag):
    name, name_plural = "Диет-тег", "Диет-теги"


class AmenityTagAdmin(ModelView, _RefBase, model=AmenityTag):
    name, name_plural = "Удобство", "Удобства"


class EventTypeAdmin(ModelView, _RefBase, model=EventType):
    name, name_plural = "Тип события", "Типы событий"


class AgeGroupAdmin(ModelView, _RefBase, model=AgeGroup):
    name, name_plural = "Возрастная группа", "Возрастные группы"


class PriceBandAdmin(ModelView, _RefBase, model=PriceBand):
    name, name_plural = "Ценовой сегмент", "Ценовые сегменты"


class ClickMetricAdmin(ModelView, model=ClickMetric):
    name, name_plural = "Метрика клика", "Метрики кликов"
    icon = "fa-solid fa-chart-line"
    can_create = False
    can_edit = False
    column_list = [
        ClickMetric.id, ClickMetric.entity_type, ClickMetric.entity_id,
        ClickMetric.action, ClickMetric.created_at,
    ]


def setup_admin(app) -> Admin:
    admin = Admin(
        app,
        engine,
        authentication_backend=AdminAuth(secret_key=settings.secret_key),
        title="Hanna Admin",
        base_url="/admin",
    )

    admin.add_view(PlaceAdmin)
    admin.add_view(PlaceTopDishAdmin)
    admin.add_view(EventAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(SessionAdmin)

    admin.add_view(CategoryAdmin)
    admin.add_view(CuisineAdmin)
    admin.add_view(DietTagAdmin)
    admin.add_view(AmenityTagAdmin)
    admin.add_view(EventTypeAdmin)
    admin.add_view(AgeGroupAdmin)
    admin.add_view(PriceBandAdmin)

    admin.add_view(ClickMetricAdmin)
    return admin
