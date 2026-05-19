from sqlalchemy import Column, String, JSON

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