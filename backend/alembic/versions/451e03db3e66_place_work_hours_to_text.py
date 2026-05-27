"""place_work_hours_to_text

Revision ID: 451e03db3e66
Revises: d780395b5657
Create Date: 2026-05-26 20:08:26.436994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '451e03db3e66'
down_revision: Union[str, Sequence[str], None] = 'd780395b5657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # `#>> '{}'` извлекает JSON-скаляр как чистый текст, снимая обёрточные
    # двойные кавычки. Без USING PostgreSQL не знает, как кастить JSONB к
    # TEXT, и оставил бы значения вида '"08:00-23:00"' с кавычками.
    op.alter_column(
        'places', 'work_hours',
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        existing_nullable=True,
        postgresql_using="work_hours #>> '{}'",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Обратный путь: оборачиваем строку в JSON через to_jsonb().
    op.alter_column(
        'places', 'work_hours',
        existing_type=sa.Text(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        existing_nullable=True,
        postgresql_using="to_jsonb(work_hours)",
    )
