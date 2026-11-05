# ML-Tutor 2.0 — Migration and Study-Readiness Risks

Audit date: 2026-11-05. Priorities classify study-readiness impact, not implementation effort. “Verified” means repository evidence; “assumption” marks an environment-dependent inference.

## Critical — resolve before collecting study data

| Priority | Finding | Evidence | Required direction |
|---|---|---|---|
| P0 | No access control protects research data or destructive endpoints. | No auth middleware/dependencies/routes; `/events` exposes all records and `DELETE /events` clears them (`routes/analytics.py:53-67`); notes delete by ID (`notes.py:46-57`). WebSockets accept unauthenticated clients. | Add participant/session authorization and researcher/admin RBAC; remove or lock destructive endpoints; enforce ownership/session scope on every query/mutation/socket. |
| P0 | Consent is bypassed in normal navigation, while camera capture is required and automatic in the sandbox. | `App.tsx:20` sets `hasConsented=true`; `VideoStream.tsx:102-157` automatically requests webcam after model load. | Make consent state server-backed, versioned, immutable and checked before every collection feature. Separate facial affect, rPPG, WebGazer, screen recording, audio, and data-sharing opt-ins. |
| P0 | Identifying consent data, signatures, behavioral traces, affect, and physiological proxy data share unauthenticated storage. | `ConsentFormModel` fields in `database_models.py:60-76`; other tables linked by same session ID. | Pseudonymise/segregate identity mapping, encrypt in transit/at rest, define retention/deletion/access/audit policy, restrict dashboard/export access, complete IRB/DPIA review. |
| P0 | CORS allows all origins with credentials. | `main.py:31-38`: `allow_origins=["*"]`, `allow_credentials=True`. | Use an exact HTTPS frontend-origin allowlist and validate WebSocket Origin; do not rely on CORS as authentication. |
| P0 | Generic, affect, self-report and rPPG collection lacks durable delivery semantics. | See `telemetry-inventory.md`; no outbox/retry/idempotency, process globals, client timestamps. | Establish versioned event envelope, server timestamps, per-session sequence, idempotency constraints, bounded batching/retry and reconciliation dashboards before study. |
| P0 | Model loading explicitly disables Torch's safer weights-only mode. | Global monkey patch at `main.py:5-13`. | Remove the insecure global override, use reviewed/trusted model artifacts with integrity checks and documented provenance; test HSEmotion-compatible safe loading. |
| P0 | Telemetry database is tracked in the repository. | `git ls-files backend/events.db` returns the file (416 KB at audit). | Treat it as potentially sensitive study data: stop tracking future runtime DB artifacts, assess history/access, and follow an approved remediation/rotation process without deleting existing records during this audit. |

## High — resolve before Railway production cutover

| Priority | Finding | Evidence | Required direction |
|---|---|---|---|
| P1 | Backend config is inconsistent and startup depends on imports/side effects. | Code reads `DATABASE_URL` (`db.py:10`); local `.env` uses `SUPABASE_DB_URL`; HSEmotion initializes during import (`hsemotionNet.py:7-11`); tables are created at startup (`main.py:26`). | Define Railway variables once, validate without disclosing them, move schema changes to migrations, implement health/readiness checks that distinguish DB/model readiness. |
| P1 | Docker image can include `.env`; no non-root or health configuration. | `COPY . .` and no `.dockerignore` (`Dockerfile:12-15`). | Exclude local/env/runtime artifacts, use build-safe secret injection, a non-root user, health endpoint/check and explicit production process configuration. |
| P1 | Stateful WebSockets do not scale across instances. | Process-local dashboard list/rPPG buffers (`websocket_manager.py:5`, `streams.py:15-16`). | Start with a single explicitly sized instance only if load-tested, or externalize pub/sub/session state and ensure sticky/routed WebSocket semantics. |
| P1 | Async handlers perform blocking ORM commits; dashboard fan-out serializes slow consumers. | `analytics.py:70-87`, `affect.py:25-39`, `streams.py:82-95`; `websocket_manager.py:14-16`. | Use async-safe DB access or bounded offloading, connection lifecycle/dead-client handling, per-client queues/timeouts, backpressure and metrics. |
| P1 | CPU/RAM behavior is unbounded. | Torch/HSEmotion/OpenCV/scikit-learn in one service; body sizes/rates/concurrency unspecified; large datasets are browser-parsed and transferred as JSON. | Benchmark actual representative concurrency on Railway Amsterdam; set RAM/CPU, worker/thread limits, upload/socket limits, rate limits and an execution/inference queue. Exact memory minimum is an **assumption pending measurement**. |
| P1 | No automated verification gates. | No tests/CI found; current frontend lint fails 38 errors/5 warnings, while production build succeeds. | Add test and deployment checks before migration; do not treat a successful Vite build as study-ready validation. |

## New capability risks and required boundaries

| Capability | Existing base | Required change/risk |
|---|---|---|
| WebGazer | No WebGazer code. Current face detector infers coarse engagement and sends images/rPPG (`VideoStream.tsx`). | Do gaze processing in browser where feasible; disclose calibration/accuracy limits; send minimum derived gaze metrics at a governed cadence rather than raw video; add opt-in, pause, indicator, calibration quality events and data-loss semantics. |
| Optional screen recording | No `getDisplayMedia`/`MediaRecorder` use. Consent has video/audio questions but does not implement recording controls. | New separate consent, start/stop/pause/revoke UI, browser capture constraints, chunked resumable encrypted upload, private object storage, retention/deletion policy, recording manifest table and protected playback—not PostgreSQL blobs or WebSocket frames. |
| Unified dashboard | Existing `/analytics` consumes only live affect/SAMM events (`AnalyticsDashboard.tsx:37-176`). | Create a protected server-side query API with session filtering/pagination, historical timeline/replay, source/version visibility, derived metrics jobs, export auditing, and researcher roles. Avoid direct client access to raw tables. |

## Security observations requiring careful deployment treatment

- Vite variables are built into client assets. `VITE_*` values must be public origin URLs only; never place service/database keys in them.
- HSEmotion model loading may fetch/cache artifacts as a package runtime behavior; the repository does not pin a model artifact hash or provide a local reviewed artifact. This is a verified absence; actual download timing/location is an **assumption** requiring a controlled startup test.
- The Docker base is Python 3.14 and requirements include Torch 2.12.0. Compatibility is not proven by repository tests; build in the intended Railway builder is an **assumption-risk**.
- UCI download performs server-side third-party network retrieval. The dataset IDs are allowlisted, but availability and remote content integrity remain external dependencies.
