# Local development

Set non-secret development values in your shell (do not commit an `.env` file):

```bash
export INTERNAL_SERVICE_API_KEY=local-internal-key
export RESEARCHER_API_KEY=local-researcher-key
export CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Run migrations against a local database from `backend/` with `alembic -c alembic.ini upgrade head`.

For Docker Compose:

```bash
docker compose up --build
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

Compose runs PostgreSQL, Core API on port 8000, and two private in-network services. Initial estimates requiring benchmark verification: Core 0.5–1 GB RAM; ML 1–2 GB RAM and 1–2 vCPU; Affect 2–4 GB RAM and 2 vCPU on CPU. HSEmotion cold start can be substantially longer than Core startup.
