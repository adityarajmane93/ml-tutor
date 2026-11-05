# ML-Tutor 2.0 — Telemetry Inventory

Audit date: 2026-11-05. This document distinguishes persistent records from live-only messages. Unprefixed frontend/backend paths below are relative to `frontend/src/` and `backend/app/`, respectively. The generic event schema is verified in `backend/app/models/pydantic_schemas.py:4-14` and `database_models.py:4-17`.

## Canonical generic event schema

```json
{
  "event_id": "client-generated UUID",
  "session_id": "client-generated UUID for the browser-store lifetime",
  "timestamp": "Unix seconds serialized as a string",
  "event_type": "string",
  "action": "string",
  "source": "frontend",
  "schema_version": "1.0",
  "metadata": {}
}
```

`services/logger.ts:11-20` constructs the schema, posts it to `/log-event`, and catches/errors without propagating or retrying (`:22-38`). Generic events are persisted in `events.event_metadata` JSON. Pipeline snapshots use the same schema; their sanitizer excludes the raw `dataset` rows but persists filenames, selected pipeline configuration, positions, nodes and edges (`flow/snapshotUtils.ts:5-25`).

## Recorded generic event taxonomy

| Event type | Actions and metadata source | Persistent? |
|---|---|---|
| `PIPELINE_EVENT` | `NODE_CREATED` (id/type), `EDGE_CREATED` (source/target/direction), `NODE_DRAGGED` (position), `NODE_DELETED`, `EDGE_DELETED`, `PIPELINE_STATE_UPDATED` (sanitized full graph). `PipelineFlow.tsx:196-209`, `flowHandlers.ts:43-149`, `pipelineSnapshot.ts:9-22`. | Yes, through `/log-event`. |
| `CLICK_EVENT` | `LEARN_MODAL_OPENED`, `LEARN_MODAL_CLOSED` (type/duration), `CLOCK_OPENED`, `CLOCK_CLOSED_MANUALLY` (elapsed time). `PipelineFlow.tsx:211-243,378-395`; `SessionTimer.tsx:40-55`. | Yes. |
| `LEARN_TAB` | `HIGHLIGHT_ABANDONED`, `NOTE_ABANDONED`, `TEXT_ABANDONED`, `TAB_CHANGED`, `NOTE_DELETED_IN_DB`, `NOTE_SAVED`; may include reading selections or note text. `flow/useNotesLogic.ts:43-190,233-245,350-372`. | Yes. |
| `INTERACTION` | `RAW_PAGE_CLICK` includes click coordinates/context. `useNotesLogic.ts:155-160`. | Yes. |
| `evaluation` (lower-case) | `metric_selected` with node, metric/value/algorithm. `nodes/EvaluationNode.tsx:74-91`. | Yes; naming diverges from the uppercase taxonomy. |

## Sensor, self-report, and live event streams

| Signal | Persistent schema | Live broadcast | Producer / frequency |
|---|---|---|---|
| SAMM | `samm_records`: session, timestamp, answer duration, valence/arousal/dominance. | `SAMM_ADJUSTMENT` with timestamp and scores only (`analytics.py:89-93`). | `SAMMbar.tsx:133-161` submits automatically after all sliders have values; then resets. |
| Facial affect | `affect_logs`: session, filename-derived timestamp, valence/arousal. | `AFFECT_STATE` with timestamp and scores only (`affect.py:41-48`). | Engagement-filtered cropped webcam JPEG, target cadence 1 Hz (`VideoStream.tsx:181-251`). |
| rPPG/BPM | `rppg_logs`: session, timestamp, bpm. | `RPPG_BPM` with timestamp/BPM (`streams.py:97-101`). | Browser sends RGB target cadence ~30 Hz; server emits after full 400-sample buffer and every 30 received samples; DB max once/10 s (`VideoStream.tsx:254-330`, `streams.py:65-103`). |
| Dashboard ingress | None unless the caller separately posts `/log-event`. | Any client can submit arbitrary JSON which server fans out (`streams.py:18-27`). | Not a validated or durable event protocol. |

The current dashboard only renders SAMM and affect (not generic events or BPM) from messages received after it connects (`AnalyticsDashboard.tsx:56-82`). It stores no session selection, no replay cursor, and no historical fetch.

## Confirmed loss, duplication, and data-quality risks

| Risk | Classification | Evidence / effect |
|---|---|---|
| Offline/failed generic events are lost | Verified | `logEvent` logs to console and discards errors; no retry, local durable queue, acknowledgement tracking, or unload delivery (`logger.ts:22-38`). |
| Affect frames can be lost silently | Verified | The `fetch` is started but not awaited; `try/catch` cannot capture its async rejection; no retry/idempotency (`VideoStream.tsx:225-246`). |
| rPPG state/data disappear on restart or routing change | Verified | Buffers and save clocks are globals; only periodic BPMs persist (`streams.py:15-16, 78-95`). |
| Duplicate self-report/sensor rows possible | Verified | SAMM, affect, and rPPG tables have no client event ID or uniqueness constraint. Retries/reconnects cannot be deduplicated. |
| Potential duplicate dashboard messages | Verified conditional | `/log-event` broadcasts after persistence. If `connectTelemetry` were fixed/used, it also sends that event into `/ws/dashboard`, whose server rebroadcasts it. The store function is currently unused and malformed, so this is conditional rather than presently observed. |
| Event order ambiguity | Verified | Generic timestamps are second precision (`logger.ts:14`), and all ordering fields are client supplied strings. Concurrent events in one second lack sequence number or server receive time. |
| Missing context in live messages | Verified | SAMM/affect/rPPG broadcasts omit `session_id`; dashboards cannot safely partition concurrent participants. |
| Notes UI may create apparent duplicates | Verified | `/notes/` returns no `note_id`, so client substitutes `Date.now()` then will later refetch the actual record (`notes.py:12-33`, `useNotesLogic.ts:374-384`). |
| Sensitive data enters telemetry | Verified | Notes/highlights and click coordinates are logged in JSON metadata. Pipeline snapshots retain filenames/configuration. Data classification/minimization policy is absent. |
| Session continuity is weak | Verified | Session ID is regenerated when Zustand store is initialized and not persisted to durable browser storage (`sessionStore.ts:13-15`); reload/new tab splits a participant's trace. |

## Required target contract (design recommendation, not implemented)

Before research collection, use one envelope for all client and derived measurements: immutable `event_id`, stable study pseudonym/session/run IDs, client and server timestamps, monotonic client sequence, schema version, consent/collection state, source, payload type, and dedupe status. Persist before fan-out; make dashboard delivery a non-authoritative projection of stored events. Introduce idempotency keys and a bounded local outbox/batch protocol for browser telemetry. This is a recommendation based on the verified weaknesses above, not a statement about existing behavior.
