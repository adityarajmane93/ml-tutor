from sqlalchemy import Column, Integer, Float, String
from app.db.db import Base

class AffectModel(Base):
    __tablename__ = "affect_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    timestamp = Column(String, index=True)
    valence = Column(Float)
    arousal = Column(Float)
    