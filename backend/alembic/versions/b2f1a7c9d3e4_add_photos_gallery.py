"""add photos gallery to places and events

Revision ID: b2f1a7c9d3e4
Revises: d780395b5657
Create Date: 2026-06-07 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2f1a7c9d3e4'
down_revision: Union[str, Sequence[str], None] = 'd780395b5657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'places',
        sa.Column(
            'photos',
            postgresql.ARRAY(sa.Text()),
            server_default='{}',
            nullable=False,
        ),
    )
    op.add_column(
        'events',
        sa.Column(
            'photos',
            postgresql.ARRAY(sa.Text()),
            server_default='{}',
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('events', 'photos')
    op.drop_column('places', 'photos')
