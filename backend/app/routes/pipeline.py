import json
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.execution.executor import execute_pipeline
from app.services.execution_tracking import finish_pipeline_execution, start_pipeline_execution

router = APIRouter()

@router.websocket("/ws/run")
async def websocket_pipeline(websocket: WebSocket):
    await websocket.accept()
    
    try:
        raw_text = await websocket.receive_text()
        
        # Parse the JSON string into a dynamic Python dictionary/list
        data = json.loads(raw_text)
        execution_id = await run_in_threadpool(start_pipeline_execution, data)
        
        # Pass the parsed data directly to the executor
        # Fitting models is CPU-bound. Keep the async server loop available to
        # other clients while a pipeline is being executed.
        result = await run_in_threadpool(execute_pipeline, data)
        await run_in_threadpool(finish_pipeline_execution, execution_id, result)

        await websocket.send_json(result)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print("\n=== PIPELINE EXECUTION ERROR ===")
        traceback.print_exc() 
        print("================================\n")
        try:
            await run_in_threadpool(finish_pipeline_execution, locals().get("execution_id"), None, str(e))
        except Exception:
            pass
        await websocket.send_json({"error": str(e)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
