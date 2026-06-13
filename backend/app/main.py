import json
import os
import traceback
from pydantic import BaseModel
from typing import Optional
from fastapi import FastAPI, Request, File, UploadFile, WebSocket, WebSocketDisconnect, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Session

from app.hsemotionNet import get_predictions

from app.db.db import (
    SessionLocal,
    engine,
)

from app.db.db import Base

from app.models.event import Event

from app.models.event_model import EventModel

from app.routes.pipeline import router as pipeline_router

from app.models.samm import SAMMPayload
 
from app.models.samm_model import SAMMModel

from app.models.affect_model import AffectModel

from app.db.db import SessionLocal



class NoteModel(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    node_type = Column(String)
    highlighted_text = Column(String, nullable=True)
    start_index = Column(Integer, nullable=True) 
    end_index = Column(Integer, nullable=True)   
    custom_note = Column(String, nullable=True)
    timestamp = Column(String)

Base.metadata.create_all(bind=engine)
app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        # A list to hold all active dashboard connections
        self.active_dashboards: list[WebSocket] = []

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.active_dashboards.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        self.active_dashboards.remove(websocket)

    async def broadcast_event(self, event_data: dict):
        # Send the live event to every connected analytics dashboard
        for connection in self.active_dashboards:
            await connection.send_json(event_data)

manager = ConnectionManager()

# Define the expected JSON payload from React
class NotePayload(BaseModel):
    session_id: str
    node_type: str
    highlighted_text: Optional[str] = None
    start_index: Optional[int] = None 
    end_index: Optional[int] = None   
    custom_note: Optional[str] = None
    timestamp: str


@app.get("/")
def root():
    return {
        "message": "ML-Tutor Event Logger Running"
    }


@app.exception_handler(Exception)
async def validation_exception_handler(request: Request, exc: Exception):
    # 1. Keeps the full error traceback in your terminal so you can still debug
    print("\n=== !!! BACKEND ERROR !!! ===")
    traceback.print_exc()
    print("=======================================\n")
    
    # 2. Sends a clean 400 Bad Request status code back to your React app
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": "Pipeline processing failed"}
    )

app.include_router(pipeline_router)

@app.post("/log-event")
def log_event(event: Event):
    db: Session = SessionLocal()

    db_event = EventModel(
        event_id=event.event_id,
        session_id=event.session_id,
        timestamp=event.timestamp,
        event_type=event.event_type,
        action=event.action,
        source=event.source,
        schema_version=event.schema_version,
        event_metadata=event.metadata,
    )

    db.add(db_event)

    db.commit()

    db.close()

    return {
        "status": "success"
    }

@app.post("/samm")
async def log_samm(payload: SAMMPayload):
    db: Session = SessionLocal()

    # Create a new database record
    db_samm = SAMMModel(
        session_id=payload.session_id,
        timestamp=payload.timestamp,
        time_taken_to_answer=payload.timeTakenToAnswer,
        valence=payload.data.valence,
        arousal=payload.data.arousal,
        dominance=payload.data.dominance
    )

    try:
        db.add(db_samm)
        db.commit()
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to save SAMM data to database."}
        )
    finally:
        db.close()

    # 2. Broadcast the event to the Analytics Dashboard
    await manager.broadcast_event({
        "event_type": "SAMM_ADJUSTMENT",
        "timestamp": payload.timestamp,
        "metadata": {
            "valence": payload.data.valence,
            "arousal": payload.data.arousal,
            "dominance": payload.data.dominance
        }
    })

    return {
        "status": "success",
        "message": "SAMM data securely logged and broadcasted"
    }

@app.get("/samm")
def get_samms():
    db: Session = SessionLocal()

    # Fetch all SAMM records from the database
    samm_records = db.query(SAMMModel).all()

    result = []
    for record in samm_records:
        result.append({
            "id": record.id,
            "timestamp": record.timestamp,
            "timeTakenToAnswer": record.time_taken_to_answer,
            "valence": record.valence,
            "arousal": record.arousal,
            "dominance": record.dominance
        })

    db.close()
    return result

