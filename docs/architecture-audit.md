# ML-Tutor 2.0 — Architecture Audit

Audit date: 2026-11-05. This report describes the checked-out working tree. **Verified** findings are directly supported by repository files; **assumptions** are explicitly labelled. Existing application code, dependencies, and database records were not changed.

## System map

```text
Vite / React 19 browser application (Vercel rewrite)
  ├─ React Flow editor → serialized graph → WebSocket /ws/run
  ├─ browser CSV parser → in-memory node data → Python/scikit-learn execution
  ├─ telemetry logger → POST /log-event → PostgreSQL via SQLAlchemy
  ├─ dashboard client ← WebSocket /ws/dashboard
  ├─ SAMM control → POST /samm
  ├─ webcam + MediaPipe browser detector
  │    ├─ cropped JPEG once per engaged second → POST /predict_valenceArousal
  │    └─ forehead RGB roughly every 33 ms → WebSocket /ws/rppg
  └─ consent and notes REST calls

FastAPI / Uvicorn container
  ├─ synchronous SQLAlchemy engine → DATABASE_URL PostgreSQL target
  ├─ HSEmotion/Torch global singleton → affect inference in a worker thread
  ├─ NumPy/SciPy rPPG calculation in a worker thread
  ├─ scikit-learn pipeline execution in a worker thread
  └─ in-process dashboard connection list and rPPG buffers
```

The frontend starts in `frontend/src/main.tsx:6-12`, declares routes in `frontend/src/App.tsx:48-79`, and mounts the ML workspace through `PipelineCanvas`/`PipelineFlow`. `App.tsx:20` currently initializes `hasConsented` to `true`, so the consent route is bypassed for the normal root flow (verified).

The backend starts at `backend/app/main.py:1-60`. Importing it first patches `torch.load`, imports routers, creates tables with `Base.metadata.create_all`, then creates the FastAPI app and permissive CORS middleware. The ORM engine is constructed at import time in `backend/app/db/db.py:7-26`.

## Frontend modules and responsibilities

| Area | Verified implementation |
|---|---|
| Application/navigation | React Router pages for setup, problem selection, instructions, sandbox, and `/analytics`: `App.tsx:48-79`. |
| Setup and consent | `StartupDashboard.tsx:24-50` requests a local preview stream; `ConsentFlow.tsx:56-80` posts names, consent choices, and signatures. |
| Workflow editor | `PipelineFlow.tsx:75-624` owns React Flow nodes/edges; `nodeFactory.ts:13-39` supplies Dataset, Preprocessing, Model, Evaluation defaults; custom renderers are in `nodes/`. |
| Data entry | `DatasetNode.tsx:20-54` parses selected CSV files entirely in the browser with Papa Parse and retains rows in React state. |
| Learning and notes | Static HTML is fetched from `public/content`; `flow/useNotesLogic.ts` persists and retrieves notes plus interaction events. |
| Telemetry | `services/logger.ts:4-38` creates a UUID event and POSTs it. Pipeline snapshots deliberately omit raw dataset rows in `snapshotUtils.ts:5-25`. |
| Affective sensing | `VideoStream.tsx:27-331` loads MediaPipe assets from external CDNs, opens a webcam automatically after model initialization, sends cropped face JPEGs and rPPG RGB values. |
| Live dashboard | `AnalyticsDashboard.tsx:37-176` only displays newly received `AFFECT_STATE` and `SAMM_ADJUSTMENT` messages; it does not query historical data. |

The installed `@supabase/supabase-js` package has no caller in `frontend/src` (verified by source search). Database access is through FastAPI, despite the README describing an earlier SQLite implementation.

## Backend modules and responsibilities

| Area | Verified implementation |
|---|---|
| API composition | `main.py:50-60` mounts pipeline, notes, consent, analytics, affect, stream, and UCI-dataset routers. |
| Persistence | SQLAlchemy models are in `models/database_models.py:4-76`; there are six tables and no migration framework/configuration in the repository. |
| Pipeline execution | `routes/pipeline.py:9-37` receives one WS message and runs `execute_pipeline` in FastAPI's thread pool. |
| Affect inference | `hsemotionNet.py:7-11` constructs a global `HSEmotionRecognizer` during import; `routes/affect.py:13-55` reads the uploaded frame, runs inference with `asyncio.to_thread`, persists scores, broadcasts. |
| rPPG | `routes/streams.py:15-123` maintains process-local buffers and periodically uses `rppg_calculator.py`; BPM is stored at most once per 10 seconds per in-memory session. |
| Telemetry | `routes/analytics.py:12-102` persists generic events/SAMM and broadcasts dashboard messages. |
| UCI proxy | `routes/datasets.py:21-51` fetches a fixed UCI allowlist server-side in a thread pool and streams a generated CSV. |

