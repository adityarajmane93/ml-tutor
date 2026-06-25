import json
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.execution.executor import execute_pipeline

router = APIRouter()

@router.websocket("/ws/run")
async def websocket_pipeline(websocket: WebSocket):
    await websocket.accept()
    
    try:
        raw_text = await websocket.receive_text()
        
        # Parse the JSON string into a dynamic Python dictionary/list
        data = json.loads(raw_text)
        
        # Pass the parsed data directly to the executor
        result = execute_pipeline(data)

        await websocket.send_json(result)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print("\n=== PIPELINE EXECUTION ERROR ===")
        traceback.print_exc() 
        print("================================\n")
        await websocket.send_json({"error": str(e)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass