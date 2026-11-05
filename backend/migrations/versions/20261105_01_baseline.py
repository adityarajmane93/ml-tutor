"""Create the pre-Phase-1 application schema for new databases.

Existing deployments that were created with Base.metadata.create_all must be
stamped at this revision before applying later migrations; this avoids touching
or recreating existing research rows.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261105_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("events", sa.Column("event_id", sa.String(), primary_key=True), sa.Column("session_id", sa.String()), sa.Column("timestamp", sa.String()), sa.Column("event_type", sa.String()), sa.Column("action", sa.String()), sa.Column("source", sa.String()), sa.Column("schema_version", sa.String()), sa.Column("event_metadata", sa.JSON()))
    op.create_index("ix_events_event_id", "events", ["event_id"])
    op.create_table("samm_records", sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True), sa.Column("session_id", sa.String()), sa.Column("timestamp", sa.String()), sa.Column("time_taken_to_answer", sa.Integer()), sa.Column("valence", sa.Float()), sa.Column("arousal", sa.Float()), sa.Column("dominance", sa.Float()))
    op.create_index("ix_samm_records_id", "samm_records", ["id"])
    op.create_index("ix_samm_records_session_id", "samm_records", ["session_id"])
    op.create_index("ix_samm_records_timestamp", "samm_records", ["timestamp"])
    op.create_table("affect_logs", sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True), sa.Column("session_id", sa.String()), sa.Column("timestamp", sa.String()), sa.Column("valence", sa.Float()), sa.Column("arousal", sa.Float()))
    op.create_index("ix_affect_logs_id", "affect_logs", ["id"])
    op.create_index("ix_affect_logs_session_id", "affect_logs", ["session_id"])
    op.create_table("rppg_logs", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.String()), sa.Column("timestamp", sa.String()), sa.Column("bpm", sa.Float()))
    op.create_index("ix_rppg_logs_session_id", "rppg_logs", ["session_id"])
    op.create_table("notes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.String()), sa.Column("node_type", sa.String()), sa.Column("highlighted_text", sa.String(), nullable=True), sa.Column("start_index", sa.Integer(), nullable=True), sa.Column("end_index", sa.Integer(), nullable=True), sa.Column("custom_note", sa.String(), nullable=True), sa.Column("timestamp", sa.String()))
    op.create_index("ix_notes_id", "notes", ["id"])
    op.create_index("ix_notes_session_id", "notes", ["session_id"])
    op.create_table("consent_forms", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("session_id", sa.String()), sa.Column("p1_participant_name", sa.String()), sa.Column("p1_date", sa.String()), sa.Column("p2_child_name", sa.String()), sa.Column("p2_audio_consent", sa.String()), sa.Column("p2_video_consent", sa.String()), sa.Column("p2_interview_consent", sa.String()), sa.Column("p2_guardian_signature", sa.String()), sa.Column("p2_date", sa.String()), sa.Column("p3_child_name", sa.String(), nullable=True), sa.Column("p3_guardian_name", sa.String(), nullable=True), sa.Column("p3_child_signature", sa.String()), sa.Column("p3_guardian_signature", sa.String()), sa.Column("p3_date", sa.String()))
    op.create_index("ix_consent_forms_id", "consent_forms", ["id"])
    op.create_index("ix_consent_forms_session_id", "consent_forms", ["session_id"])


def downgrade() -> None:
    op.drop_table("consent_forms")
    op.drop_table("notes")
    op.drop_table("rppg_logs")
    op.drop_table("affect_logs")
    op.drop_table("samm_records")
    op.drop_table("events")