## ML execution trace

1. A learner uploads a CSV. `DatasetNode.handleFileUpload` parses it in the browser and writes rows, columns, target and feature selections into the node (`DatasetNode.tsx:20-51`). No file is uploaded to a backend file store.
2. `PipelineFlow.runPipeline` calls `serializePipeline(nodes, edges)` then opens `VITE_WS_URL + /ws/run` and sends `{adjacency, executionOrder, orderedPipeline}` as JSON (`PipelineFlow.tsx:294-370`; `pipelineSerializer.ts:3-76`). Serializer validation rejects floating nodes and cycles.
3. `websocket_pipeline` parses the one message, calls `execute_pipeline` through `run_in_threadpool`, replies once, then closes the socket (`routes/pipeline.py:14-35`). The older REST helper targets `/execute-pipeline` (`services/pipelineExecutor.ts:3-14`), but no matching backend endpoint exists and the helper has no callers.
4. `execute_pipeline` constructs reverse parents, follows only the **first** parent when preparing a model branch, caches prepared dataset/preprocessing state per path, evaluates every model directly parented by an evaluation node, and returns the highest-accuracy model metrics for each evaluation node (`execution/executor.py:9-174`). This first-parent behavior is a verified limitation for multi-parent graphs.
5. `handle_dataset_node` turns supplied rows into a DataFrame, selects features/target, caps inputs above 15,000 rows, does a 42-seeded split and train-derived one-hot alignment (`dataset_handler.py:16-201`). Preprocessing mutates state partitions; model handler fits k-NN, decision tree, logistic regression, or zero-R; evaluation returns accuracy, weighted precision/recall/F1 (`preprocessing_handler.py`, `model_handler.py:17-138`, `evaluation_handler.py:10-90`).
6. The browser maps returned metrics onto evaluation nodes and derives the reflection text (`PipelineFlow.tsx:325-370`). Pipeline execution itself is not logged as a generic telemetry event.

## HSEmotion/webcam/rPPG trace

1. On module import, backend chooses CUDA if available and initializes HSEmotion once (`hsemotionNet.py:7-11`). Model initialization is therefore on the process startup critical path.
2. On `VideoStream` mount, the browser downloads MediaPipe WASM/model assets from jsDelivr and Google Storage, then calls `getUserMedia({video: true, audio: false})` when detector initialization completes (`VideoStream.tsx:27-47`, `102-157`). This happens again independently of the preview requested by `StartupDashboard`.
3. About once per second, the latest MediaPipe face detection is screened by a head-orientation heuristic. When engaged, the browser crops a padded face, JPEG-encodes it at quality 0.9, and starts a non-awaited `fetch` to `/predict_valenceArousal` (`VideoStream.tsx:181-251`).
4. The server reads the complete upload into memory, offloads OpenCV/HSEmotion prediction to a thread, derives valence/arousal from the last two score values, inserts `affect_logs`, and broadcasts `AFFECT_STATE` (`affect.py:13-49`; `hsemotionNet.py:13-33`). The timestamp is derived from the client-controlled filename prefix.
5. Approximately every 33 ms, the browser samples a one-pixel forehead ROI and sends RGB plus session/timestamp through `/ws/rppg` (`VideoStream.tsx:254-330`). The backend keeps the latest 400 samples per session, computes BPM every 30 received samples once full, emits each live BPM, and commits a row no more than every 10 seconds (`streams.py:50-103`).

## Execution, concurrency, and operational findings

