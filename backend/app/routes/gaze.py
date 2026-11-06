"""Bounded, idempotent ingestion for browser-side gaze estimates.

No image or video data reaches this route.  The browser sends only sampled
coordinates and calibration summaries produced by WebGazer.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import IntegrityError

from app.db.db import SessionLocal
from app.models.database_models import GazeCalibrationModel, GazeSampleModel, StudySessionModel
from app.models.pydantic_schemas import GazeCalibrationPayload, GazeSampleBatch

router = APIRouter(prefix="/gaze", tags=["Gaze"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_session(db, session_id: str) -> None:
    if db.get(StudySessionModel, session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")


@router.post("/calibrations")
def save_calibration(payload: GazeCalibrationPayload):
    db = SessionLocal()
    try:
        _require_session(db, payload.session_id)
        existing = db.get(GazeCalibrationModel, payload.calibration_id)
        if existing:
            if existing.session_id != payload.session_id:
                raise HTTPException(status_code=409, detail="Calibration ID belongs to another session")
            return {"status": "existing", "calibration_id": existing.calibration_id}
        db.add(GazeCalibrationModel(**payload.model_dump()))
        db.commit()
        return {"status": "saved", "calibration_id": payload.calibration_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Calibration storage is unavailable") from exc
    finally:
        db.close()


@router.post("/samples/batch")
def save_samples(payload: GazeSampleBatch):
    session_ids = {sample.session_id for sample in payload.samples}
    if len(session_ids) != 1:
        raise HTTPException(status_code=422, detail="A batch must contain one session")
    db = SessionLocal()
    try:
        _require_session(db, next(iter(session_ids)))
        ids = [sample.sample_id for sample in payload.samples]
        existing = {
            sample_id for (sample_id,) in db.query(GazeSampleModel.sample_id)
            .filter(GazeSampleModel.sample_id.in_(ids)).all()
        }
        created = []
        for sample in payload.samples:
            if sample.sample_id in existing:
                continue
            record = sample.model_dump()
            record["server_timestamp"] = _now()
            db.add(GazeSampleModel(**record))
            created.append(sample.sample_id)
        db.commit()
        return {
            "status": "success",
            "acknowledged_sample_ids": ids,
            "duplicate_sample_ids": [sample_id for sample_id in ids if sample_id in existing],
            "created_sample_ids": created,
        }
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Gaze sample conflict") from exc
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Gaze storage is unavailable") from exc
    finally:
        db.close()
