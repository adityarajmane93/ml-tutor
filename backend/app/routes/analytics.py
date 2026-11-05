import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.db import SessionLocal
from app.models.database_models import EventModel, SAMMModel
from app.models.pydantic_schemas import Event, EventBatch, SAMMPayload
from app.services.websocket_manager import manager
from app.core.security import require_researcher_key

router = APIRouter()
logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _event_payload(event: Event, server_timestamp: str) -> dict:
    return {
        "event_id": event.event_id,
        "session_id": event.session_id,
        "study_id": event.study_id,
        "participant_id": event.participant_id,
        "timestamp": event.timestamp,
        "client_timestamp": event.client_timestamp or event.timestamp,
        "server_timestamp": server_timestamp,
        "client_sequence": event.client_sequence,
        "event_type": event.event_type,
        "action": event.action,
        "source": event.source,
        "schema_version": event.schema_version,
        "metadata": event.metadata,
    }


def _persist_events(events: list[Event]) -> tuple[list[dict], set[str]]:
    """Commit a batch atomically and report pre-existing event IDs as acks."""
    db: Session | None = None
    try:
        db = SessionLocal()
        event_ids = [event.event_id for event in events]
        existing_ids = {
            event_id
            for (event_id,) in db.query(EventModel.event_id)
            .filter(EventModel.event_id.in_(event_ids))
            .all()
        }
        created: list[dict] = []
        seen_ids = set(existing_ids)
        for event in events:
            if event.event_id in seen_ids:
                continue
            seen_ids.add(event.event_id)
            server_timestamp = _utc_now()
            db.add(
                EventModel(
                    event_id=event.event_id,
                    session_id=event.session_id,
                    timestamp=event.timestamp,
                    event_type=event.event_type,
                    action=event.action,
                    source=event.source,
                    schema_version=event.schema_version,
                    event_metadata=event.metadata,
                    study_id=event.study_id,
                    participant_id=event.participant_id,
                    client_timestamp=event.client_timestamp or event.timestamp,
                    server_timestamp=server_timestamp,
                    client_sequence=event.client_sequence,
                )
            )
            created.append(_event_payload(event, server_timestamp))
        db.commit()
        return created, existing_ids
    except SQLAlchemyError as exc:
        if db is not None:
            db.rollback()
        logger.exception("event_batch_commit_failed count=%s", len(events))
        raise HTTPException(status_code=503, detail="Event storage is unavailable") from exc
    finally:
        if db is not None:
            db.close()

@router.post("/log-event")
def log_event(event: Event, background_tasks: BackgroundTasks):
    created, existing_ids = _persist_events([event])
    for persisted_event in created:
        background_tasks.add_task(manager.broadcast_event, persisted_event)
    return {"status": "success", "duplicate": event.event_id in existing_ids}


@router.post("/log-events/batch")
def log_event_batch(payload: EventBatch, background_tasks: BackgroundTasks):
    created, existing_ids = _persist_events(payload.events)
    for persisted_event in created:
        background_tasks.add_task(manager.broadcast_event, persisted_event)
    return {
        "status": "success",
        "acknowledged_event_ids": [event.event_id for event in payload.events],
        "duplicate_event_ids": [event_id for event_id in existing_ids],
    }

@router.get("/events", dependencies=[Depends(require_researcher_key)])
def get_events():
    db: Session = SessionLocal()
    events = db.query(EventModel).all()
    result = [{"event_id": e.event_id, "session_id": e.session_id, "timestamp": e.timestamp, "event_type": e.event_type, "action": e.action, "source": e.source, "schema_version": e.schema_version, "metadata": e.event_metadata} for e in events]
    db.close()
    return result

@router.delete("/events", dependencies=[Depends(require_researcher_key)])
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
        dominance=payload.data.dominance,
        study_id=payload.study_id,
        participant_id=payload.participant_id,
        client_timestamp=payload.client_timestamp or payload.timestamp,
        server_timestamp=_utc_now(),
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

@router.get("/samm", dependencies=[Depends(require_researcher_key)])
def get_samms():
    db: Session = SessionLocal()
    samm_records = db.query(SAMMModel).all()
    result = [{"id": r.id, "timestamp": r.timestamp, "timeTakenToAnswer": r.time_taken_to_answer, "valence": r.valence, "arousal": r.arousal, "dominance": r.dominance} for r in samm_records]
    db.close()
    return result
