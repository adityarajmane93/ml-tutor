import hmac
import logging
import os

from fastapi import Header, HTTPException, WebSocket

logger = logging.getLogger(__name__)


def allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
    if not origins or "*" in origins:
        raise RuntimeError("CORS_ALLOWED_ORIGINS must list explicit origins and may not contain '*'")
    return origins


def _researcher_key() -> str:
    key = os.getenv("RESEARCHER_API_KEY")
    if not key:
        logger.error("researcher_api_key_not_configured")
        raise HTTPException(status_code=503, detail="Researcher access is not configured")
    return key


def require_researcher_key(x_researcher_key: str | None = Header(default=None)) -> None:
    if not x_researcher_key or not hmac.compare_digest(x_researcher_key, _researcher_key()):
        raise HTTPException(status_code=401, detail="Researcher access required")


async def validate_websocket_access(websocket: WebSocket, researcher_only: bool = False) -> bool:
    origin = websocket.headers.get("origin", "").rstrip("/")
    if origin not in allowed_origins():
        logger.warning("websocket_origin_rejected path=%s origin=%s", websocket.url.path, origin or "missing")
        await websocket.close(code=1008)
        return False
    if researcher_only:
        supplied_key = websocket.headers.get("x-researcher-key") or websocket.query_params.get("researcher_key")
        try:
            expected_key = _researcher_key()
        except HTTPException:
            await websocket.close(code=1011)
            return False
        if not supplied_key or not hmac.compare_digest(supplied_key, expected_key):
            logger.warning("researcher_websocket_rejected path=%s", websocket.url.path)
            await websocket.close(code=1008)
            return False
    return True
