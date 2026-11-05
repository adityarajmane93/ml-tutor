"""Add persistent study sessions and Phase-1 telemetry fields.

All added fields are nullable for existing records. This migration adds schema
only and never deletes or rewrites research data.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261105_02"
down_revision = "20261105_01"
branch_labels = None
depends_on = None


def _add_context_columns(table: str, include_sequence: bool = False) -> None:
    op.add_column(table, sa.Column("study_id", sa.String(), nullable=True))
    op.add_column(table, sa.Column("participant_id", sa.String(), nullable=True))
    op.add_column(table, sa.Column("client_timestamp", sa.String(), nullable=True))
    op.add_column(table, sa.Column("server_timestamp", sa.String(), nullable=True))
    op.create_index(f"ix_{table}_study_id", table, ["study_id"])
    op.create_index(f"ix_{table}_participant_id", table, ["participant_id"])
    op.create_index(f"ix_{table}_server_timestamp", table, ["server_timestamp"])
    if include_sequence:
        op.add_column(table, sa.Column("client_sequence", sa.Integer(), nullable=True))


def upgrade() -> None:
    _add_context_columns("events", include_sequence=True)
    _add_context_columns("samm_records")
    _add_context_columns("affect_logs")
    _add_context_columns("rppg_logs")
    op.create_table(
        "study_sessions",
        sa.Column("session_id", sa.String(), primary_key=True),
        sa.Column("study_id", sa.String(), nullable=False),
        sa.Column("participant_id", sa.String(), nullable=False),
        sa.Column("client_started_at", sa.String(), nullable=True),
        sa.Column("server_started_at", sa.String(), nullable=False),
        sa.Column("client_ended_at", sa.String(), nullable=True),
        sa.Column("server_ended_at", sa.String(), nullable=True),
    )
    op.create_index("ix_study_sessions_study_id", "study_sessions", ["study_id"])
    op.create_index("ix_study_sessions_participant_id", "study_sessions", ["participant_id"])
    op.create_index("ix_study_sessions_server_started_at", "study_sessions", ["server_started_at"])
    op.create_index("ix_study_sessions_server_ended_at", "study_sessions", ["server_ended_at"])
    op.create_table(
        "pipeline_executions",
        sa.Column("execution_id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("study_id", sa.String(), nullable=True),
        sa.Column("participant_id", sa.String(), nullable=True),
        sa.Column("client_started_at", sa.String(), nullable=True),
        sa.Column("server_started_at", sa.String(), nullable=False),
        sa.Column("server_completed_at", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("request_metadata", sa.JSON(), nullable=True),
        sa.Column("result_metadata", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
    )
    for column in ("session_id", "study_id", "participant_id", "server_started_at", "server_completed_at"):
        op.create_index(f"ix_pipeline_executions_{column}", "pipeline_executions", [column])


def downgrade() -> None:
    op.drop_table("pipeline_executions")
    op.drop_table("study_sessions")
    # Downgrading removes only Phase-1 columns, never rows.
    for table in ("rppg_logs", "affect_logs", "samm_records", "events"):
        for column in ("server_timestamp", "participant_id", "study_id", "client_timestamp"):
            op.drop_column(table, column)
    op.drop_column("events", "client_sequence")
