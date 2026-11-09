import json
import logging
import time
import asyncio
from datetime import datetime, timezone
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.db import SessionLocal
from app.services.websocket_manager import manager
from app.services.rppg_calculator import calculate_bpm_from_rgb, WINDOW_SIZE
from app.models.database_models import RppgModel
from app.services.studies import study_for_session
from app.core.security import validate_websocket_access

router = APIRouter()

rppg_buffers = {}
rppg_last_db_save = {}
logger = logging.getLogger(__name__)

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    if not await validate_websocket_access(websocket, researcher_only=True):
        return
    await manager.connect_dashboard(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            event_data = json.loads(data)
            await manager.broadcast_event(event_data)
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)

@router.websocket("/rppg")
async def rppg_websocket(websocket: WebSocket):
    if not await validate_websocket_access(websocket):
        return
    await websocket.accept()
    logger.info("rppg_socket_connected")
    session_id = None
    
    try:
        while True:
            try:
                raw_data = await websocket.receive_text()
                data = json.loads(raw_data)
                session_id = data.get("session_id")
                client_timestamp = str(data.get("client_timestamp", data.get("timestamp", time.time())))
                sample_timestamp = float(data.get("timestamp", time.time()))
                r_val = data.get("r")
                g_val = data.get("g")
                b_val = data.get("b")

                if not session_id or r_val is None or g_val is None or b_val is None:
                    logger.warning("rppg_sample_rejected reason=missing_fields")
                    continue

                channels = np.array([r_val, g_val, b_val], dtype=np.float64)
                if not np.all(np.isfinite(channels)) or not np.isfinite(sample_timestamp):
                    logger.warning("rppg_sample_rejected session_id=%s reason=non_finite_values", session_id)
                    continue

                if session_id not in rppg_buffers:
                    rppg_buffers[session_id] = {"r": [], "g": [], "b": [], "timestamps": [], "since_last_calc": 0, "accepted": 0}
                    logger.info("rppg_buffer_started session_id=%s", session_id)
                    
                buf = rppg_buffers[session_id]
                if buf["timestamps"] and sample_timestamp <= buf["timestamps"][-1]:
                    logger.warning("rppg_sample_rejected session_id=%s reason=non_monotonic_timestamp", session_id)
                    continue
                buf["r"].append(float(channels[0]))
                buf["g"].append(float(channels[1]))
                buf["b"].append(float(channels[2]))
                buf["timestamps"].append(sample_timestamp)
                buf["accepted"] += 1
                buf["since_last_calc"] += 1
                if buf["accepted"] % 30 == 0:
                    logger.info("rppg_samples_accepted session_id=%s count=%s", session_id, buf["accepted"])
                
                if len(buf["r"]) > WINDOW_SIZE:
                    buf["r"].pop(0)
                    buf["g"].pop(0)
                    buf["b"].pop(0)
                    buf["timestamps"].pop(0)

                if len(buf["r"]) == WINDOW_SIZE and buf["since_last_calc"] >= 30:
                    buf["since_last_calc"] = 0
                    try:
                        bpm = await asyncio.to_thread(
                            calculate_bpm_from_rgb,
                            np.array(buf["r"]),
                            np.array(buf["g"]),
                            np.array(buf["b"]),
                            np.array(buf["timestamps"]),
                        )
                    except ValueError as exc:
                        logger.warning("rppg_bpm_unavailable session_id=%s reason=%s", session_id, str(exc))
                        await websocket.send_json({"status": "live", "bpm": None, "reason": "invalid_sample_rate"})
                        continue

                    if bpm:
                        rounded_bpm = round(float(bpm), 1)
                        observed_fps = 1.0 / float(np.median(np.diff(buf["timestamps"])))
                        logger.info("rppg_bpm_calculated session_id=%s bpm=%s sample_rate_hz=%.2f", session_id, rounded_bpm, observed_fps)
                        now = time.time()
                        last_save = rppg_last_db_save.get(session_id, 0)

                        if now - last_save >= 10:
                            rppg_last_db_save[session_id] = now
                            db: Session = SessionLocal()
                            try:
                                db_entry = RppgModel(
                                    session_id=session_id,
                                    timestamp=str(data.get("timestamp", now)),
                                    bpm=float(round(bpm, 1)),
                                    study_id=study_for_session(db, session_id),
                                    participant_id=None,
                                    client_timestamp=str(client_timestamp),
                                    server_timestamp=datetime.now(timezone.utc).isoformat(),
                                )
                                db.add(db_entry)
                                db.commit()
                            except Exception:
                                db.rollback()
                                logger.exception("rppg_bpm_persist_failed session_id=%s", session_id)
                            finally:
                                db.close()
                        
                        await manager.broadcast_event({
                            "event_type": "RPPG_BPM",
                            "timestamp": client_timestamp,
                            "metadata": {"bpm": rounded_bpm}
                        })
                        
                        await websocket.send_json({"status": "live", "bpm": rounded_bpm})
                    else:
                        logger.info("rppg_bpm_unavailable session_id=%s reason=no_peak", session_id)
                        await websocket.send_json({"status": "live", "bpm": None})

            except WebSocketDisconnect:
                logger.info("rppg_socket_disconnected session_id=%s", session_id)
                if session_id and session_id in rppg_buffers:
                    del rppg_buffers[session_id]
                break
            except RuntimeError as exc:
                logger.warning("rppg_socket_runtime_error session_id=%s reason=%s", session_id, type(exc).__name__)
                break
            except Exception as frame_error:
                logger.exception("rppg_frame_processing_failed session_id=%s reason=%s", session_id, type(frame_error).__name__)
                break
                
    except WebSocketDisconnect:
        logger.info("rppg_socket_disconnected session_id=%s", session_id)
    except Exception as fatal_error:
        logger.exception("rppg_socket_fatal_error session_id=%s reason=%s", session_id, type(fatal_error).__name__)
