from sqlalchemy import Column, Integer, String, Float, JSON
from app.db.db import Base

class EventModel(Base):
    __tablename__ = "events"
    event_id = Column(
        String,
        primary_key=True,
        index=True
    )
    session_id = Column(String)
    timestamp = Column(String)
    event_type = Column(String)
    action = Column(String)
    source = Column(String)
    schema_version = Column(String)
    event_metadata = Column(JSON)

class SAMMModel(Base):
    __tablename__ = "samm_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    timestamp = Column(String, index=True)
    time_taken_to_answer = Column(Integer)
    
    # SAMM Scores
    valence = Column(Float)
    arousal = Column(Float)
    dominance = Column(Float)

class AffectModel(Base):
    __tablename__ = "affect_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    timestamp = Column(String, index=True)
    valence = Column(Float)
    arousal = Column(Float)
    
    
class RppgModel(Base):
    __tablename__ = "rppg_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    timestamp = Column(String) 
    bpm = Column(Float)

class NoteModel(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    node_type = Column(String)
    highlighted_text = Column(String, nullable=True)
    start_index = Column(Integer, nullable=True) 
    end_index = Column(Integer, nullable=True)   
    custom_note = Column(String, nullable=True)
    timestamp = Column(String)

class ConsentFormModel(Base):
    __tablename__ = "consent_forms"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    p1_participant_name = Column(String)
    p1_date = Column(String)
    p2_child_name = Column(String)
    p2_audio_consent = Column(String)
    p2_video_consent = Column(String)
    p2_interview_consent = Column(String)
    p2_guardian_signature = Column(String)
    p2_date = Column(String)
    p3_child_name = Column(String, nullable=True)
    p3_guardian_name = Column(String, nullable=True)
    p3_child_signature = Column(String)
    p3_guardian_signature = Column(String)
    p3_date = Column(String)