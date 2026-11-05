# Railway staging validation

No deployment was performed as part of this preparation. Execute this checklist manually against an isolated Railway staging project and a non-production PostgreSQL database.

## Local prerequisites

```bash
cd /path/to/ml-tutor
export INTERNAL_SERVICE_API_KEY=local-internal-key
export RESEARCHER_API_KEY=local-researcher-key
export CORS_ALLOWED_ORIGINS=http://localhost:5173
cd backend && python -m unittest discover -s tests -v
cd ../frontend && npm run build
```

If Docker is available, build and start the root-context composition:

```bash
docker compose build core-api ml-execution affect-inference
docker compose up -d
curl --fail http://localhost:8000/health
curl --fail http://localhost:8000/ready
docker compose ps
docker compose restart core-api ml-execution affect-inference
docker compose logs --tail=100 core-api ml-execution affect-inference
```

Run an authenticated worker request from the Core network only. Never expose the worker port just to test it:

```bash
docker compose exec core-api python -c "import os, urllib.request; r=urllib.request.Request(os.environ['ML_EXECUTION_SERVICE_URL'] + '/health', headers={'X-Internal-Service-Key': os.environ['INTERNAL_SERVICE_API_KEY']}); print(urllib.request.urlopen(r, timeout=5).read().decode())"
```

Use the existing deterministic ML fixture in `backend/tests/test_phase2_services.py` to exercise the full execution result regression. The real-model affect test is deliberately opt-in:

```bash
RUN_REAL_HSEMOTION_TEST=1 HSE_TEST_IMAGE=/absolute/path/to/approved-test-image \
  python -m unittest backend.tests.test_affect_real_model -v
```

It must not use participant images. Record HSEmotion weights provenance, image fixture checksum, process RSS, and cold-start time with the result.

## PostgreSQL migration gates

1. Create a new, empty **staging** PostgreSQL database. Confirm its host, database name, and ownership are not production.
2. Back it up or create a provider snapshot.
3. Run `bash backend/scripts/migrate_staging_postgres.sh` with the two explicit variables described in [railway-deployment.md](railway-deployment.md). It must report revision `20261105_03` and `Schema verification passed`.
4. Re-run `alembic current` and the read-only verifier. A second `alembic upgrade head` must make no schema changes.
5. For an existing database, stop before stamping unless the baseline-schema comparison and backup have been recorded. No migration test may use production Neon.

## Railway staging gates

| Check | Expected result |
| --- | --- |
| Networking | Only `ml-tutor-api` has a public domain; workers resolve only using private DNS. |
| Health | Each `/health` returns `2xx`; Core `/ready` includes database status and worker availability without deadlocking startup. |
| Internal auth | Missing/wrong `X-Internal-Service-Key` gets `401`; correct key permits worker request. |
| CORS and WebSocket | Only configured browser origin can use protected browser/API and researcher WebSocket paths. |
| Session continuity | Refresh preserves study, participant, and session IDs; repeat start returns the existing session. |
| Telemetry durability | Disconnect/reload before an acknowledgement, reconnect, then confirm one database row per event ID with client and server timestamps. |
| Worker failure isolation | Temporarily set a worker URL to an unreachable private address in a staging-only redeploy. Core must still accept and acknowledge telemetry; failed affect inference should make an additive failure audit record. |
| ML behavior | Deterministic fixture result equals the legacy executor result; test Decision Tree, KNN, Logistic Regression and existing supported options before study use. |
| Affect behavior | A valid approved fixture returns numeric valence/arousal; invalid image and too-large image return explicit failures; no raw image appears in logs or database. |
| Restart | Restart each service one at a time. Confirm session IDs and pending outbox events remain correct and API/WebSocket recovery does not duplicate event rows. |

Railway health checks establish activation during deployment but do not continuously monitor a service after it is active, so capture application logs and inspect each service's Metrics tab during this exercise. [Railway healthcheck behavior](https://docs.railway.com/deployments/healthchecks).

## Evidence to retain

Save the staging deployment identifiers and commits, migration output, schema-verifier output, service configuration screenshots with secret values redacted, test command output, resource metric screenshots, and a list of any failed checks. Do not save raw facial frames, secrets, or participant data in deployment evidence.

## Current validation status

| Item | Status in this repository preparation |
| --- | --- |
| Existing backend/service tests | Passed from `backend/`: 15 passed, 1 real-model test skipped. |
| Frontend production build | Passed. Vite reports one chunk-size warning (857.25 kB uncompressed JavaScript), not a build failure. |
| Docker build/startup | Not runnable in this environment because Docker is unavailable. |
| Real PostgreSQL migration | Not run: no approved staging database URL or local PostgreSQL/Docker is available. |
| Real HSEmotion model | Not run: no approved test image/verified local model weights were supplied. |
