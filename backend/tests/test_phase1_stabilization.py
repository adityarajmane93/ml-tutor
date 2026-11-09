"""Phase 1 persistence, idempotency, and sensing-contract regression tests."""
import asyncio
import inspect
import os
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

database_file = tempfile.NamedTemporaryFile(prefix="ml-tutor-phase1-", suffix=".db", delete=False)
database_file.close()
os.environ["DATABASE_URL"] = f"sqlite:///{database_file.name}"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173"
os.environ["RESEARCHER_API_KEY"] = "test-researcher-key"
sys.modules.setdefault("app.hsemotionNet", SimpleNamespace(get_predictions=lambda _: (0.2, -0.1)))

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import OperationalError

from app.core.security import require_researcher_key
from app.db.db import Base, SessionLocal, engine
from app.models.database_models import AffectModel, EventModel, GazeCalibrationModel, GazeSampleModel, StudySessionModel
from app.models.pydantic_schemas import Event, GazeCalibrationPayload, GazeSampleBatch, GazeSamplePayload, SessionEndPayload, SessionStartPayload
from app.routes import affect, analytics, gaze, sessions
from app.services.rppg_calculator import calculate_bpm_from_rgb


class PhaseOneStabilizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        db = SessionLocal()
        for model in (EventModel, AffectModel, GazeSampleModel, GazeCalibrationModel, StudySessionModel):
            db.query(model).delete()
        db.commit()
        db.close()

    def _event(self, event_id: str) -> Event:
        return Event(
            event_id=event_id,
            session_id="session-a",
            timestamp="1735689600",
            client_timestamp="2025-01-01T00:00:00+00:00",
            client_sequence=1,
            event_type="CLICK_EVENT",
            action="TEST",
            source="test",
            schema_version="1.1",
            metadata={"test": True},
        )

    def test_session_start_is_idempotent_and_end_is_explicit(self):
        start = SessionStartPayload(session_id="session-a")
        self.assertEqual(sessions._start_session(start)["status"], "started")
        self.assertEqual(sessions._start_session(start)["status"], "existing")
        ended = sessions._end_session(
            "session-a",
            SessionEndPayload(),
        )
        self.assertEqual(ended["status"], "ended")

    def test_batch_deduplicates_and_records_client_server_timestamps(self):
        events = [self._event("event-1"), self._event("event-2")]
        created, duplicates = analytics._persist_events(events)
        created_again, duplicates_again = analytics._persist_events(events)
        self.assertEqual(len(created), 2)
        self.assertEqual(duplicates, set())
        self.assertEqual(created_again, [])
        self.assertEqual(duplicates_again, {"event-1", "event-2"})
        db = SessionLocal()
        stored = db.get(EventModel, "event-1")
        self.assertEqual(stored.client_timestamp, "2025-01-01T00:00:00+00:00")
        self.assertIsNotNone(stored.server_timestamp)
        db.close()

    def test_database_failure_returns_no_acknowledgement(self):
        def unavailable_session():
            raise OperationalError("connect", {}, RuntimeError("unavailable"))

        with patch("app.routes.analytics.SessionLocal", unavailable_session):
            with self.assertRaises(HTTPException) as raised:
                analytics._persist_events([self._event("event-failure")])
        self.assertEqual(raised.exception.status_code, 503)

    def test_concurrent_ingestion_keeps_unique_events(self):
        events = [self._event(f"event-{index}") for index in range(20)]
        with ThreadPoolExecutor(max_workers=5) as executor:
            list(executor.map(lambda event: analytics._persist_events([event]), events))
        db = SessionLocal()
        self.assertEqual(db.query(func.count(EventModel.event_id)).scalar(), 20)
        db.close()

    def test_researcher_key_is_required(self):
        with self.assertRaises(HTTPException) as raised:
            require_researcher_key("wrong-key")
        self.assertEqual(raised.exception.status_code, 401)
        self.assertIsNone(require_researcher_key("test-researcher-key"))

    def test_affect_route_uses_session_only_contract(self):
        parameters = inspect.signature(affect.predict_valenceArousal).parameters
        self.assertTrue({"session_id", "client_timestamp"}.issubset(parameters))
        self.assertFalse({"study_id", "participant_id"}.intersection(parameters))
        self.assertTrue(callable(affect.infer_affect))

    def test_gaze_batch_is_session_bound_and_idempotent(self):
        sessions._start_session(SessionStartPayload(session_id="gaze-session"))
        calibration = GazeCalibrationPayload(
            calibration_id="calibration-1", session_id="gaze-session", started_at="2026-01-01T00:00:00Z",
            viewport_width=1280, viewport_height=720, quality_status="acceptable",
        )
        self.assertEqual(gaze.save_calibration(calibration)["status"], "saved")
        batch = GazeSampleBatch(samples=[GazeSamplePayload(
            sample_id="sample-1", session_id="gaze-session", client_timestamp="2026-01-01T00:00:01Z",
            elapsed_ms=1000, x=100, y=200, viewport_width=1280, viewport_height=720,
            route="/sandbox", aoi_type="dataset_node", aoi_id="1", calibration_id="calibration-1",
        )])
        self.assertEqual(gaze.save_samples(batch)["created_sample_ids"], ["sample-1"])
        self.assertEqual(gaze.save_samples(batch)["duplicate_sample_ids"], ["sample-1"])

    def test_rppg_calculation_contract_is_unchanged(self):
        import numpy as np

        sample_count = 400
        seconds = np.arange(sample_count) / 30.0
        pulse = np.sin(2 * np.pi * 1.2 * seconds)
        bpm = calculate_bpm_from_rgb(100 + pulse, 120 + pulse, 110 + pulse)
        self.assertIsNotNone(bpm)
        self.assertGreater(bpm, 40)
        self.assertLess(bpm, 220)

    def test_rppg_uses_observed_sample_rate_when_timestamps_are_available(self):
        import numpy as np

        sample_count = 400
        timestamps = np.arange(sample_count) / 20.0
        pulse = np.sin(2 * np.pi * 1.2 * timestamps)
        bpm = calculate_bpm_from_rgb(100 + 0.2 * pulse, 120 + pulse, 110 + 0.5 * pulse, timestamps)
        self.assertIsNotNone(bpm)
        self.assertAlmostEqual(bpm, 72, delta=3)

    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        Path(database_file.name).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
