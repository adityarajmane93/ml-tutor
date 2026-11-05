from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_dashboards: list[WebSocket] = []

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.active_dashboards.append(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.active_dashboards:
            self.active_dashboards.remove(websocket)

    async def broadcast_event(self, event_data: dict):
        connections = list(self.active_dashboards)
        results = await asyncio.gather(
            *(connection.send_json(event_data) for connection in connections),
            return_exceptions=True,
        )
        for connection, result in zip(connections, results):
            if isinstance(result, Exception):
                logger.warning("dashboard_broadcast_failed error=%s", type(result).__name__)
                self.disconnect_dashboard(connection)

manager = ConnectionManager()
