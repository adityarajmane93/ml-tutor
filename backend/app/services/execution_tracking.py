import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.db.db import SessionLocal
from app.models.database_models import PipelineExecutionModel

logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _context(payload: dict) -> dict | None:
    context = payload.get("study_context")
    if not isinstance(context, dict):
        return None
    if not isinstance(context.get("session_id"), str) or not context["session_id"]:
        return None
    return context


def _request_summary(payload: dict) -> dict:
    nodes = payload.get("orderedPipeline")
    adjacency = payload.get("adjacency")
    return {
        "node_count": len(nodes) if isinstance(nodes, list) else 0,
        "edge_count": sum(len(children) for children in adjacency.values()) if isinstance(adjacency, dict) else 0,
        "node_types": [node.get("type") for node in nodes if isinstance(node, dict)] if isinstance(nodes, list) else [],
    }


def start_pipeline_execution(payload: dict) -> str | None:
    context = _context(payload)
    if context is None:
        return None
    db = SessionLocal()
    try:
        execution_id = str(uuid4())
        db.add(
            PipelineExecutionModel(
                execution_id=execution_id,
                session_id=context["session_id"],
                study_id=None,
                participant_id=None,
                client_started_at=context.get("client_timestamp"),
                server_started_at=_utc_now(),
                status="running",
                request_metadata=_request_summary(payload),
            )
        )
        db.commit()
        return execution_id
    except Exception:
        db.rollback()
        logger.exception("pipeline_execution_start_failed")
        raise
    finally:
        db.close()


def finish_pipeline_execution(execution_id: str | None, result: dict | None = None, error: str | None = None) -> None:
    if execution_id is None:
        return
    db = SessionLocal()
    try:
        execution = db.get(PipelineExecutionModel, execution_id)
        if execution is None:
            logger.error("pipeline_execution_missing execution_id=%s", execution_id)
            return
        execution.server_completed_at = _utc_now()
        execution.status = "failed" if error else "completed"
        execution.result_metadata = result if result is not None else None
        execution.error_message = error
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("pipeline_execution_finish_failed execution_id=%s", execution_id)
    finally:
        db.close()
