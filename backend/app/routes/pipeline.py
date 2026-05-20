from fastapi import APIRouter

router = APIRouter()

@router.post("/execute-pipeline")
async def execute_pipeline(
    payload: dict
):

    print("\n=== PIPELINE RECEIVED ===")
    print(payload)

    return {
        "status": "success",
        "received": payload,
    }