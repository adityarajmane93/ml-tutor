import asyncio
import hmac
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.execution.executor import execute_pipeline

logger = logging.getLogger(__name__)


def _positive_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, str(default))))
    except ValueError:
        return default


def _internal_key() -> str:
    key = os.getenv("INTERNAL_SERVICE_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Internal service authentication is not configured")
    return key


def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if not x_internal_service_key or not hmac.compare_digest(x_internal_service_key, _internal_key()):
        raise HTTPException(status_code=401, detail="Internal service access required")


class ExecutionRequest(BaseModel):
    orderedPipeline: list[dict[str, Any]]
    adjacency: dict[str, list[str]]
    executionOrder: list[str] | None = None
    study_context: dict[str, Any] | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.semaphore = asyncio.Semaphore(_positive_int("ML_MAX_CONCURRENCY", 2))
    yield


app = FastAPI(title="ML-Tutor ML Execution Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-execution"}


@app.get("/ready")
def ready():
    """Report that this process finished startup and can accept executions."""
    return {"status": "ready", "service": "ml-execution"}


@app.post("/execute", dependencies=[])
async def execute(payload: ExecutionRequest, x_internal_service_key: str | None = Header(default=None)):
    require_internal_key(x_internal_service_key)
    timeout_seconds = float(os.getenv("ML_EXECUTION_TIMEOUT_SECONDS", "60"))
    try:
        async with app.state.semaphore:
            return await asyncio.wait_for(run_in_threadpool(execute_pipeline, payload.model_dump()), timeout=timeout_seconds)
    except TimeoutError as exc:
        logger.warning("ml_execution_timed_out timeout_seconds=%s", timeout_seconds)
        raise HTTPException(status_code=504, detail={"code": "execution_timeout", "message": "Pipeline execution timed out"}) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("ml_execution_failed")
        raise HTTPException(status_code=422, detail={"code": "execution_failed", "message": str(exc)}) from exc
