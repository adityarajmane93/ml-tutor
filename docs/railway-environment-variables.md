# Railway environment variables

Create secrets in Railway's variable UI. Do not copy them into `frontend/.env`, Git, browser-visible `VITE_*` variables, Docker build arguments, logs, or screenshots.

## `ml-tutor-api`

| Variable | Value / source | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | staging PostgreSQL private connection URL | Yes | Core is the only service that writes research data. |
| `CORS_ALLOWED_ORIGINS` | Exact comma-separated staging browser origins | Yes | Never `*` for the study. |
| `RESEARCHER_API_KEY` | Unique random secret | Yes | Researcher export/deletion and protected WebSocket access. |
| `INTERNAL_SERVICE_API_KEY` | Same secret as both workers; different from researcher key | Yes | Authenticates Core-to-worker calls. |
| `ML_EXECUTION_SERVICE_URL` | `http://${{ml-tutor-ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml-tutor-ml.PORT}}` | Yes | Private ML endpoint. |
| `AFFECT_INFERENCE_SERVICE_URL` | `http://${{ml-tutor-affect.RAILWAY_PRIVATE_DOMAIN}}:${{ml-tutor-affect.PORT}}` | Yes | Private Affect endpoint. |
| `ML_EXECUTION_TIMEOUT_SECONDS` | `60` initially | Yes | Core request timeout for workflow execution. |
| `AFFECT_INFERENCE_TIMEOUT_SECONDS` | `15` initially | Yes | Core request timeout for affect inference. |
| `DB_POOL_SIZE` | `5` initially | Yes | Bound persistent database connections. |
| `DB_MAX_OVERFLOW` | `5` initially | Yes | Bound temporary database connections. |
| `DB_POOL_TIMEOUT_SECONDS` | `30` | Yes | Database-pool wait bound. |
| `DB_POOL_RECYCLE_SECONDS` | `1800` | Yes | Recycle long-lived connections. |
| `RAILWAY_DOCKERFILE_PATH` | `backend/Dockerfile` | Yes | Selects root-context Core Dockerfile. |
| `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` | `120` initially | Recommended | Deployment healthcheck allowance. |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `30` | Recommended | Graceful shutdown window. |

`PORT`, `RAILWAY_PRIVATE_DOMAIN`, and `RAILWAY_PUBLIC_DOMAIN` are Railway-provided runtime variables. Do not set them yourself.

## `ml-tutor-ml`

| Variable | Value / source | Required | Purpose |
| --- | --- | --- |
| `INTERNAL_SERVICE_API_KEY` | Exact same generated value as Core | Yes | Requires authenticated internal HTTP. |
| `ML_MAX_CONCURRENCY` | `1` initially | Yes | Bounds simultaneous CPU-intensive runs. |
| `ML_EXECUTION_TIMEOUT_SECONDS` | `60` initially | Yes | Returns a bounded-time failure response. |
| `RAILWAY_DOCKERFILE_PATH` | `services/ml_execution/Dockerfile` | Yes | Selects root-context worker Dockerfile. |
| `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` | `180` initially | Recommended | Deployment healthcheck allowance. |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `30` | Recommended | Graceful shutdown window. |

Do not set `DATABASE_URL`, a public domain, or researcher credentials on this service.

## `ml-tutor-affect`

| Variable | Value / source | Required | Purpose |
| --- | --- | --- |
| `INTERNAL_SERVICE_API_KEY` | Exact same generated value as Core | Yes | Requires authenticated internal HTTP. |
| `AFFECT_MAX_CONCURRENCY` | `1` | Yes | Bounds PyTorch memory pressure. |
| `AFFECT_INFERENCE_TIMEOUT_SECONDS` | `15` initially | Yes | Bounds response wait time. |
| `AFFECT_MAX_IMAGE_BYTES` | `5242880` | Yes | Rejects over-large uploaded frames. |
| `RAILWAY_DOCKERFILE_PATH` | `services/affect_inference/Dockerfile` | Yes | Selects root-context worker Dockerfile. |
| `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` | `300` initially | Recommended | Allows measured model cold start; tune after validation. |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `30` | Recommended | Graceful shutdown window. |

Do not set `DATABASE_URL`, a public domain, `RESEARCHER_API_KEY`, or model-upload credentials on this service. Raw image bytes are held only in request memory and are not logged or persisted by the service.

## Shared-variable rules

Railway reference variables use `${{service-name.VARIABLE}}`, so renaming a worker requires updating the two Core URL references. Private domains and `PORT` are appropriate for in-project calls; browser code cannot reach Railway private DNS. See [Railway variables](https://docs.railway.com/variables/reference) and [private domains](https://docs.railway.com/networking/domains/working-with-domains).

Generate `RESEARCHER_API_KEY` and `INTERNAL_SERVICE_API_KEY` independently with the organization-approved secret generator. Rotate an exposed value on all dependent services, then redeploy; do not attempt to preserve a leaked key for compatibility.
