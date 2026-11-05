# ML-Tutor 2.0 — Implementation Roadmap

This is a proposed, prioritized implementation sequence based on the 2026-11-05 audit. It does **not** change ML algorithms, preprocessing, model parameters, or metrics.

## Study-readiness gate — required before participant data collection

1. **Protect data and consent (P0).**
   - Implement authenticated participant/researcher/admin roles and session ownership across every API/WebSocket route.
   - Replace the bypassed consent state with server-recorded, versioned consent checks. Gate each modality independently: generic telemetry, webcam affect, rPPG, eye tracking, screen recording, audio, exports.
   - Remove/lock global event deletion; scope all reads to an authorized participant or researcher cohort.
   - Establish privacy classification, pseudonymous IDs, separation of identity/consent from study events, retention/deletion process, export audit trail, and IRB-approved language.

2. **Make collection reliable and auditable (P0).**
   - Define a versioned event envelope with immutable ID, stable study/session/run IDs, client/server times, client sequence number, modality/consent state and source.
   - Add database migrations and uniqueness/idempotency constraints; persist server receipt time.
   - Add a bounded browser outbox with acknowledged batches/retry and a collection-status UI. Persist-before-broadcast and reconcile expected versus received events.
   - Normalize SAMM, affect, rPPG and future gaze/recording metadata into a documented session timeline.

3. **Remove unsafe model/deployment behavior (P0/P1).**
   - Remove the global unsafe `torch.load` patch after confirming a trusted HSEmotion loading path; preserve model behavior but verify artifact provenance/integrity.
   - Stop tracking runtime database data going forward and follow an approved repository-history/data-handling process. Do not delete records blindly.
   - Narrow CORS and validate WebSocket origins; enforce HTTPS/WSS and security headers.

4. **Make Railway Amsterdam operationally safe (P1).**
   - Add a Docker exclusion list, non-root runtime, controlled secrets, explicit startup/readiness health checks, structured logs and error monitoring.
   - Replace startup `create_all` with reviewed, versioned migrations; configure one source of truth for `DATABASE_URL` and public frontend/backend WS URLs.
   - Load-test cold start, HSEmotion CPU inference, rPPG traffic and pipeline execution on the intended Railway plan. Set resource limits, bounded concurrency/queues, payload limits and timeouts.
   - Move blocking database operations out of async handlers and make WebSocket fan-out fault-isolated. Decide whether to operate a single tested instance or externalize shared real-time state/pub-sub first.

5. **Create minimum validation coverage (P1).**
   - Add unit tests for telemetry validation/deduplication, consent gating, route authorization, ORM migrations, pipeline serialization/execution contract and rPPG/HSEmotion error paths.
   - Add integration tests with ephemeral PostgreSQL and authenticated WebSocket clients; add E2E tests for consent → session → workflow → telemetry recovery.
   - Make formatting/type/lint/build/tests required CI gates. Current audit result: build passes; lint does not.

## After the study-readiness gate

1. **Railway migration rehearsal.** Deploy staging in Amsterdam, connect a managed PostgreSQL instance, run schema migration/drift checks, execute load/failure/restart drills, test CORS/WSS from production frontend, and rehearse rollback/backup/restore. No assumption should replace the rehearsed result.

2. **WebGazer integration.** Build a consent-gated browser adapter with calibration, quality/confidence, pause/resume and clear user indicator. Start with derived, rate-limited gaze measures; connect them to the unified event contract and session timeline. Validate cross-device/browser accuracy and fairness before using gaze for research conclusions.

3. **Optional screen recording.** Add it only as a separately consented capture service: `getDisplayMedia` + `MediaRecorder`, chunk manifests/idempotency, encrypted object storage, multipart recovery, access-controlled playback and automated retention/deletion. Record user controls and consent revisions as events.

4. **Unified research analytics dashboard.** Replace the live-only dashboard with a protected researcher portal: participant/session filter, historical timeline, event delivery status, modality quality flags, affect/SAMM/rPPG/gaze overlays, workflow snapshots, replay links where consent permits, aggregates and audited exports. Implement role-aware aggregate views before raw-data access.

5. **Optional product hardening.** Address current lint errors/types, large bundle code splitting, resilient reconnect/backoff, user-facing sensor status, accessible error paths, and monitoring/cost controls.

## Scope map

| Work item | Primary files/services likely to change | Preserve |
|---|---|---|
| Auth, consent, privacy | `App.tsx`, `ConsentFlow.tsx`, session store, all backend routers/models | Existing learning workflow behavior until a separately approved change. |
| Telemetry reliability | `services/logger.ts`, sensor components, analytics routes/models, dashboard | Event semantics should be versioned/migrated, not silently overwritten. |
| Railway | `backend/Dockerfile`, environment/deployment config, `db.py`, `main.py`, migration tooling | ML algorithms, preprocessing, parameters and metrics. |
| WebGazer/recording | New browser adapters and storage/metadata services; `VideoStream` integration boundary | Do not send raw recordings through existing Postgres/WebSocket paths. |
| Dashboard | New protected API/query layer and dashboard modules | Existing raw tables remain source evidence until governed migration/export is approved. |

## Explicitly deferred features

These are valuable but should follow the study-readiness gate: advanced dashboard visualizations, screen-recording playback UX, adaptive interventions, automatic gaze-driven prompts, cross-session ML analytics, and performance/bundle polish. They must not delay security, consent, data integrity, and deployment validation.
