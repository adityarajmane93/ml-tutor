"""Researcher-authorized, read-only access to recorded study data."""

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import require_researcher_key
from app.db.db import SessionLocal
from app.models.database_models import (
    AffectModel,
    AffectInferenceFailureModel,
    ConsentFormModel,
    EventModel,
    GazeCalibrationModel,
    GazeSampleModel,
    PipelineExecutionModel,
    NoteModel,
    RppgModel,
    SAMMModel,
    StudySessionModel,
    StudyModel,
)
from app.models.pydantic_schemas import StudyCreatePayload
from app.services.studies import DEFAULT_STUDY_ID, active_formal_study, ensure_default_study, utc_now

router = APIRouter(
    prefix="/research",
    tags=["Research"],
    dependencies=[Depends(require_researcher_key)],
)


def _page(items: list[dict[str, Any]], limit: int, offset: int) -> dict[str, Any]:
    has_more = len(items) > limit
    visible_items = items[:limit]
    return {
        "items": visible_items,
        "limit": limit,
        "offset": offset,
        "next_offset": offset + limit if has_more else None,
    }


def _require_scope(value: str | None, include_unassigned: bool, label: str) -> None:
    if value is not None and include_unassigned:
        raise HTTPException(status_code=422, detail=f"Choose either {label} or unassigned {label}")
    if value is None and not include_unassigned:
        raise HTTPException(status_code=422, detail=f"A {label} selection is required")


def _apply_nullable_scope(query: Any, column: Any, value: str | None, include_unassigned: bool) -> Any:
    return query.filter(column.is_(None) if include_unassigned else column == value)


def _session_or_404(db: Session, session_id: str) -> StudySessionModel:
    session = db.get(StudySessionModel, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Recorded session not found")
    return session


def _delete_session_records(db: Session, session_id: str) -> dict[str, int]:
    """Delete one session's complete research record; caller owns the transaction."""
    models = {
        "events": EventModel, "notes": NoteModel, "affect_logs": AffectModel,
        "affect_inference_failures": AffectInferenceFailureModel, "samm_records": SAMMModel,
        "rppg_logs": RppgModel, "gaze_samples": GazeSampleModel,
        "gaze_calibrations": GazeCalibrationModel, "pipeline_executions": PipelineExecutionModel,
        "consent_forms": ConsentFormModel,
    }
    counts = {name: db.query(model).filter(model.session_id == session_id).delete(synchronize_session=False) for name, model in models.items()}
    counts["study_sessions"] = db.query(StudySessionModel).filter(StudySessionModel.session_id == session_id).delete(synchronize_session=False)
    return counts


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        counts = _delete_session_records(db, session_id)
        db.commit()
        return {"session_id": session_id, "deleted": counts}
    except HTTPException:
        db.rollback(); raise
    except Exception:
        db.rollback(); raise HTTPException(status_code=503, detail="Session deletion failed; no records were removed")
    finally:
        db.close()


@router.delete("/studies/0000/test-data")
def clear_test_data(confirmation: str = Query(...)) -> dict[str, Any]:
    if confirmation != "CLEAR 0000":
        raise HTTPException(status_code=422, detail="Confirmation must exactly match CLEAR 0000")
    db = SessionLocal()
    try:
        ensure_default_study(db)
        session_ids = [row[0] for row in db.query(StudySessionModel.session_id).filter(StudySessionModel.study_id == DEFAULT_STUDY_ID).all()]
        total: dict[str, int] = {}
        for session_id in session_ids:
            for name, count in _delete_session_records(db, session_id).items(): total[name] = total.get(name, 0) + count
        db.commit()
        return {"study_id": DEFAULT_STUDY_ID, "sessions_deleted": len(session_ids), "deleted": total}
    except HTTPException:
        db.rollback(); raise
    except Exception:
        db.rollback(); raise HTTPException(status_code=503, detail="Test-data cleanup failed; no records were removed")
    finally:
        db.close()


@router.get("/studies")
def list_studies() -> dict[str, list[dict[str, Any]]]:
    db = SessionLocal()
    try:
        ensure_default_study(db)
        db.commit()
        counts = dict(db.query(StudySessionModel.study_id, func.count(StudySessionModel.session_id)).group_by(StudySessionModel.study_id).all())
        studies = db.query(StudyModel).order_by(StudyModel.created_at.asc()).all()
        items = [_study_payload(study, counts.get(study.study_id, 0)) for study in studies]
        known_ids = {study.study_id for study in studies}
        for legacy_id, count in counts.items():
            if legacy_id is not None and legacy_id not in known_ids:
                items.append({"study_id": legacy_id, "name": f"Legacy study {legacy_id}", "description": None, "status": "legacy", "created_at": None, "started_at": None, "stopped_at": None, "session_count": count, "system_default": False})
        if counts.get(None, 0):
            items.append({"study_id": None, "name": "Historical unassigned sessions", "description": None, "status": "historical-unassigned", "created_at": None, "started_at": None, "stopped_at": None, "session_count": counts[None], "system_default": False})
        return {"items": items}
    finally:
        db.close()


def _study_payload(study: StudyModel, session_count: int) -> dict[str, Any]:
    return {"study_id": study.study_id, "name": study.name, "description": study.description, "status": study.status, "created_at": study.created_at, "started_at": study.started_at, "stopped_at": study.stopped_at, "session_count": session_count, "system_default": study.study_id == DEFAULT_STUDY_ID}


@router.get("/studies/active")
def get_active_study() -> dict[str, Any]:
    db = SessionLocal()
    try:
        ensure_default_study(db)
        db.commit()
        study = active_formal_study(db)
        return {"item": _study_payload(study, db.query(StudySessionModel).filter(StudySessionModel.study_id == study.study_id).count()) if study else None}
    finally:
        db.close()


@router.post("/studies")
def create_study(payload: StudyCreatePayload) -> dict[str, Any]:
    db = SessionLocal()
    try:
        ensure_default_study(db)
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Study name is required")
        study = StudyModel(study_id=str(uuid4()), name=name, description=payload.description.strip() if payload.description else None, status="draft", created_at=utc_now())
        db.add(study)
        db.commit()
        return {"item": _study_payload(study, 0)}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=503, detail="Study could not be created")
    finally:
        db.close()


