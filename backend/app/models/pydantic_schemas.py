from pydantic import BaseModel
from typing import Optional,Dict

class Event(BaseModel):
    event_id: str
    session_id: str
    timestamp: str
    event_type: str
    action: str
    source: str
    schema_version: str = "1.0"
    metadata: Dict


class SAMMData(BaseModel):
    valence: float
    arousal: float
    dominance: float

class SAMMPayload(BaseModel):
    session_id: str
    timestamp: str
    timeTakenToAnswer: int
    data: SAMMData


class Page1Data(BaseModel):
    participant_name: str
    date: str

class Page2Data(BaseModel):
    child_name: str
    audio_consent: str
    video_consent: str
    interview_consent: str
    guardian_signature: str
    date: str

class Page3Data(BaseModel):
    child_name_optional: Optional[str] = None
    guardian_name_optional: Optional[str] = None
    child_signature: str
    guardian_signature: str
    date: str

class ConsentFormPayload(BaseModel):
    session_id: Optional[str] = None
    page_1: Page1Data
    page_2: Page2Data
    page_3: Page3Data


class NotePayload(BaseModel):
    session_id: str
    node_type: str
    highlighted_text: Optional[str] = None
    start_index: Optional[int] = None 
    end_index: Optional[int] = None   
    custom_note: Optional[str] = None
    timestamp: str