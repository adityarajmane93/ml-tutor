import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ["INTERNAL_SERVICE_API_KEY"] = "phase2-test-key"

from app.execution.executor import execute_pipeline as legacy_execute_pipeline
from services.ml_execution import app as ml_service


def fixture_pipeline() -> dict:
    rows = [
        {"x1": 0, "x2": 0, "target": "no"}, {"x1": 0, "x2": 1, "target": "no"},
        {"x1": 1, "x2": 0, "target": "yes"}, {"x1": 1, "x2": 1, "target": "yes"},
        {"x1": 2, "x2": 0, "target": "yes"}, {"x1": 2, "x2": 1, "target": "yes"},
        {"x1": -1, "x2": 0, "target": "no"}, {"x1": -1, "x2": 1, "target": "no"},
    ]
    return {
        "orderedPipeline": [
            {"id": "data", "type": "datasetNode", "data": {"dataset": rows, "selectedFeatures": ["x1", "x2"], "targetColumn": "target", "testSize": 25}},
            {"id": "model", "type": "modelNode", "data": {"algorithm": "decisionTree", "maxDepth": 3}},
            {"id": "evaluation", "type": "evaluationNode", "data": {}},
        ],
        "adjacency": {"data": ["model"], "model": ["evaluation"]},
        "executionOrder": ["data", "model", "evaluation"],
        "study_context": {"study_id": "study", "participant_id": "participant", "session_id": "session"},
    }


class PhaseTwoServiceTests(unittest.TestCase):
    def test_ml_service_uses_unchanged_execution_implementation(self):
        payload = fixture_pipeline()
        legacy_result = legacy_execute_pipeline(payload)
        service_result = ml_service.execute_pipeline(payload)
        self.assertEqual(service_result, legacy_result)

    def test_ml_timeout_is_explicit(self):
        async def slow_execution(*_args):
            await asyncio.sleep(0.05)
            return {}

        async def run():
            ml_service.app.state.semaphore = asyncio.Semaphore(1)
            with patch("services.ml_execution.app.run_in_threadpool", slow_execution), patch.dict(os.environ, {"ML_EXECUTION_TIMEOUT_SECONDS": "0.001"}):
                with self.assertRaises(Exception) as raised:
                    await ml_service.execute(ml_service.ExecutionRequest(**fixture_pipeline()), "phase2-test-key")
            self.assertEqual(getattr(raised.exception, "status_code", None), 504)

        asyncio.run(run())

    def test_affect_service_mocked_inference_and_authentication(self):
        from types import SimpleNamespace
        sys.modules["app.hsemotionNet"] = SimpleNamespace(get_predictions=lambda _: (0.25, -0.5))
        from services.affect_inference import app as affect_service

        class Upload:
            async def read(self, _limit):
                return b"image-bytes"

        async def run():
            affect_service.app.state.semaphore = asyncio.Semaphore(1)
            response = await affect_service.infer(Upload(), "phase2-test-key")
            self.assertEqual(response, {"valence": 0.25, "arousal": -0.5})

        asyncio.run(run())
