"""Authorization and scoping checks for the researcher-only API."""
import os
import tempfile
import unittest

from fastapi.testclient import TestClient


DATABASE_FILE = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
DATABASE_FILE.close()
os.environ["DATABASE_URL"] = f"sqlite:///{DATABASE_FILE.name}"
os.environ["RESEARCHER_API_KEY"] = "test-researcher-key"

from app.db.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.database_models import EventModel, StudyModel, StudySessionModel  # noqa: E402


class ResearchRoutesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.headers = {"X-Researcher-Key": "test-researcher-key"}

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        os.unlink(DATABASE_FILE.name)

    def setUp(self):
        db = SessionLocal()
        db.query(EventModel).delete()
        db.query(StudySessionModel).delete()
        db.query(StudyModel).delete()
        db.add_all([
            StudySessionModel(session_id="session-a", study_id="study-a", participant_id="participant-a", server_started_at="2026-01-01T00:00:00+00:00"),
            StudySessionModel(session_id="session-b", study_id="study-a", participant_id="participant-b", server_started_at="2026-01-02T00:00:00+00:00"),
            StudySessionModel(session_id="session-unassigned", study_id=None, participant_id=None, server_started_at="2026-01-03T00:00:00+00:00"),
            EventModel(event_id="event-a", session_id="session-a", timestamp="1", client_timestamp="2026-01-01T00:00:01+00:00", server_timestamp="2026-01-01T00:00:01+00:00", client_sequence=1, event_type="PIPELINE_EVENT", action="PIPELINE_STATE_UPDATED", source="frontend", schema_version="2.0", event_metadata={"nodes": []}),
            EventModel(event_id="event-b", session_id="session-b", timestamp="2", client_timestamp="2026-01-02T00:00:01+00:00", server_timestamp="2026-01-02T00:00:01+00:00", client_sequence=1, event_type="PIPELINE_EVENT", action="NODE_CREATED", source="frontend", schema_version="2.0", event_metadata={}),
        ])
        db.commit()
        db.close()

    def test_research_endpoints_reject_missing_or_invalid_keys(self):
        self.assertEqual(self.client.get("/research/studies").status_code, 401)
        self.assertEqual(self.client.get("/research/studies", headers={"X-Researcher-Key": "wrong"}).status_code, 401)

    def test_selection_and_session_records_are_scoped(self):
        studies = self.client.get("/research/studies", headers=self.headers)
        self.assertEqual(studies.status_code, 200)
        self.assertEqual({item["study_id"] for item in studies.json()["items"]}, {"0000", "study-a", None})

        participants = self.client.get("/research/participants?study_id=study-a", headers=self.headers)
        self.assertEqual({item["participant_id"] for item in participants.json()["items"]}, {"participant-a", "participant-b"})

        sessions = self.client.get("/research/sessions?study_id=study-a&participant_id=participant-a", headers=self.headers)
        self.assertEqual([item["session_id"] for item in sessions.json()["items"]], ["session-a"])

        snapshots = self.client.get("/research/sessions/session-a/workflow-snapshots", headers=self.headers)
        self.assertEqual([item["event_id"] for item in snapshots.json()["items"]], ["event-a"])

        other_events = self.client.get("/research/sessions/session-b/events", headers=self.headers)
        self.assertEqual([item["event_id"] for item in other_events.json()["items"]], ["event-b"])

    def test_default_study_lifecycle_and_session_assignment(self):
        default = self.client.get("/research/studies", headers=self.headers).json()["items"]
        self.assertEqual(next(item for item in default if item["study_id"] == "0000")["status"], "system-default")

        created = self.client.post("/research/studies", headers=self.headers, json={"name": "Formal study", "description": "fixture"})
        self.assertEqual(created.status_code, 200)
        study_id = created.json()["item"]["study_id"]
        self.assertEqual(created.json()["item"]["status"], "draft")
        self.assertEqual(self.client.post(f"/research/studies/{study_id}/start", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post("/research/studies", headers=self.headers, json={"name": "Second"}).status_code, 200)

        active_start = self.client.post("/sessions/start", json={"session_id": "active-session"})
        self.assertEqual(active_start.json()["study_id"], study_id)
        self.assertEqual(self.client.post(f"/research/studies/{study_id}/stop", headers=self.headers).status_code, 200)
        default_start = self.client.post("/sessions/start", json={"session_id": "default-session"})
        self.assertEqual(default_start.json()["study_id"], "0000")
        self.assertEqual(self.client.post("/sessions/start", json={"session_id": "active-session"}).json()["study_id"], study_id)

    def test_only_one_formal_study_can_be_active(self):
        first = self.client.post("/research/studies", headers=self.headers, json={"name": "One"}).json()["item"]["study_id"]
        second = self.client.post("/research/studies", headers=self.headers, json={"name": "Two"}).json()["item"]["study_id"]
        self.assertEqual(self.client.post(f"/research/studies/{first}/start", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post(f"/research/studies/{second}/start", headers=self.headers).status_code, 409)

    def test_study_name_cannot_be_only_whitespace(self):
        self.assertEqual(self.client.post("/research/studies", headers=self.headers, json={"name": "   "}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
