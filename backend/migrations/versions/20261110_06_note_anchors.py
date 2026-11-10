"""Add resource-level text anchors for Learn highlights.

Apply with: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

revision = "20261110_06"
down_revision = "20261107_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("highlight_anchor", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("notes", "highlight_anchor")
