from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import asyncio

from app.db.db import SessionLocal
from app.hsemotionNet import get_predictions
from app.models.database_models import AffectModel
from app.services.websocket_manager import manager

router = APIRouter()

@router.post("/predict_valenceArousal") 
async def predict_valenceArousal(file: UploadFile = File(...), session_id: str = Form(...)):
    full_filename = file.filename 
    timestamp = full_filename.split('_')[0]
    
    try:
        contents = await file.read()
        result = await asyncio.to_thread(get_predictions, contents)

        if result:
            valence, arousal = result
            
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