import asyncio
import os
import unittest
from unittest.mock import patch

os.environ["INTERNAL_SERVICE_API_KEY"] = "internal-test-key"
os.environ["ML_EXECUTION_SERVICE_URL"] = "http://ml.internal"
os.environ["AFFECT_INFERENCE_SERVICE_URL"] = "http://affect.internal"

from app.services import internal_clients


class _Response:
    def __init__(self, payload):
        self.payload = payload
        self.is_success = True
        self.status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class _Client:
    requests = []

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, url, **kwargs):
        self.requests.append((url, kwargs))
        return _Response({"valence": 0.1, "arousal": -0.2} if url.endswith("/infer") else {"evaluations": {}})


class InternalClientTests(unittest.TestCase):
    def test_clients_send_authenticated_non_retrying_requests(self):
        async def run():
            with patch.dict(os.environ, {"INTERNAL_SERVICE_API_KEY": "internal-test-key", "ML_EXECUTION_SERVICE_URL": "http://ml.internal", "AFFECT_INFERENCE_SERVICE_URL": "http://affect.internal"}), patch("app.services.internal_clients.httpx.AsyncClient", _Client):
                result = await internal_clients.execute_pipeline({"orderedPipeline": [], "adjacency": {}})
                affect = await internal_clients.infer_affect(filename="f.jpg", contents=b"image", content_type="image/jpeg")
            self.assertEqual(result, {"evaluations": {}})
            self.assertEqual(affect, {"valence": 0.1, "arousal": -0.2})

        _Client.requests.clear()
        asyncio.run(run())
        self.assertEqual(_Client.requests[0][0], "http://ml.internal/execute")
        self.assertEqual(_Client.requests[1][0], "http://affect.internal/infer")
        for _, request in _Client.requests:
            self.assertEqual(request["headers"]["X-Internal-Service-Key"], "internal-test-key")
