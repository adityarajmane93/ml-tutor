import { create } from "zustand";

type SessionStore = {
  sessionId: string;
  // 1. The socket itself (can be null before it connects)
  telemetrySocket: WebSocket | null; 
  // 2. A function to open the connection
  connectTelemetry: () => void;
  // 3. A function to close it safely
  disconnectTelemetry: () => void;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: crypto.randomUUID(),
  // Initialize the socket as null
  telemetrySocket: null,

  // The function to spin up the WebSocket
  connectTelemetry: () => {
    // Prevent opening multiple sockets if one is already open
    if (get().telemetrySocket?.readyState === WebSocket.OPEN) return;

    // Connect to your FastAPI switchboard
    const ws = new WebSocket("import.meta.env.VITE_WS_URL/ws/dashboard");

    ws.onopen = () => {
      console.log("Telemetry WebSocket Connected!");
    };

    ws.onerror = (error) => {
      console.error("Telemetry WebSocket Error:", error);
    };

    ws.onclose = () => {
      console.log("Telemetry WebSocket Closed.");
      set({ telemetrySocket: null });
    };

    // Save the active socket into the global state!
    set({ telemetrySocket: ws });
  },

  // The function to cleanly shut it down
  disconnectTelemetry: () => {
    const { telemetrySocket } = get();
    if (telemetrySocket) {
      telemetrySocket.close();
    }
    set({ telemetrySocket: null });
  }
}));