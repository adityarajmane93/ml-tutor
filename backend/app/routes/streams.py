import json
import time
import asyncio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.db import SessionLocal
from app.services.websocket_manager import manager
from app.services.rppg_calculator import calculate_bpm_from_rgb, WINDOW_SIZE
from app.models.database_models import RppgModel

router = APIRouter()

rppg_buffers = {}
rppg_last_db_save = {}

@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
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
    await websocket.accept()
    print("---rPPG Fast-Stream Connected---")
    session_id = None
    frames_since_last_calc = 0 
    
    try:
        while True:
            try:
                raw_data = await websocket.receive_text()
                data = json.loads(raw_data)
                client_timestamp = str(data.get("timestamp", time.time()))
                session_id = data.get("session_id")
                r_val = data.get("r")
                g_val = data.get("g")
                b_val = data.get("b")

                if not session_id or r_val is None or g_val is None or b_val is None:
                    continue

                if session_id not in rppg_buffers:
                    rppg_buffers[session_id] = {"r": [], "g": [], "b": [], "frames": 0}
                    
                buf = rppg_buffers[session_id]
                buf["r"].append(float(r_val))
                buf["g"].append(float(g_val))
                buf["b"].append(float(b_val))
                buf["frames"] += 1
                frames_since_last_calc += 1 
                
                if len(buf["r"]) > WINDOW_SIZE:
                    buf["r"].pop(0)
                    buf["g"].pop(0)
                    buf["b"].pop(0)

                if len(buf["r"]) == WINDOW_SIZE and buf["frames"] >= 30:
                    buf["frames"] = 0
                    bpm = await asyncio.to_thread(
                        calculate_bpm_from_rgb,
                        np.array(buf["r"]),
                        np.array(buf["g"]),
                        np.array(buf["b"])
                    )

                    if bpm:
                        rounded_bpm = round(float(bpm), 1)
                        print(f" Live BPM: {rounded_bpm}")
                        now = time.time()
                        last_save = rppg_last_db_save.get(session_id, 0)

                        if now - last_save >= 10:
                            rppg_last_db_save[session_id] = now
                            db: Session = SessionLocal()
                            try:
                                db_entry = RppgModel(
                                    session_id=session_id,
                                    timestamp=str(data.get("timestamp", now)),
                                    bpm=float(round(bpm, 1))
                                )
                                db.add(db_entry)
                                db.commit()
                            except Exception as e:
                                db.rollback()
                                print(f"Failed to save BPM to DB: {e}")
                            finally:
                                db.close()
                        
                        await manager.broadcast_event({
                            "event_type": "RPPG_BPM",
                            "timestamp": client_timestamp,
                            "metadata": {"bpm": rounded_bpm}
                        })
                        
                        await websocket.send_json({"status": "live", "bpm": rounded_bpm})
                    else:
                        print("Waiting for rPPG inputs from frontend")
                        await websocket.send_json({"status": "live", "bpm": None})

            except WebSocketDisconnect:
                print("---rPPG Client Disconnected---")
                if session_id and session_id in rppg_buffers:
                    del rppg_buffers[session_id]
                break
            except RuntimeError:
                break
            except Exception as frame_error:
                print(f"⚠️ rPPG Frame Error: {frame_error}")
                break
                
    except WebSocketDisconnect:
        print("---rPPG Fast-Stream Disconnected---")
    except Exception as fatal_error:
        print(f"🛑 Fatal WebSocket Error: {fatal_error}")