@router.post("/studies/{study_id}/start")
def start_study(study_id: str) -> dict[str, Any]:
    if study_id == DEFAULT_STUDY_ID:
        raise HTTPException(status_code=422, detail="The testing study cannot be activated as a formal study")
    db = SessionLocal()
    try:
        ensure_default_study(db)
        active = active_formal_study(db, lock=True)
        if active is not None:
            raise HTTPException(status_code=409, detail="Another formal study is already active")
        study = db.get(StudyModel, study_id)
        if study is None:
            raise HTTPException(status_code=404, detail="Study not found")
        if study.status != "draft":
            raise HTTPException(status_code=409, detail="Only draft studies can be started")
        study.status = "active"
        study.started_at = utc_now()
        db.commit()
        return {"item": _study_payload(study, 0)}
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Another formal study is already active")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=503, detail="Study could not be started")
    finally:
        db.close()


@router.post("/studies/{study_id}/stop")
def stop_study(study_id: str) -> dict[str, Any]:
    if study_id == DEFAULT_STUDY_ID:
        raise HTTPException(status_code=422, detail="The testing study cannot be stopped")
    db = SessionLocal()
    try:
        study = db.query(StudyModel).filter(StudyModel.study_id == study_id).with_for_update().one_or_none()
        if study is None:
            raise HTTPException(status_code=404, detail="Study not found")
        if study.status != "active":
            raise HTTPException(status_code=409, detail="Only an active study can be stopped")
        study.status = "completed"
        study.stopped_at = utc_now()
        db.commit()
        return {"item": _study_payload(study, db.query(StudySessionModel).filter(StudySessionModel.study_id == study_id).count())}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=503, detail="Study could not be stopped")
    finally:
        db.close()


@router.get("/participants")
def list_participants(
    study_id: str | None = None,
    unassigned_study: bool = False,
) -> dict[str, list[dict[str, Any]]]:
    _require_scope(study_id, unassigned_study, "study")
    db = SessionLocal()
    try:
        query = _apply_nullable_scope(db.query(StudySessionModel), StudySessionModel.study_id, study_id, unassigned_study)
        rows = (
            query.with_entities(StudySessionModel.participant_id, func.count(StudySessionModel.session_id))
            .group_by(StudySessionModel.participant_id)
            .order_by(StudySessionModel.participant_id.asc().nullsfirst())
            .all()
        )
        return {"items": [{"participant_id": participant_id, "session_count": count} for participant_id, count in rows]}
    finally:
        db.close()


