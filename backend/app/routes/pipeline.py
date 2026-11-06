import json
import traceback
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.core.security import validate_websocket_access
from app.services.execution_tracking import finish_pipeline_execution, start_pipeline_execution
from app.services.internal_clients import execute_pipeline

router = APIRouter()

@router.websocket("/ws/run")
async def websocket_pipeline(websocket: WebSocket):
    if not await validate_websocket_access(websocket):
        return
    await websocket.accept()
    
    try:
        raw_text = await websocket.receive_text()
        
        # Parse the JSON string into a dynamic Python dictionary/list
        data = json.loads(raw_text)
        execution_id = await run_in_threadpool(start_pipeline_execution, data)
        
        # CPU-bound work happens only in the ML Execution Service.
        result = await execute_pipeline(data)
        await asyncio.to_thread(finish_pipeline_execution, execution_id, result)

        await websocket.send_json(result)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print("\n=== PIPELINE EXECUTION ERROR ===")
        traceback.print_exc() 
        print("================================\n")
        try:
            await asyncio.to_thread(finish_pipeline_execution, locals().get("execution_id"), None, str(e))
        except Exception:
            pass
        await websocket.send_json({"error": str(e)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
