"""Persistent study lifecycle and immutable session-study assignment."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.database_models import StudyModel, StudySessionModel

DEFAULT_STUDY_ID = "0000"
DEFAULT_STUDY_NAME = "Testing / Development"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_default_study(db: Session) -> StudyModel:
    study = db.get(StudyModel, DEFAULT_STUDY_ID)
    if study is None:
        study = StudyModel(study_id=DEFAULT_STUDY_ID, name=DEFAULT_STUDY_NAME, description="Development, demonstrations, and informal testing.", status="system-default", created_at=utc_now())
        db.add(study)
        db.flush()
    return study


def active_formal_study(db: Session, *, lock: bool = False) -> StudyModel | None:
    query = db.query(StudyModel).filter(StudyModel.status == "active", StudyModel.study_id != DEFAULT_STUDY_ID)
    return (query.with_for_update() if lock else query).one_or_none()


def study_for_new_session(db: Session) -> str:
    ensure_default_study(db)
    active = active_formal_study(db, lock=True)
    return active.study_id if active is not None else DEFAULT_STUDY_ID


def study_for_session(db: Session, session_id: str) -> str | None:
    session = db.get(StudySessionModel, session_id)
    return session.study_id if session is not None else None
