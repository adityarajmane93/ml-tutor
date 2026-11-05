import asyncio
import hmac
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
import torch

# HSEmotion's current model loader requires legacy pickle loading. Scope the
# compatibility shim to this isolated service instead of the Core API process.
_original_load = torch.load


def _hsemotion_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_load(*args, **kwargs)


torch.load = _hsemotion_load

# This import intentionally lives only in the affect service process.
from app.hsemotionNet import get_predictions

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.semaphore = asyncio.Semaphore(_positive_int("AFFECT_MAX_CONCURRENCY", 1))
    yield


app = FastAPI(title="ML-Tutor Affect Inference Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "service": "affect-inference"}


@app.get("/ready")
def ready():
    """The model is loaded before the application starts serving requests."""
    return {"status": "ready", "service": "affect-inference"}


@app.post("/infer")
async def infer(file: UploadFile = File(...), x_internal_service_key: str | None = Header(default=None)):
    require_internal_key(x_internal_service_key)
    max_bytes = _positive_int("AFFECT_MAX_IMAGE_BYTES", 5 * 1024 * 1024)
    contents = await file.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail={"code": "image_too_large"})
    timeout_seconds = float(os.getenv("AFFECT_INFERENCE_TIMEOUT_SECONDS", "15"))
    try:
        async with app.state.semaphore:
            result = await asyncio.wait_for(asyncio.to_thread(get_predictions, contents), timeout=timeout_seconds)
    except TimeoutError as exc:
        logger.warning("affect_inference_timed_out timeout_seconds=%s", timeout_seconds)
        raise HTTPException(status_code=504, detail={"code": "inference_timeout"}) from exc
    except Exception as exc:
        logger.exception("affect_inference_failed")
        raise HTTPException(status_code=500, detail={"code": "inference_failed"}) from exc
    if result is None:
        raise HTTPException(status_code=400, detail={"code": "invalid_image"})
    valence, arousal = result
    return {"valence": float(valence), "arousal": float(arousal)}
