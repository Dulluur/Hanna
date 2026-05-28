from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class ClickMetric(Base):
    __tablename__ = "click_metrics"
    __table_args__ = (
        Index("idx_metrics_entity", "entity_type", "entity_id"),
        Index("idx_metrics_action", "action"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
