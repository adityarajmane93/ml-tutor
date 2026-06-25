from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.db.db import SessionLocal
from app.models.database_models import ConsentFormModel
from app.models.pydantic_schemas import ConsentFormPayload

router = APIRouter()

@router.post("/")
async def save_consent_form(payload: ConsentFormPayload):
    db: Session = SessionLocal()
    try:
        db_consent = ConsentFormModel(
            session_id=payload.session_id,
            p1_participant_name=payload.page_1.participant_name,
            p1_date=payload.page_1.date,
            p2_child_name=payload.page_2.child_name,
            p2_audio_consent=payload.page_2.audio_consent,
            p2_video_consent=payload.page_2.video_consent,
            p2_interview_consent=payload.page_2.interview_consent,
            p2_guardian_signature=payload.page_2.guardian_signature,
            p2_date=payload.page_2.date,
            p3_child_name=payload.page_3.child_name_optional,
            p3_guardian_name=payload.page_3.guardian_name_optional,
            p3_child_signature=payload.page_3.child_signature,
            p3_guardian_signature=payload.page_3.guardian_signature,
            p3_date=payload.page_3.date
        )
        db.add(db_consent)
        db.commit()
        return {"status": "success", "message": "Consent form safely saved", "session_id": payload.session_id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save consent: {str(e)}")
    finally:
        db.close()