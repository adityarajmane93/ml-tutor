import logging
import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
import httpx

from app.core.logging import configure_logging
from app.core.security import allowed_origins
from app.db.db import engine

# Import the new routers!
from app.routes.pipeline import router as pipeline_router
from app.routes import notes, consent, analytics, affect, streams, datasets, sessions, gaze, research

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def validation_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_backend_error method=%s path=%s", request.method, request.url.path)
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": "Pipeline processing failed"}
    )

@app.get("/")
def root():
    return {"message": "ML-Tutor Backend Running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def readiness():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        dependencies = {}
        for name, url_name, default_url in (("ml_execution", "ML_EXECUTION_SERVICE_URL", "http://localhost:8001"), ("affect_inference", "AFFECT_INFERENCE_SERVICE_URL", "http://localhost:8002")):
            try:
                response = httpx.get(f"{os.getenv(url_name, default_url).rstrip('/')}/health", timeout=2.0)
                dependencies[name] = "healthy" if response.is_success else "unavailable"
            except httpx.HTTPError:
                dependencies[name] = "unavailable"
        return {"status": "ready", "dependencies": dependencies}
    except Exception as exc:
        logger.exception("readiness_database_failed")
        raise HTTPException(status_code=503, detail="Database is unavailable") from exc

# Plug in the detached modules!
app.include_router(pipeline_router) # Preserved your original pipeline router
app.include_router(notes.router, prefix="/notes", tags=["Notes"])
app.include_router(consent.router, prefix="/consent-forms", tags=["Consent"])
app.include_router(analytics.router, tags=["Analytics"])
app.include_router(affect.router, tags=["Affective Computing"])
app.include_router(streams.router, prefix="/ws", tags=["WebSockets"])
app.include_router(datasets.router, tags=["Datasets"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(gaze.router)
app.include_router(research.router)