@app.get("/events")
def get_events():
    db: Session = SessionLocal()

    events = db.query(EventModel).all()

    result = []

    for event in events:
        result.append({
            "event_id": event.event_id,
            "session_id": event.session_id,
            "timestamp": event.timestamp,
            "event_type": event.event_type,
            "action": event.action,
            "source": event.source,
            "schema_version": event.schema_version,
            "metadata": event.event_metadata,
        })

    db.close()

    return result

@app.delete("/events")
def clear_events():
    db: Session = SessionLocal()
    db.query(EventModel).delete()
    db.commit()
    db.close()
    return {
        "status": "all events deleted"
    }


@app.post("/predict_valenceArousal") 
async def predict_valenceArousal(file: UploadFile = File(...), session_id: str = Form(...)):
    full_filename = file.filename 
    timestamp = full_filename.split('_')[0]
    
    try:
        contents = await file.read()
        result = get_predictions(contents)

        if result:
            valence, arousal = result
            
            # --- SUPABASE DATABASE WRITE ---
            db: Session = SessionLocal()
            try:
                db_affect = AffectModel(
                    session_id=session_id,
                    timestamp=timestamp, 
                    valence=valence, 
                    arousal=arousal
                )
                db.add(db_affect)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Database error: {e}")
            finally:
                db.close()
            # ------------------------------
            await manager.broadcast_event({
                "event_type": "AFFECT_STATE",
                "timestamp": timestamp,
                "metadata": {
                    "valence": valence,
                    "arousal": arousal
                }
            })

            return {"status": "success", "valence": valence, "arousal": arousal}
        else:
            return JSONResponse(status_code=400, content={"error": "Failed to decode image"})
        
    except Exception as e:
        print(f"Error processing face frame: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    # 1. Accept the connection from the React Analytics Dashboard
    await manager.connect_dashboard(websocket)
    try:
        while True:
            # 2. Wait for incoming messages from the ML-Tutor frontend
            data = await websocket.receive_text()
            
            # 3. Convert the string to a dictionary
            event_data = json.loads(data)
            
            # 4. Instantly broadcast it to all open Analytics Dashboards!
            await manager.broadcast_event(event_data)
            
    except WebSocketDisconnect:
        # 5. Clean up when the user closes the dashboard tab
        manager.disconnect_dashboard(websocket)


@app.post("/notes")
async def save_note(payload: NotePayload):
    db: Session = SessionLocal()
    
    db_note = NoteModel(
        session_id=payload.session_id,
        node_type=payload.node_type,
        highlighted_text=payload.highlighted_text,
        start_index=payload.start_index, 
        end_index=payload.end_index,     
        custom_note=payload.custom_note,
        timestamp=payload.timestamp
    )
    
    try:
        db.add(db_note)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to save note: {e}")
        return JSONResponse(status_code=500, content={"status": "error"})
    finally:
        db.close()
        
    return {"status": "success", "message": "Note saved"}

@app.get("/notes")
def get_notes(session_id: str, node_type: Optional[str] = None):
    db: Session = SessionLocal()
    
    try:
        query = db.query(NoteModel).filter(NoteModel.session_id == session_id)
        
        # If a specific node is clicked, filter by it. Otherwise, return all!
        if node_type and node_type != "allNotes":
            query = query.filter(NoteModel.node_type == node_type)
            
        # Order by newest first
        notes = query.order_by(NoteModel.timestamp.desc()).all()
        return notes
        
    finally:
        db.close()
        
@app.delete("/notes/{note_id}")
async def delete_note(note_id: int):
    db: Session = SessionLocal()
    try:
        db.query(NoteModel).filter(NoteModel.id == note_id).delete()
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"status": "error"})
    finally:
        db.close()
