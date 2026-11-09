"""Authenticated, non-retrying clients for private ML-Tutor services."""
import logging
import os
import time

import httpx

logger = logging.getLogger(__name__)


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
    started_at = time.monotonic()
    logger.info("affect_worker_request_started service_url=%s timeout_seconds=%s", base_url, timeout)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url}/infer",
            files={"file": (filename, contents, content_type or "application/octet-stream")},
            headers={"X-Internal-Service-Key": _service_key()},
        )
    elapsed_ms = round((time.monotonic() - started_at) * 1000)
    if not response.is_success:
        logger.warning("affect_worker_request_failed service_url=%s status_code=%s elapsed_ms=%s", base_url, response.status_code, elapsed_ms)
    else:
        logger.info("affect_worker_response_received service_url=%s elapsed_ms=%s", base_url, elapsed_ms)
    response.raise_for_status()
    return response.json()
