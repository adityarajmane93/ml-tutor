import logging
from datetime import datetime, timezone

from app.db.db import SessionLocal
from app.models.database_models import AffectInferenceFailureModel, AffectModel

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_affect_sample(*, session_id: str, study_id: str | None, participant_id: str | None, timestamp: str, client_timestamp: str | None, valence: float, arousal: float) -> None:
    db = SessionLocal()
    try:
        db.add(AffectModel(session_id=session_id, study_id=study_id, participant_id=participant_id, timestamp=timestamp, client_timestamp=client_timestamp or timestamp, server_timestamp=_now(), valence=valence, arousal=arousal))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("affect_sample_persist_failed session_id=%s", session_id)
        raise
    finally:
        db.close()


def record_affect_failure(*, session_id: str, study_id: str | None, participant_id: str | None, timestamp: str, client_timestamp: str | None, reason: str) -> None:
    db = SessionLocal()
    try:
        db.add(AffectInferenceFailureModel(session_id=session_id, study_id=study_id, participant_id=participant_id, timestamp=timestamp, client_timestamp=client_timestamp or timestamp, server_timestamp=_now(), failure_reason=reason[:500]))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("affect_failure_persist_failed session_id=%s", session_id)
    finally:
        db.close()
