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
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_timestamp = Column(String, nullable=True)
    server_timestamp = Column(String, index=True, nullable=True)
    client_sequence = Column(Integer, nullable=True)

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
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_timestamp = Column(String, nullable=True)
    server_timestamp = Column(String, nullable=True)

class AffectModel(Base):
    __tablename__ = "affect_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    timestamp = Column(String, index=True)
    valence = Column(Float)
    arousal = Column(Float)
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_timestamp = Column(String, nullable=True)
    server_timestamp = Column(String, nullable=True)


class AffectInferenceFailureModel(Base):
    __tablename__ = "affect_inference_failures"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    timestamp = Column(String)
    client_timestamp = Column(String, nullable=True)
    server_timestamp = Column(String, index=True, nullable=False)
    failure_reason = Column(String, nullable=False)
    
    
class RppgModel(Base):
    __tablename__ = "rppg_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    timestamp = Column(String) 
    bpm = Column(Float)
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_timestamp = Column(String, nullable=True)
    server_timestamp = Column(String, nullable=True)


class StudySessionModel(Base):
    __tablename__ = "study_sessions"

    session_id = Column(String, primary_key=True)
    # Legacy nullable columns retained to preserve prior research rows.
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_started_at = Column(String, nullable=True)
    server_started_at = Column(String, index=True, nullable=False)
    client_ended_at = Column(String, nullable=True)
    server_ended_at = Column(String, index=True, nullable=True)


class PipelineExecutionModel(Base):
    __tablename__ = "pipeline_executions"

    execution_id = Column(String, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    study_id = Column(String, index=True, nullable=True)
    participant_id = Column(String, index=True, nullable=True)
    client_started_at = Column(String, nullable=True)
    server_started_at = Column(String, index=True, nullable=False)
    server_completed_at = Column(String, index=True, nullable=True)
    status = Column(String, nullable=False)
    request_metadata = Column(JSON, nullable=True)
    result_metadata = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)

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


class GazeCalibrationModel(Base):
    __tablename__ = "gaze_calibrations"
    calibration_id = Column(String, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    started_at = Column(String, nullable=False)
    completed_at = Column(String, nullable=True)
    viewport_width = Column(Integer, nullable=False)
    viewport_height = Column(Integer, nullable=False)
    calibration_metadata = Column(JSON, nullable=True)
    validation_metadata = Column(JSON, nullable=True)
    median_error_px = Column(Float, nullable=True)
    mean_error_px = Column(Float, nullable=True)
    quality_status = Column(String, nullable=False)


class GazeSampleModel(Base):
    __tablename__ = "gaze_samples"
    sample_id = Column(String, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    client_timestamp = Column(String, nullable=False)
    server_timestamp = Column(String, index=True, nullable=False)
    elapsed_ms = Column(Integer, nullable=False)
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    viewport_width = Column(Integer, nullable=False)
    viewport_height = Column(Integer, nullable=False)
    route = Column(String, nullable=False)
    aoi_type = Column(String, nullable=False)
    aoi_id = Column(String, nullable=True)
    calibration_id = Column(String, index=True, nullable=True)
    validity_metadata = Column(JSON, nullable=True)
