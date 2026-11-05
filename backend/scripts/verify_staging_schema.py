"""Read-only verification for the Phase 1 and Phase 2 PostgreSQL schema.

Run this only with a deliberately selected staging DATABASE_URL.  It does not
apply migrations, create tables, or modify research data.
"""
from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, inspect, text


EXPECTED_REVISION = "20261105_03"
EXPECTED_TABLES = {
    "events": {"event_id", "session_id", "study_id", "participant_id", "client_timestamp", "server_timestamp", "client_sequence"},
    "study_sessions": {"session_id", "study_id", "participant_id", "server_started_at", "server_ended_at"},
    "pipeline_executions": {"execution_id", "session_id", "status", "server_started_at"},
    "affect_inference_failures": {"id", "session_id", "failure_reason", "server_timestamp"},
}


def main() -> int:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 2

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        missing_tables = sorted(set(EXPECTED_TABLES) - tables)
        if missing_tables:
            print(f"Missing required tables: {', '.join(missing_tables)}", file=sys.stderr)
            return 1

        with engine.connect() as connection:
            revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one_or_none()
        if revision != EXPECTED_REVISION:
            print(f"Expected Alembic revision {EXPECTED_REVISION}; found {revision!r}", file=sys.stderr)
            return 1

        missing_columns: list[str] = []
        for table, expected_columns in EXPECTED_TABLES.items():
            actual_columns = {column["name"] for column in inspector.get_columns(table)}
            for column in sorted(expected_columns - actual_columns):
                missing_columns.append(f"{table}.{column}")
        if missing_columns:
            print(f"Missing required columns: {', '.join(missing_columns)}", file=sys.stderr)
            return 1
    finally:
        engine.dispose()

    print(f"Schema verification passed at Alembic revision {EXPECTED_REVISION}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
