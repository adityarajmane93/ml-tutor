# Phase 2 service architecture

```text
Browser → Core API (public)
            ├─ PostgreSQL: sessions, telemetry, notes, SAMM, rPPG, affect results, execution tracking
            ├─ HTTP + X-Internal-Service-Key → ML Execution Service (private)
            └─ HTTP + X-Internal-Service-Key → Affect Inference Service (private)
```

The Core API remains the only writer to research PostgreSQL tables. It preserves all browser endpoints and WebSocket contracts. It sends workflow JSON to `POST /execute`; the ML service returns the pre-existing executor result unchanged. It forwards the uploaded face image to `POST /infer`; the affect service returns only valence/arousal and retains no image.

The ML service imports the existing `backend/app/execution` code without algorithm changes. Its semaphore defaults to two concurrent requests. The affect service initializes HSEmotion once per worker and defaults to one concurrent inference. Both services require `X-Internal-Service-Key`; they should receive no public Railway domain.

Core `/health` is process liveness. Core `/ready` verifies PostgreSQL and reports ML/affect service state as `healthy` or `unavailable`; unavailable inference does not prevent telemetry ingestion.
