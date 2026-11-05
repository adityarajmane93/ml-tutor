"""Add additive audit records for failed affect inference requests."""
from alembic import op
import sqlalchemy as sa

revision = "20261105_03"
down_revision = "20261105_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "affect_inference_failures",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("study_id", sa.String(), nullable=True),
        sa.Column("participant_id", sa.String(), nullable=True),
        sa.Column("timestamp", sa.String(), nullable=True),
        sa.Column("client_timestamp", sa.String(), nullable=True),
        sa.Column("server_timestamp", sa.String(), nullable=False),
        sa.Column("failure_reason", sa.String(), nullable=False),
    )
    for column in ("id", "session_id", "study_id", "participant_id", "server_timestamp"):
        op.create_index(f"ix_affect_inference_failures_{column}", "affect_inference_failures", [column])


def downgrade() -> None:
    op.drop_table("affect_inference_failures")
