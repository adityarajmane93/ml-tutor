# ML-Tutor 2.0 — API and WebSocket Inventory

Audit date: 2026-11-05. Entries are verified from route decorators and frontend source. Backend shorthand paths below are relative to `backend/app/`; frontend shorthand paths are relative to `frontend/src/`. No authentication, authorization, request rate limit, or explicit payload limit was found on these interfaces.

## HTTP endpoints

| Method/path | Handler and behaviour | Frontend caller | Data exposure / notes |
|---|---|---|---|
| `GET /` | `main.root`, returns backend status (`backend/app/main.py:50-52`). | None found. | Public health-like response, but no readiness check. |
| `POST /log-event` | `analytics.log_event` inserts a generic `EventModel`, then schedules dashboard broadcast (`routes/analytics.py:12-51`). | `services/logger.ts:4-38`; indirectly all `logEvent` calls. | `event_id` is PK; duplicate ID causes rollback/error. Client fields are trusted. |
| `GET /events` | Returns every event, unfiltered (`analytics.py:53-59`). | None found. | Exposes all sessions' metadata. |
| `DELETE /events` | Deletes every event (`analytics.py:61-67`). | None found. | Destructive unauthenticated production endpoint. |
| `POST /samm` | Persists self-report values and immediately broadcasts `SAMM_ADJUSTMENT` (`analytics.py:69-94`). | `components/SAMMbar.tsx:140-161`. | No idempotency key; broadcast omits session ID and time-to-answer. |
| `GET /samm` | Returns all SAMM records (`analytics.py:96-102`). | None found. | Omits `session_id`; exposes all study records without context. |
| `POST /predict_valenceArousal` | Reads multipart frame + `session_id`, invokes HSEmotion, saves affect score, broadcasts `AFFECT_STATE` (`routes/affect.py:13-55`). | Fire-and-forget fetch in `components/VideoStream.tsx:225-246`. | Full request held in memory; filename supplies timestamp; no image retained by this code. |
| `POST /notes/` | Persists a note (`routes/notes.py:12-33`). | `flow/useNotesLogic.ts:350-396`. | Response omits generated note ID, though UI expects `note_id`; notes include learner text/highlights. |
| `GET /notes/?session_id=&node_type=` | Lists supplied session's notes, optional tab filter (`notes.py:35-44`). | `useNotesLogic.ts:248-275`. | Guessable/bearer-like session ID is not authorization. |
| `DELETE /notes/{note_id}` | Deletes by numeric ID (`notes.py:46-57`). | `useNotesLogic.ts:233-246`. | No ownership check. |
| `POST /consent-forms/` | Persists three-page consent payload (`routes/consent.py:10-38`). | `components/ConsentFlow.tsx:56-80`. | Stores participant/child/guardian names and signatures; no deduplication or access control. |
| `GET /uci-datasets/{dataset_id}/download` | Fetches an allowlisted UCI dataset, joins features/targets and streams CSV (`routes/datasets.py:11-51`). | Browser link in `components/ProblemStatement.tsx:104-249`. | IDs restricted to 6 values; server-side external egress and dependency availability required. |

`services/pipelineExecutor.ts:3-14` calls `POST /execute-pipeline`, but this route is not implemented and the service has no caller. It is stale/dead frontend API code, not an active API.

## WebSocket endpoints

| Path | Server behaviour | Frontend caller | Contract / lifecycle |
|---|---|---|---|
| `/ws/run` | Accept one text JSON pipeline, run it in thread pool, `send_json(result)`, close (`routes/pipeline.py:9-37`). | `PipelineFlow.runPipeline` at `PipelineFlow.tsx:294-370`. | Request is serializer output; response `{evaluations: {evaluationNodeId: {accuracy, precision, recall, F1}}, execution?: {sampling: [...]}}` or `{error}`. |
| `/ws/dashboard` | Stores connection. Every received client event is JSON-parsed and rebroadcast to all dashboard clients (`routes/streams.py:18-27`). | `AnalyticsDashboard.tsx:41-89` opens one; `sessionStore.connectTelemetry` intends to open one but is not called. | Server-generated broadcasts also use this manager. No session filter, auth, replay, validation, or reconnect. `sessionStore` uses a quoted literal URL rather than interpolation (`sessionStore.ts:24`), so that unused function would connect to an invalid URL. |
| `/ws/rppg` | Accepts JSON RGB samples, keeps per-session 400-sample buffers, estimates/broadcasts BPM, returns `{status: "live", bpm}` (`streams.py:29-123`). | `VideoStream.tsx:49-99`, `254-330`. | Input: `session_id`, `timestamp`, `r`, `g`, `b`. Reconnects after 2 seconds on browser close. Process-local state; not suitable for multi-instance routing as-is. |

## Database models

All models use the same SQLAlchemy base in `backend/app/models/database_models.py:1-76`. No foreign keys, created/updated times, database constraints beyond primary keys, retention metadata, or ORM migration files are present.

| Table/model | Columns | Producers | Observations |
|---|---|---|---|
| `events` / `EventModel` | `event_id` PK, `session_id`, `timestamp`, `event_type`, `action`, `source`, `schema_version`, JSON `event_metadata` (`:4-17`) | `/log-event` | Strings are client-provided; only generic stream with explicit IDs. |
| `samm_records` / `SAMMModel` | autoincrement id, session, timestamp, time-to-answer, valence/arousal/dominance (`:19-30`) | `/samm` | No idempotency token; list endpoint drops session. |
| `affect_logs` / `AffectModel` | id, session, timestamp, valence, arousal (`:32-40`) | `/predict_valenceArousal` | Timestamp from unvalidated filename. |
| `rppg_logs` / `RppgModel` | id, session, timestamp, bpm (`:42-47`) | `/ws/rppg` | At-most one committed record/10 seconds only per process memory. |
| `notes` / `NoteModel` | id, session, node type, highlighted text/range, custom note, timestamp (`:49-59`) | `/notes` | No session ownership enforcement. |
| `consent_forms` / `ConsentFormModel` | id, session, names, consent choices, signatures, dates (`:60-76`) | `/consent-forms` | Identifying and sensitive data mixed with research telemetry. |

## Configuration and deployment interfaces

| Input | Consumer | Verified issue |
|---|---|---|
| `DATABASE_URL` | `backend/app/db/db.py:10-13` | Required at process import. Local backend `.env` uses `SUPABASE_DB_URL`, not this name. |
| `FRONTEND_URL` | `main.py:29` | Defined but unused; CORS uses `allow_origins=["*"]`. |
| `PORT` | `backend/Dockerfile:18` | Used by shell-expanded Uvicorn command, default `8080`. |
| `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_WS_URL` | Multiple browser callers | Public build-time Vite values; must contain only public URLs, never secrets. Naming is inconsistent across callers. |
