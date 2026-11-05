from pydantic import BaseModel, Field
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
    study_id: Optional[str] = Field(default=None, max_length=128)
    participant_id: Optional[str] = Field(default=None, max_length=128)
    client_timestamp: Optional[str] = None
    client_sequence: Optional[int] = Field(default=None, ge=0)


class EventBatch(BaseModel):
    events: list[Event] = Field(min_length=1, max_length=100)


class SessionStartPayload(BaseModel):
    study_id: str = Field(min_length=1, max_length=128)
    participant_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    client_started_at: Optional[str] = None


class SessionEndPayload(BaseModel):
    study_id: str = Field(min_length=1, max_length=128)
    participant_id: str = Field(min_length=1, max_length=128)
    client_ended_at: Optional[str] = None


class SAMMData(BaseModel):
    valence: float
    arousal: float
    dominance: float

class SAMMPayload(BaseModel):
    session_id: str
    timestamp: str
    timeTakenToAnswer: int
    data: SAMMData
    study_id: Optional[str] = Field(default=None, max_length=128)
    participant_id: Optional[str] = Field(default=None, max_length=128)
    client_timestamp: Optional[str] = None


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
