"""Add persistent study management and the default testing study."""
from alembic import op
import sqlalchemy as sa

revision = "20261107_05"
down_revision = "20261106_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("studies", sa.Column("study_id", sa.String(), primary_key=True), sa.Column("name", sa.String(), nullable=False), sa.Column("description", sa.String(), nullable=True), sa.Column("status", sa.String(), nullable=False), sa.Column("created_at", sa.String(), nullable=False), sa.Column("started_at", sa.String(), nullable=True), sa.Column("stopped_at", sa.String(), nullable=True))
    for column in ("status", "created_at", "started_at", "stopped_at"):
        op.create_index(f"ix_studies_{column}", "studies", [column])
    op.execute("CREATE UNIQUE INDEX uq_active_formal_study ON studies (status) WHERE status = 'active' AND study_id <> '0000'")
    op.execute("INSERT INTO studies (study_id, name, description, status, created_at) VALUES ('0000', 'Testing / Development', 'Development, demonstrations, and informal testing.', 'system-default', CURRENT_TIMESTAMP) ON CONFLICT (study_id) DO NOTHING")


def downgrade() -> None:
    op.drop_index("uq_active_formal_study", table_name="studies")
    op.drop_table("studies")
