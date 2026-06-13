from sqlalchemy import Column, Integer, Float, String
from app.db.db import Base

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
    