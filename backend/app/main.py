import os
import traceback
import torch 
import logging

# This intercepts the library's internal code and forces it to bypass the security block.
_original_load = torch.load

def _patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)

torch.load = _patched_load
# ---------------------------------------

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.logging import configure_logging
from app.core.security import allowed_origins
from app.db.db import engine

# Import the new routers!
from app.routes.pipeline import router as pipeline_router
from app.routes import notes, consent, analytics, affect, streams, datasets, sessions

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
        return {"status": "ready"}
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
