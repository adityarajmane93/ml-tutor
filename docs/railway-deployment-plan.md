# Railway Amsterdam deployment plan

Create three Railway services from this repository: Core uses `backend/Dockerfile`; ML uses `services/ml_execution/Dockerfile`; Affect uses `services/affect_inference/Dockerfile`. Attach PostgreSQL only to Core. Configure ML/Affect URLs as Railway private service URLs, not public domains.

Set `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `RESEARCHER_API_KEY`, `INTERNAL_SERVICE_API_KEY`, `ML_EXECUTION_SERVICE_URL`, and `AFFECT_INFERENCE_SERVICE_URL` in Railway variables. Run Alembic as an explicit release/pre-deploy operation; do not run migrations against production until backup and review are complete.

Initial deployment should use one worker per service. Set ML concurrency to 1–2 and Affect concurrency to 1, then benchmark representative study traffic. Railway health checks should call `/health`; Core readiness visibility should monitor `/ready`. Before deployment, validate private networking, HSEmotion model download/provenance, WebSocket behavior, memory headroom, and restart behavior.
