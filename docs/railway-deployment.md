# Railway staging deployment

This is a manual staging runbook. It does not authorize deployment to Railway, use of a production Neon database, or a frontend production cut-over.

## Deployment arrangement

Use one Railway project and a `staging` environment in the Amsterdam region. Create these three GitHub-backed services from the same repository:

| Railway service | Public networking | Root directory | `RAILWAY_DOCKERFILE_PATH` | Healthcheck |
| --- | --- | --- | --- | --- |
| `ml-tutor-api` | Generate one HTTPS domain | `/` (repository root) | `backend/Dockerfile` | `/health` |
| `ml-tutor-ml` | None | `/` (repository root) | `services/ml_execution/Dockerfile` | `/health` |
| `ml-tutor-affect` | None | `/` (repository root) | `services/affect_inference/Dockerfile` | `/health` |

Do not set a service root directory such as `services/ml_execution`: its Dockerfile intentionally copies `backend/app` from the repository-root build context. The Core Dockerfile was changed to use that same root context. Railway supports a custom Dockerfile path through `RAILWAY_DOCKERFILE_PATH`; its root directory defaults to `/` and applies to the build context. See [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles) and [build configuration](https://docs.railway.com/builds/build-configuration).

The Dockerfiles bind Uvicorn to `0.0.0.0` and Railway's supplied `PORT`, with `8080` only as the local fallback. Their container health checks use the same runtime port. Do not manually set `PORT` in Railway.

## Service responsibilities and network flow

```text
Browser -- HTTPS/WSS --> ml-tutor-api (only public service)
                            |-- PostgreSQL staging database
                            |-- HTTP + X-Internal-Service-Key --> ml-tutor-ml:PORT
                            `-- HTTP + X-Internal-Service-Key --> ml-tutor-affect:PORT
```

Only Core writes research records. ML returns the unchanged workflow result; Affect returns valence/arousal only. Both worker services must remain private. Railway private networking is scoped to a project environment, so all four services must be in the same `staging` environment. Use HTTP, not HTTPS, inside the private network. [Private networking](https://docs.railway.com/networking/private-networking) documents the `service.railway.internal:PORT` pattern.

Set these Core reference variables exactly, substituting only if a service is renamed:

```text
ML_EXECUTION_SERVICE_URL=http://${{ml-tutor-ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml-tutor-ml.PORT}}
AFFECT_INFERENCE_SERVICE_URL=http://${{ml-tutor-affect.RAILWAY_PRIVATE_DOMAIN}}:${{ml-tutor-affect.PORT}}
```

Also set the same generated `INTERNAL_SERVICE_API_KEY` on all three application services. The worker API rejects requests without its `X-Internal-Service-Key`; it must not be placed in browser variables.

## Exact dashboard configuration

1. In the Railway dashboard, create a project and its `staging` environment. For each service, open **Settings → Scale → Regions** and select Amsterdam. Use one replica initially.
2. Add the GitHub repository as the source for each service. Leave **Root Directory** unset (repository root). Add the Dockerfile-path variable from the table above.
3. In **Settings → Networking**, generate a public domain only for `ml-tutor-api`. Do not click Generate Domain for either worker.
4. In **Settings → Deploy**, configure the healthcheck path `/health`. Start with healthcheck timeouts of 120 seconds (Core), 180 seconds (ML), and 300 seconds (Affect). The higher Affect allowance is for the unbenchmarked CPU model cold start; reduce it after measurement.
5. For Core only, set **Pre-deploy Command** to `alembic -c alembic.ini upgrade head` and **Pre-deploy Timeout** to `300` seconds, after the staging migration procedure below has been reviewed. A failed pre-deploy command stops that deployment; it runs with service variables and private networking. See [Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command).
6. Add the variables in [railway-environment-variables.md](railway-environment-variables.md). Store secrets in Railway variables, not in the Git repository or a frontend build.
7. Use the public Core domain in the staging frontend only. Add that exact HTTPS origin to `CORS_ALLOWED_ORIGINS`. Do not point production Vercel at it.

Railway waits for a `2xx` healthcheck before activating a deployment; deployment healthchecks are not continuous monitoring. [Railway healthchecks](https://docs.railway.com/deployments/healthchecks) explains the behavior.

## Manual CLI equivalents

Run these only after linking a local checkout to the intended staging project/environment. They are examples, not commands executed during this phase.

```bash
railway login
railway link --environment staging
railway status
railway up --service ml-tutor-api
railway up --service ml-tutor-ml
railway up --service ml-tutor-affect
```

Prefer dashboard review for first staging deployment because it makes public-networking state and reference variables visible. Never run `railway up` while linked to production.

## Database and migrations

Provision or attach a separate PostgreSQL database for `staging`; only Core receives its `DATABASE_URL`. Do not set a database URL on ML or Affect.

For an empty staging database, first take a database snapshot if the provider offers it, then run from a local checkout:

```bash
export STAGING_DATABASE_URL='postgresql+psycopg2://...'
export ALLOW_STAGING_DB_MIGRATION=1
bash backend/scripts/migrate_staging_postgres.sh
```

The command applies `20261105_01`, `20261105_02`, and `20261105_03`, then performs only read-only schema verification. It is intentionally guarded by both a staging-specific URL variable and an explicit opt-in. The same Alembic command is the Core pre-deploy command after initial validation.

For an existing database created before Alembic, do **not** stamp automatically. First take a backup and compare actual tables, columns, indexes, and row counts to migration `20261105_01`. Only if it exactly represents that baseline and contains existing research rows should an operator consider `alembic stamp 20261105_01`, followed by `upgrade head`. Record the evidence and approval. A mismatch requires a separate migration plan.

Alembic downgrades are not a data-safe production rollback: `20261105_03` drops its audit table and `20261105_01` drops baseline tables. For any staging database that has collected data, restore a pre-migration snapshot instead of downgrading. An application rollback should redeploy the prior image only when its schema compatibility has been reviewed.

## Initial sizing and deployment behavior

These are starting limits, not benchmarked requirements:

| Service | Initial CPU | Initial RAM | Concurrency | Notes |
| --- | ---: | ---: | ---: | --- |
| Core | 0.5–1 vCPU | 1 GB | async I/O | Database pool defaults remain deliberately small. |
| ML | 1–2 vCPU | 2 GB | `ML_MAX_CONCURRENCY=1` initially | CPU-bound training runs in a threadpool; timeouts do not kill an already running CPU thread. |
| Affect | 2 vCPU | 4 GB | `AFFECT_MAX_CONCURRENCY=1` | PyTorch/HSEmotion is expected to dominate memory and cold start. |

Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` on all three services before study use, and retain one replica per service until session behavior under restarts is measured. Do not enable serverless sleeping during the live study: queued cold starts may delay telemetry or inference. Railway describes deployment overlap and draining in its [deployment reference](https://docs.railway.com/deployments/reference).

## Known staging gates

- The Affect process uses HSEmotion's legacy pickle-compatible model load path (`weights_only=False`) in isolation. Treat model weights as executable trust material: permit only the documented, version-pinned HSEmotion source, record its checksum/provenance, and do not mount or accept arbitrary model files. Model cache/download behavior and cold-start timing have not been measured here.
- A request timeout bounds the HTTP response but cannot forcibly terminate a CPU thread already running ML training or PyTorch inference. The one-worker, bounded-concurrency initial settings reduce contention but do not substitute for benchmark evidence.
- Core `/ready` intentionally reports an unavailable worker without failing Core readiness, so research telemetry stays available during worker failures. External monitoring must separately alert on unavailable workers.
- Docker, real PostgreSQL, and real HSEmotion validation remain prerequisites for approving a staging deployment; see the current status in [railway-staging-validation.md](railway-staging-validation.md).

## Post-deployment checks

Follow [railway-staging-validation.md](railway-staging-validation.md) before connecting any staging browser client. In particular, confirm Core telemetry works while either worker URL is unavailable; worker failures must be tracked without interrupting telemetry collection.
