from pydantic import BaseModel
from typing import Dict


class Event(BaseModel):
    event_id: str

    session_id: str

    timestamp: str

    event_type: str

    action: str

    source: str

    schema_version: str = "1.0"

    metadata: Dict