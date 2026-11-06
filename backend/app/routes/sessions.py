import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.exc import IntegrityError

from app.db.db import SessionLocal
from app.models.database_models import StudySessionModel
from app.models.pydantic_schemas import SessionEndPayload, SessionStartPayload
from app.services.studies import study_for_new_session

logger = logging.getLogger(__name__)
router = APIRouter()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _start_session(payload: SessionStartPayload) -> dict:
    db = SessionLocal()
    try:
        existing = db.get(StudySessionModel, payload.session_id)
        if existing:
            return {
                "status": "existing",
                "session_id": existing.session_id,
                "server_started_at": existing.server_started_at,
                "server_ended_at": existing.server_ended_at,
                "study_id": existing.study_id,
            }

        session = StudySessionModel(
            session_id=payload.session_id,
            study_id=study_for_new_session(db),
            participant_id=None,
            client_started_at=payload.client_started_at,
            server_started_at=_utc_now(),
        )
        db.add(session)
        db.commit()
        return {
            "status": "started",
            "session_id": session.session_id,
            "server_started_at": session.server_started_at,
            "server_ended_at": None,
            "study_id": session.study_id,
        }
    except IntegrityError:
        # Concurrent start attempts for the same UUID are idempotent.
        db.rollback()
        existing = db.get(StudySessionModel, payload.session_id)
        if existing:
            return {
                "status": "existing",
                "session_id": existing.session_id,
                "server_started_at": existing.server_started_at,
                "server_ended_at": existing.server_ended_at,
                "study_id": existing.study_id,
            }
        logger.exception("session_start_conflict session_id=%s", payload.session_id)
        raise HTTPException(status_code=409, detail="Unable to start session")
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("session_start_failed session_id=%s", payload.session_id)
        raise HTTPException(status_code=503, detail="Session storage is unavailable")
    finally:
        db.close()


def _end_session(session_id: str, payload: SessionEndPayload) -> dict:
    db = SessionLocal()
    try:
        session = db.get(StudySessionModel, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.server_ended_at:
            return {"status": "already_ended", "session_id": session_id, "server_ended_at": session.server_ended_at}

        session.client_ended_at = payload.client_ended_at
        session.server_ended_at = _utc_now()
        db.commit()
        return {"status": "ended", "session_id": session_id, "server_ended_at": session.server_ended_at}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("session_end_failed session_id=%s", session_id)
        raise HTTPException(status_code=503, detail="Session storage is unavailable")
    finally:
        db.close()


@router.post("/start")
async def start_session(payload: SessionStartPayload):
    return await run_in_threadpool(_start_session, payload)


@router.post("/{session_id}/end")
async def end_session(session_id: str, payload: SessionEndPayload):
    return await run_in_threadpool(_end_session, session_id, payload)
