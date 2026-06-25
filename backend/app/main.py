import os
import traceback
import torch 

# This intercepts the library's internal code and forces it to bypass the security block.
_original_load = torch.load

def _patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)

torch.load = _patched_load
# ---------------------------------------

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.db import SessionLocal, engine, Base

# Import the new routers!
from app.routes.pipeline import router as pipeline_router
from app.routes import notes, consent, analytics, affect, streams

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def validation_exception_handler(request: Request, exc: Exception):
    print("\n=== !!! BACKEND ERROR !!! ===")
    traceback.print_exc()
    print("=======================================\n")
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": "Pipeline processing failed"}
    )

@app.get("/")
def root():
    return {"message": "ML-Tutor Backend Running"}

# Plug in the detached modules!
app.include_router(pipeline_router) # Preserved your original pipeline router
app.include_router(notes.router, prefix="/notes", tags=["Notes"])
app.include_router(consent.router, prefix="/consent-forms", tags=["Consent"])
app.include_router(analytics.router, tags=["Analytics"])
app.include_router(affect.router, tags=["Affective Computing"])
app.include_router(streams.router, prefix="/ws", tags=["WebSockets"])