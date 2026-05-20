from fastapi import APIRouter

from app.execution.executor import (
    execute_pipeline
)

router = APIRouter()


@router.post("/execute-pipeline")
async def run_pipeline(
    payload: dict
):

    ordered_pipeline = payload[
        "orderedPipeline"
    ]

    result = execute_pipeline(
        ordered_pipeline
    )

    return result