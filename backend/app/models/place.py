from datetime import datetime
from decimal import Decimal

from sqlalchemy import(
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Table,
    Text,
    func,
)

from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.reference import AmenityTag, Category, Cuisine, DietTag, PriceBand

place_cuisines = Table(
    "place_cuisines",
    Base.metadata,
    Column("place_id", Integer, ForeignKey("places.id", ondelete="CASCADE"),
    primary_key=True),
    Column("cuisine_id", Integer, ForeignKey("cuisines.id",
    ondelete="CASCADE"), primary_key=True),
)

place_diet_tags = Table(
    "place_diet_tags",
    Base.metadata,
    Column("place_id", Integer, ForeignKey("places.id", ondelete="CASCADE"),
    primary_key=True),
    Column("diet_tag_id", Integer, ForeignKey("diet_tags.id",
    ondelete="CASCADE"), primary_key=True),
)

place_amenities = Table(
    "place_amenities",
    Base.metadata,
    Column("place_id", Integer, ForeignKey("places.id", ondelete="CASCADE"),
    primary_key=True),
    Column("amenity_id", Integer, ForeignKey("amenity_tags.id", ondelete="CASCADE"), primary_key=True),
)

class Place(Base):
    __tablename__ = "places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10,7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10,7), nullable=False)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL")
    )
    price_band_id: Mapped[int | None] = mapped_column(
        ForeignKey("price_bands.id", ondelete="SET NULL")
    )
    work_hours: Mapped[dict | str | None] = mapped_column(JSONB)
    photo_url: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(Text)
    rating_2gis: Mapped[Decimal | None] = mapped_column(Numeric(2,1))
    upsell_highlights: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    category: Mapped[Category | None] = relationship(lazy="joined")
    price_band: Mapped[PriceBand | None] = relationship(lazy="joined")
    cuisines: Mapped[list[Cuisine]] = relationship(secondary=place_cuisines, lazy="selectin")
    diet_tags: Mapped[list[DietTag]] = relationship(secondary=place_diet_tags, lazy="selectin")
    amenities: Mapped[list[AmenityTag]] = relationship(secondary=place_amenities, lazy="selectin")
    top_dishes: Mapped[list["PlaceTopDish"]] = relationship(
        back_populates="place",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="PlaceTopDish.sort_order"
    )

    def __str__(self) -> str:
        return self.name

class PlaceTopDish(Base):
    __tablename__ = "place_top_dishes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[int]  = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False,
    server_default="0")

    weight: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default="{}"
    )

    place: Mapped[Place] = relationship(back_populates="top_dishes")

    def __str__(self) -> str:
        return f"{self.name} - {self.price} ₽"
