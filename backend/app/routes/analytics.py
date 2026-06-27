from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.db import SessionLocal
from app.models.database_models import EventModel, SAMMModel
from app.models.pydantic_schemas import Event, SAMMPayload
from app.services.websocket_manager import manager

router = APIRouter()

@router.post("/log-event")
def log_event(event: Event, background_tasks: BackgroundTasks): 
    db: Session = SessionLocal()

    # 1. Safely handle the database transaction
    try:
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
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close() # Always close the connection!

    # 2. Offload the WebSocket broadcast to the background!
    background_tasks.add_task(
        manager.broadcast_event, 
        {
            "event_id": event.event_id,
            "session_id": event.session_id,
            "timestamp": event.timestamp,
            "event_type": event.event_type,
            "action": event.action,
            "source": event.source,
            "schema_version": event.schema_version,
            "metadata": event.metadata,
        }
    )

    return {"status": "success"}

@router.get("/events")
def get_events():
    db: Session = SessionLocal()
    events = db.query(EventModel).all()
    result = [{"event_id": e.event_id, "session_id": e.session_id, "timestamp": e.timestamp, "event_type": e.event_type, "action": e.action, "source": e.source, "schema_version": e.schema_version, "metadata": e.event_metadata} for e in events]
    db.close()
    return result

@router.delete("/events")
def clear_events():
    db: Session = SessionLocal()
    db.query(EventModel).delete()
    db.commit()
    db.close()
    return {"status": "all events deleted"}

@router.post("/samm")
async def log_samm(payload: SAMMPayload):
    db: Session = SessionLocal()
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
        return JSONResponse(status_code=500, content={"status": "error", "message": "Failed to save SAMM"})
    finally:
        db.close()

    await manager.broadcast_event({
        "event_type": "SAMM_ADJUSTMENT",
        "timestamp": payload.timestamp,
        "metadata": {"valence": payload.data.valence, "arousal": payload.data.arousal, "dominance": payload.data.dominance}
    })
    return {"status": "success", "message": "SAMM data logged"}

@router.get("/samm")
def get_samms():
    db: Session = SessionLocal()
    samm_records = db.query(SAMMModel).all()
    result = [{"id": r.id, "timestamp": r.timestamp, "timeTakenToAnswer": r.time_taken_to_answer, "valence": r.valence, "arousal": r.arousal, "dominance": r.dominance} for r in samm_records]
    db.close()
    return result