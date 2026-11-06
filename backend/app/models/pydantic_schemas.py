from pydantic import BaseModel, ConfigDict, Field
from typing import Optional,Dict

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    session_id: str
    timestamp: str
    event_type: str
    action: str
    source: str
    schema_version: str = "1.0"
    metadata: Dict
    client_timestamp: Optional[str] = None
    client_sequence: Optional[int] = Field(default=None, ge=0)


class EventBatch(BaseModel):
    events: list[Event] = Field(min_length=1, max_length=100)


class SessionStartPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(min_length=1, max_length=128)
    client_started_at: Optional[str] = None


class SessionEndPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_ended_at: Optional[str] = None


class SAMMData(BaseModel):
    valence: float
    arousal: float
    dominance: float

class SAMMPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    timestamp: str
    timeTakenToAnswer: int
    data: SAMMData
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


class GazeSamplePayload(BaseModel):
    sample_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    client_timestamp: str
    elapsed_ms: int = Field(ge=0)
    x: Optional[float] = None
    y: Optional[float] = None
    viewport_width: int = Field(gt=0, le=20_000)
    viewport_height: int = Field(gt=0, le=20_000)
    route: str = Field(max_length=512)
    aoi_type: str = Field(max_length=128)
    aoi_id: Optional[str] = Field(default=None, max_length=256)
    calibration_id: Optional[str] = Field(default=None, max_length=128)
    validity_metadata: Dict = Field(default_factory=dict)


class GazeSampleBatch(BaseModel):
    samples: list[GazeSamplePayload] = Field(min_length=1, max_length=100)


class GazeCalibrationPayload(BaseModel):
    calibration_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    started_at: str
    completed_at: Optional[str] = None
    viewport_width: int = Field(gt=0, le=20_000)
    viewport_height: int = Field(gt=0, le=20_000)
    calibration_metadata: Dict = Field(default_factory=dict)
    validation_metadata: Dict = Field(default_factory=dict)
    median_error_px: Optional[float] = Field(default=None, ge=0)
    mean_error_px: Optional[float] = Field(default=None, ge=0)
    quality_status: str = Field(max_length=64)