| Finding | Evidence and consequence |
|---|---|
| Sync DB work inside async handlers | `notes.py:13`, `consent.py:11`, `analytics.py:70`, `affect.py:14`, and `streams.py:30` are `async def` but call blocking `SessionLocal`, ORM, and `commit` directly. A slow database can block the event loop serving WebSockets. |
| CPU work appropriately offloaded in three paths | Pipeline execution uses `run_in_threadpool` (`pipeline.py:22`), affect uses `asyncio.to_thread` (`affect.py:20`), and BPM calculation uses `to_thread` (`streams.py:67-72`). DB work and sequential fan-out remain blocking. |
| Slow dashboard client blocks all fan-out | `ConnectionManager.broadcast_event` awaits each send serially (`websocket_manager.py:14-16`), with no timeout, isolation, or dead-client cleanup. |
| Per-process state | Dashboard sockets, rPPG buffers, and rPPG save clocks are Python globals (`websocket_manager.py:5`, `streams.py:15-16`). They are lost on restart and not shared across instances/workers. |
| Resource unboundedness | No upload/request-size limits, rate limiting, socket message-size limits, execution queue, inference concurrency cap, or rPPG session expiry is implemented. CSV data and pipeline graph are user-controlled. |
| Build and test state | `npm run build` succeeded on 2026-11-05 (854 KB minified main JS, 275 KB gzip) with a Vite >500 KB warning. `npm run lint` failed: 38 errors, 5 warnings. No backend/frontend test files, test scripts, or CI workflow were found. |

## Docker and startup audit

`backend/Dockerfile:1-18` uses `python:3.14-slim`, installs `libgl1` and `libglib2.0-0`, installs all pinned requirements, copies the entire backend context, then runs a single Uvicorn process on Railway-compatible `${PORT:-8080}`. It has no `HEALTHCHECK`, non-root user, explicit worker count, migration command, image-size controls, or `.dockerignore` (verified).

The absence of `.dockerignore` combined with `COPY . .` means a present `backend/app/.env` would be copied into the image build context unless excluded by the build invocation; `.gitignore` does not protect Docker contexts. HSEmotion/Torch, OpenCV, SciPy/NumPy, pandas, scikit-learn and model weights are all installed in the same service. Exact RAM needs were not measured, but a low-memory deployment is an **assumption-risk**: cold initialization plus a CPU PyTorch model, concurrent decoded JPEGs, 400-sample buffers and scikit-learn DataFrames require load testing and explicit Railway memory limits before a study.

`db.py:7-13` requires `DATABASE_URL`. The local backend `.env` contains a different variable name (`SUPABASE_DB_URL`); verified configuration mismatch, although a parent process could separately provide `DATABASE_URL`. `Base.metadata.create_all` is called on each startup (`main.py:26`), which is not a versioned migration process.

## Security and privacy findings

Critical verified findings are documented in `migration-risks.md`; highlights:

- No authentication or authorization is present on HTTP or WebSocket routes. `/events` lists all telemetry and `DELETE /events` deletes it; notes can be queried by a supplied session ID and deleted by numeric ID.
- CORS permits every origin while credentials are enabled (`main.py:31-38`), inappropriate for a study deployment and incompatible with credentialed cross-origin browser rules.
- Consent PII, signatures, note text/highlights, session traces, affect, and rPPG are stored in the same database without access control, retention, encryption/application-level pseudonymisation, or audit trail.
- `main.py:5-13` globally forces `torch.load(..., weights_only=False)`, enabling unsafe pickle-style deserialization during model loading. HSEmotion supply-chain/model provenance and offline artifact handling are not pinned in code.
- `streams.py:18-27` permits any WebSocket client to submit an arbitrary JSON event for broadcast to every dashboard.

## Change surface for Phase 1+

| Initiative | Components that must change |
|---|---|
| Railway Amsterdam | `backend/Dockerfile`, deployment variables, `db.py`, `main.py` startup/migrations/health, logging/observability, WebSocket topology and readiness/load tests. |
| WebGazer | Add a browser-only gaze adapter alongside/replacing `VideoStream` engagement heuristic; consent/UI state; unified event contract; rate-limited/batched persistence; dashboard derived gaze summaries. No WebGazer reference exists now. |
| Optional screen recording | New explicit consent and granular recording-control state; browser `getDisplayMedia`/`MediaRecorder`; chunk upload/object storage/encryption/retention/deletion; recording metadata table and dashboard access controls. No `MediaRecorder` or `getDisplayMedia` caller exists now. |
| Unified research dashboard | New protected researcher identity/role checks, server-side session-scoped queries, historical backfill, normalized event/outcome schema, dashboard API, replay/timeline, export governance. Current dashboard only subscribes to live in-process broadcasts. |
