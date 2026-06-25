from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_dashboards: list[WebSocket] = []

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.active_dashboards.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        self.active_dashboards.remove(websocket)

    async def broadcast_event(self, event_data: dict):
        for connection in self.active_dashboards:
            await connection.send_json(event_data)

manager = ConnectionManager()