"""Make session-only clients compatible and add browser gaze storage."""
from alembic import op
import sqlalchemy as sa

revision = "20261106_04"
down_revision = "20261105_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Legacy values and indexes remain intact; new session-only clients write NULL.
    op.alter_column("study_sessions", "study_id", existing_type=sa.String(), nullable=True)
    op.alter_column("study_sessions", "participant_id", existing_type=sa.String(), nullable=True)
    op.create_table(
        "gaze_calibrations",
        sa.Column("calibration_id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("started_at", sa.String(), nullable=False),
        sa.Column("completed_at", sa.String(), nullable=True),
        sa.Column("viewport_width", sa.Integer(), nullable=False),
        sa.Column("viewport_height", sa.Integer(), nullable=False),
        sa.Column("calibration_metadata", sa.JSON(), nullable=True),
        sa.Column("validation_metadata", sa.JSON(), nullable=True),
        sa.Column("median_error_px", sa.Float(), nullable=True),
        sa.Column("mean_error_px", sa.Float(), nullable=True),
        sa.Column("quality_status", sa.String(), nullable=False),
    )
    op.create_index("ix_gaze_calibrations_session_id", "gaze_calibrations", ["session_id"])
    op.create_table(
        "gaze_samples",
        sa.Column("sample_id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("client_timestamp", sa.String(), nullable=False),
        sa.Column("server_timestamp", sa.String(), nullable=False),
        sa.Column("elapsed_ms", sa.Integer(), nullable=False),
        sa.Column("x", sa.Float(), nullable=True),
        sa.Column("y", sa.Float(), nullable=True),
        sa.Column("viewport_width", sa.Integer(), nullable=False),
        sa.Column("viewport_height", sa.Integer(), nullable=False),
        sa.Column("route", sa.String(), nullable=False),
        sa.Column("aoi_type", sa.String(), nullable=False),
        sa.Column("aoi_id", sa.String(), nullable=True),
        sa.Column("calibration_id", sa.String(), nullable=True),
        sa.Column("validity_metadata", sa.JSON(), nullable=True),
    )
    for column in ("session_id", "server_timestamp", "calibration_id"):
        op.create_index(f"ix_gaze_samples_{column}", "gaze_samples", [column])


def downgrade() -> None:
    op.drop_table("gaze_samples")
    op.drop_table("gaze_calibrations")
    # Do not restore NOT NULL constraints: session-only rows may now exist.