@router.get("/sessions")
def list_sessions(
    study_id: str | None = None,
    unassigned_study: bool = False,
    participant_id: str | None = None,
    unassigned_participant: bool = False,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    _require_scope(study_id, unassigned_study, "study")
    db = SessionLocal()
    try:
        query = _apply_nullable_scope(db.query(StudySessionModel), StudySessionModel.study_id, study_id, unassigned_study)
        if participant_id is not None or unassigned_participant:
            query = _apply_nullable_scope(query, StudySessionModel.participant_id, participant_id, unassigned_participant)
        rows = (
            query.order_by(StudySessionModel.server_started_at.asc())
            .offset(offset)
            .limit(limit + 1)
            .all()
        )
        return _page([_session_payload(row) for row in rows], limit, offset)
    finally:
        db.close()


def _session_payload(row: StudySessionModel) -> dict[str, Any]:
    return {
        "session_id": row.session_id,
        "study_id": row.study_id,
        "participant_id": row.participant_id,
        "client_started_at": row.client_started_at,
        "server_started_at": row.server_started_at,
        "client_ended_at": row.client_ended_at,
        "server_ended_at": row.server_ended_at,
    }


@router.get("/sessions/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    db = SessionLocal()
    try:
        return _session_payload(_session_or_404(db, session_id))
    finally:
        db.close()


@router.get("/sessions/{session_id}/events")
def get_session_events(session_id: str, limit: int = Query(default=200, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(EventModel).filter(EventModel.session_id == session_id).order_by(EventModel.server_timestamp.asc(), EventModel.client_sequence.asc()).offset(offset).limit(limit + 1).all()
        return _page([{
            "event_id": row.event_id, "session_id": row.session_id, "timestamp": row.timestamp,
            "client_timestamp": row.client_timestamp, "server_timestamp": row.server_timestamp,
            "client_sequence": row.client_sequence, "event_type": row.event_type, "action": row.action,
            "source": row.source, "schema_version": row.schema_version, "metadata": row.event_metadata,
        } for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/workflow-snapshots")
def get_workflow_snapshots(session_id: str, limit: int = Query(default=200, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(EventModel).filter(EventModel.session_id == session_id, EventModel.action == "PIPELINE_STATE_UPDATED").order_by(EventModel.server_timestamp.asc(), EventModel.client_sequence.asc()).offset(offset).limit(limit + 1).all()
        return _page([{
            "event_id": row.event_id, "timestamp": row.timestamp, "client_timestamp": row.client_timestamp,
            "server_timestamp": row.server_timestamp, "client_sequence": row.client_sequence,
            "metadata": row.event_metadata,
        } for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/executions")
def get_executions(session_id: str, limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(PipelineExecutionModel).filter(PipelineExecutionModel.session_id == session_id).order_by(PipelineExecutionModel.server_started_at.asc()).offset(offset).limit(limit + 1).all()
        return _page([{
            "execution_id": row.execution_id, "session_id": row.session_id, "client_started_at": row.client_started_at,
            "server_started_at": row.server_started_at, "server_completed_at": row.server_completed_at,
            "status": row.status, "request_metadata": row.request_metadata,
            "result_metadata": row.result_metadata, "error_message": row.error_message,
        } for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/affect")
def get_affect(session_id: str, limit: int = Query(default=500, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(AffectModel).filter(AffectModel.session_id == session_id).order_by(AffectModel.server_timestamp.asc()).offset(offset).limit(limit + 1).all()
        return _page([{"id": row.id, "timestamp": row.timestamp, "client_timestamp": row.client_timestamp, "server_timestamp": row.server_timestamp, "valence": row.valence, "arousal": row.arousal} for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/samm")
def get_samm(session_id: str, limit: int = Query(default=500, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(SAMMModel).filter(SAMMModel.session_id == session_id).order_by(SAMMModel.server_timestamp.asc()).offset(offset).limit(limit + 1).all()
        return _page([{"id": row.id, "timestamp": row.timestamp, "client_timestamp": row.client_timestamp, "server_timestamp": row.server_timestamp, "time_taken_to_answer": row.time_taken_to_answer, "valence": row.valence, "arousal": row.arousal, "dominance": row.dominance} for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/gaze-samples")
def get_gaze_samples(session_id: str, limit: int = Query(default=500, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(GazeSampleModel).filter(GazeSampleModel.session_id == session_id).order_by(GazeSampleModel.elapsed_ms.asc(), GazeSampleModel.client_timestamp.asc()).offset(offset).limit(limit + 1).all()
        return _page([{"sample_id": row.sample_id, "session_id": row.session_id, "client_timestamp": row.client_timestamp, "server_timestamp": row.server_timestamp, "elapsed_ms": row.elapsed_ms, "x": row.x, "y": row.y, "viewport_width": row.viewport_width, "viewport_height": row.viewport_height, "route": row.route, "aoi_type": row.aoi_type, "aoi_id": row.aoi_id, "calibration_id": row.calibration_id, "validity_metadata": row.validity_metadata} for row in rows], limit, offset)
    finally:
        db.close()


@router.get("/sessions/{session_id}/calibrations")
def get_calibrations(session_id: str, limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)) -> dict[str, Any]:
    db = SessionLocal()
    try:
        _session_or_404(db, session_id)
        rows = db.query(GazeCalibrationModel).filter(GazeCalibrationModel.session_id == session_id).order_by(GazeCalibrationModel.started_at.asc()).offset(offset).limit(limit + 1).all()
        return _page([{"calibration_id": row.calibration_id, "session_id": row.session_id, "started_at": row.started_at, "completed_at": row.completed_at, "viewport_width": row.viewport_width, "viewport_height": row.viewport_height, "calibration_metadata": row.calibration_metadata, "validation_metadata": row.validation_metadata, "median_error_px": row.median_error_px, "mean_error_px": row.mean_error_px, "quality_status": row.quality_status} for row in rows], limit, offset)
    finally:
        db.close()
