import os
import sys
import tempfile
import unittest
from pathlib import Path

database_file = tempfile.NamedTemporaryFile(prefix="ml-tutor-notes-", suffix=".db", delete=False)
database_file.close()
os.environ["DATABASE_URL"] = f"sqlite:///{database_file.name}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.db import Base, SessionLocal, engine
from app.models.pydantic_schemas import NotePayload
from app.routes import notes


class NoteAnchorPersistenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def test_note_round_trip_preserves_resource_anchor(self):
        anchor = {"version": 1, "start": {"blockId": "block-0", "offset": 2}, "end": {"blockId": "block-2", "offset": 4}, "selectedText": "fixture"}
        saved = __import__("asyncio").run(notes.save_note(NotePayload(session_id="session", node_type="preprocessingNode", highlighted_text="fixture", highlight_anchor=anchor, timestamp="1")))
        self.assertIsInstance(saved["note_id"], int)
        stored = notes.get_notes("session", "preprocessingNode")
        self.assertEqual(stored[0].highlight_anchor, anchor)
        self.assertEqual(__import__("asyncio").run(notes.delete_note(saved["note_id"]))["status"], "success")

    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        Path(database_file.name).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
