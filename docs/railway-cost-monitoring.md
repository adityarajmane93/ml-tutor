# Railway cost and operational monitoring

These limits are intentionally provisional. Measure staging memory, CPU, request latency, model cold start, and restart behavior before choosing a study budget.

## Initial resource posture

| Service | Starting allocation target | Operational signal | Action threshold |
| --- | --- | --- |
| `ml-tutor-api` | 0.5–1 vCPU, 1 GB RAM | database-pool exhaustion, memory growth, WebSocket disconnects | Investigate sustained memory above 70% of allocation or connection timeouts. |
| `ml-tutor-ml` | 1–2 vCPU, 2 GB RAM | execution time, timeout count, CPU saturation | Keep `ML_MAX_CONCURRENCY=1` until representative pipelines complete with CPU headroom. |
| `ml-tutor-affect` | 2 vCPU, 4 GB RAM | cold start, RSS, inference time, OOM/restarts | Keep `AFFECT_MAX_CONCURRENCY=1`; increase memory before concurrency. |
| PostgreSQL staging | provider default sized to observed connections | database connections, storage, latency | Keep Core pool cap below the database connection limit. |

Railway presents CPU, memory, disk, and network graphs at **service → Metrics**. It does not collect application request latency or research KPIs automatically, so retain Core structured logs and database-side checks for those. See [Railway metrics](https://docs.railway.com/observability/metrics).

## Dashboard operations

1. After every staging deployment, open each service's **Metrics** tab and compare CPU and memory during cold start, a representative ML execution, and affect inference.
2. Use the deployment/log view to correlate metric spikes with a commit. Capture the current service configuration before changing allocation or concurrency.
3. Configure CPU/RAM monitor alerts and deployment-failure notifications in the workspace/project alert configuration. Railway webhooks can notify on deployment and CPU/RAM monitor alerts if the research organization has an approved endpoint. See [webhooks and alerts](https://docs.railway.com/observability/webhooks).
4. Do not enable serverless sleeping for the live study until tests establish that cold starts cannot compromise session identity, event acknowledgement, or timing. A sleeping service queues requests while it starts.

## Spending limits

In **Workspace → Usage**, select **Set Usage Limits** and set a compute email alert plus a hard limit approved by the study owner. A hard limit shuts workloads down after the limit is reached, so it must be high enough not to interrupt active data collection. Use a lower staging-only hard limit while validating.

Equivalent CLI examples (not executed here):

```bash
railway usage
railway usage projects --project ml-tutor
railway usage limit status --target workspace
railway usage limit set --target workspace --soft 75 --hard 125
```

The amounts are examples in US dollars, not recommendations. Compute usage includes CPU, memory, storage, and egress; a hard limit is an availability control as well as a cost control. See [Railway cost control](https://docs.railway.com/pricing/cost-control) and the [usage CLI reference](https://docs.railway.com/cli/usage).

## Deployments and rollback

For every change, retain the previous active deployment until validation passes. In the Railway service deployment menu, use **View logs** during startup and **Rollback** only after reviewing database compatibility; an image rollback does not undo a schema migration.

Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` as an initial controlled shutdown period. Before the study, practice the following on staging:

1. Redeploy Core while a browser session has queued events.
2. Redeploy ML during an execution and Affect during an inference.
3. Confirm no telemetry insert is lost or duplicated and Core records failures appropriately.
4. Restore a database snapshot in a disposable database; do not test data-destructive downgrade paths on collected data.

Railway may remove old deployment history according to the account retention policy, so export the deployment identifier, commit hash, migration output, and validation evidence externally. [Railway deployment reference](https://docs.railway.com/deployments/reference).
