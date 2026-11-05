#!/usr/bin/env bash
# Applies the versioned schema only to an explicitly supplied staging database.
set -euo pipefail

if [[ "${ALLOW_STAGING_DB_MIGRATION:-}" != "1" ]]; then
  echo "Refusing to run: set ALLOW_STAGING_DB_MIGRATION=1 after confirming this is staging." >&2
  exit 2
fi

if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  echo "STAGING_DATABASE_URL is required; do not point it at production." >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root/backend"

DATABASE_URL="$STAGING_DATABASE_URL" alembic current
DATABASE_URL="$STAGING_DATABASE_URL" alembic upgrade head
DATABASE_URL="$STAGING_DATABASE_URL" python scripts/verify_staging_schema.py
