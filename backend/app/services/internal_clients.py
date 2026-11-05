"""Authenticated, non-retrying clients for private ML-Tutor services."""
import os

import httpx


def _service_key() -> str:
    key = os.getenv("INTERNAL_SERVICE_API_KEY")
    if not key:
        raise RuntimeError("INTERNAL_SERVICE_API_KEY is not configured")
    return key


def _timeout(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


async def execute_pipeline(payload: dict) -> dict:
    base_url = os.getenv("ML_EXECUTION_SERVICE_URL", "http://localhost:8001").rstrip("/")
    timeout = _timeout("ML_EXECUTION_TIMEOUT_SECONDS", 60.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url}/execute",
            json=payload,
            headers={"X-Internal-Service-Key": _service_key()},
        )
    response.raise_for_status()
    return response.json()


async def infer_affect(
    *,
    filename: str,
    contents: bytes,
    content_type: str | None,
) -> dict:
    base_url = os.getenv("AFFECT_INFERENCE_SERVICE_URL", "http://localhost:8002").rstrip("/")
    timeout = _timeout("AFFECT_INFERENCE_TIMEOUT_SECONDS", 15.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url}/infer",
            files={"file": (filename, contents, content_type or "application/octet-stream")},
            headers={"X-Internal-Service-Key": _service_key()},
        )
    response.raise_for_status()
    return response.json()
