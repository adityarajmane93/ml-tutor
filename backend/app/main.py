from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from app.db.db import (
    SessionLocal,
    engine,
)

from app.db.db import Base

from app.models.event import Event

from app.models.event_model import EventModel

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "ML-Tutor Event Logger Running"
    }


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