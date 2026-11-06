import asyncio
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.affect_tracking import record_affect_failure, record_affect_sample
from app.services.internal_clients import infer_affect
from app.services.websocket_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)


def _image_limit() -> int:
    try:
        return int(os.getenv("AFFECT_MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))
    except ValueError:
        return 5 * 1024 * 1024


@router.post("/predict_valenceArousal")
async def predict_valenceArousal(
    file: UploadFile = File(...), session_id: str = Form(...), client_timestamp: Optional[str] = Form(None),
):
    filename = file.filename or "unknown_face.jpg"
    timestamp = filename.split("_", 1)[0]
    try:
        contents = await file.read()
        if len(contents) > _image_limit():
            raise ValueError("image_too_large")
        inference = await infer_affect(filename=filename, contents=contents, content_type=file.content_type)
        valence, arousal = float(inference["valence"]), float(inference["arousal"])
        await asyncio.to_thread(record_affect_sample, session_id=session_id, timestamp=timestamp, client_timestamp=client_timestamp, valence=valence, arousal=arousal)
        await manager.broadcast_event({"event_type": "AFFECT_STATE", "session_id": session_id, "timestamp": timestamp, "metadata": {"valence": valence, "arousal": arousal}})
        return {"status": "success", "valence": valence, "arousal": arousal}
    except (httpx.HTTPError, TimeoutError, KeyError, ValueError) as exc:
        logger.warning("affect_inference_failed session_id=%s reason=%s", session_id, type(exc).__name__)
        await asyncio.to_thread(record_affect_failure, session_id=session_id, timestamp=timestamp, client_timestamp=client_timestamp, reason=type(exc).__name__)
        return JSONResponse(status_code=500, content={"error": "Affect inference failed"})
    except Exception:
        logger.exception("affect_request_failed session_id=%s", session_id)
        await asyncio.to_thread(record_affect_failure, session_id=session_id, timestamp=timestamp, client_timestamp=client_timestamp, reason="core_processing_error")
        return JSONResponse(status_code=500, content={"error": "Affect inference failed"})
