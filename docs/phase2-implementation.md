# Phase 2 implementation

Phase 2 removes Torch/HSEmotion initialization from `backend/app/main.py`. `backend/app/routes/pipeline.py` now forwards execution to the internal ML service and continues Core-owned execution tracking. `backend/app/routes/affect.py` forwards inference and Core persists either the returned affect sample or an additive `affect_inference_failures` audit record.

Migration `20261105_03` only creates `affect_inference_failures`; it does not modify or delete existing records. Existing Phase 1 session, batch event, CORS, researcher-key, and WebSocket behavior remains in Core.

Internal calls have explicit timeouts and no automatic retry. A timeout response cannot stop a CPU thread already running inside an internal service; concurrency limits reduce this risk but benchmark-driven process isolation remains a deployment requirement.
