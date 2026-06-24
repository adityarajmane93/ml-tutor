from typing import Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.db import SessionLocal
from app.models.database_models import NoteModel
from app.models.pydantic_schemas import NotePayload

router = APIRouter()

@router.post("/")
async def save_note(payload: NotePayload):
    db: Session = SessionLocal()
    db_note = NoteModel(
        session_id=payload.session_id,
        node_type=payload.node_type,
        highlighted_text=payload.highlighted_text,
        start_index=payload.start_index, 
        end_index=payload.end_index,     
        custom_note=payload.custom_note,
        timestamp=payload.timestamp
    )
    try:
        db.add(db_note)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to save note: {e}")
        return JSONResponse(status_code=500, content={"status": "error"})
    finally:
        db.close()
    return {"status": "success", "message": "Note saved"}

@router.get("/")
def get_notes(session_id: str, node_type: Optional[str] = None):
    db: Session = SessionLocal()
    try:
        query = db.query(NoteModel).filter(NoteModel.session_id == session_id)
        if node_type and node_type != "allNotes":
            query = query.filter(NoteModel.node_type == node_type)
        return query.order_by(NoteModel.timestamp.desc()).all()
    finally:
        db.close()
        
@router.delete("/{note_id}")
async def delete_note(note_id: int):
    db: Session = SessionLocal()
    try:
        db.query(NoteModel).filter(NoteModel.id == note_id).delete()
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"status": "error"})
    finally:
        db.close()