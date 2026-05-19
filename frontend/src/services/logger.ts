import axios from "axios";

import { useSessionStore }
from "../store/sessionStore.ts";

export async function logEvent(
  eventType: string,
  action: string,
  metadata: Record<string, any> = {}
) {
  const sessionId =
    useSessionStore.getState().sessionId;

  const event = {
    event_id: crypto.randomUUID(),

    session_id: sessionId,

    timestamp: new Date().toISOString(),

    event_type: eventType,

    action,

    source: "frontend",

    schema_version: "1.0",

    metadata,
  };

  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/log-event",
      event
    );

    console.log(
      "Event logged successfully:",
      response.data
    );
  } catch (error) {
    console.error(
      "Error logging event:",
      error
    );
  }
}