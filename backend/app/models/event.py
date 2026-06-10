from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.place import Place
from app.models.reference import AgeGroup, EventType

class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    place_id: Mapped[int | None] = mapped_column(
        ForeignKey("places.id", ondelete="SET NULL")
    )
    event_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("event_types.id", ondelete="SET NULL")
    )
    age_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("age_groups.id", ondelete="SET NULL")
    )
    price: Mapped[int | None] = mapped_column(Integer)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
    nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ticket_url: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(Text)
    photos: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default="{}"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    place: Mapped[Place | None] = relationship(lazy="joined")
    event_type: Mapped[EventType | None] = relationship(lazy="joined")
    age_group: Mapped[AgeGroup | None] = relationship(lazy="joined")

    def __str__(self) -> str:
        return f"{self.title} ({self.starts_at:%d.%m %H:%M})"
