from pydantic import BaseModel

class SAMMData(BaseModel):
    valence: float
    arousal: float
    dominance: float

class SAMMPayload(BaseModel):
    session_id: str
    timestamp: str
    timeTakenToAnswer: int
    data: SAMMData