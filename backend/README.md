# Research dashboard access

The `/research` frontend route uses the Core API's researcher-only, read-only
endpoints. Configure `RESEARCHER_API_KEY` on the Core API with a long random
value before exposing the route, for example:

```bash
openssl rand -hex 32
```

Set the generated value as `RESEARCHER_API_KEY` in the backend environment.
It must not be added to a frontend `.env` file or prefixed with `VITE_`.

Researchers enter that key directly on `/research`; it is kept only in the
current React page state and is sent as the `X-Researcher-Key` request header.
Refreshing the page requires re-authentication. The learner-facing routes do
not use this credential.

For production, ensure `CORS_ALLOWED_ORIGINS` includes the Vercel frontend
origin. `frontend/vercel.json` already rewrites `/research` to the SPA entry
point, so direct navigation and refresh resolve to the route.

## Study management migration

Study management requires Alembic revision `20261107_05`. With the target
Neon `DATABASE_URL` supplied only in the backend environment, review the
current revision and apply it deliberately:

```bash
cd backend
alembic current
alembic upgrade 20261107_05
```

The migration is additive. It creates the `studies` table, enforces one active
formal study in PostgreSQL, and inserts the permanent `0000` Testing /
Development study idempotently. It does not modify historical sessions with a
NULL study ID.
