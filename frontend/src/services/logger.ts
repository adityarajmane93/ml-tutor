import axios from "axios";
import { useSessionStore } from "../store/sessionStore.ts";

export async function logEvent(
  eventType: string,
  action: string,
  metadata: Record<string, any> = {}
) {
  const store = useSessionStore.getState();
  
  const event = {
    event_id: crypto.randomUUID(),
    session_id: store.sessionId,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    event_type: eventType,
    action,
    source: "frontend",
    schema_version: "1.0",
    metadata,
  };

  try {
    // 1. Database Persistence
    // We ALWAYS use Axios to hit the FastAPI route that contains your SQLAlchemy db.commit() logic
    const response = await axios.post("http://localhost:8000/log-event", event);
    console.log(` [DB SAVED] ${action}`, response.data);

    // 2. elemetry Broadcast
    // If the database write was successful, and the socket is open, beam it to the analytics page
    if (store.telemetrySocket && store.telemetrySocket.readyState === WebSocket.OPEN) {
      store.telemetrySocket.send(JSON.stringify(event));
      console.log(` [LIVE STREAMED] ${action}`);
    }

  } catch (error) {
    // Log failure to console for debugging.
    console.error(` [LOGGING FAILED] Could not save ${action}:`, error);
  }
}