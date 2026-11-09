import { create } from "zustand";

export type SessionContext = {
  sessionId: string;
  clientSequence: number;
  clientStartedAt: string;
};

type SessionStore = SessionContext & {
  telemetrySocket: WebSocket | null;
  sessionStarted: boolean;
  ending: boolean;
  ended: boolean;
  startSession: () => Promise<boolean>;
  endSession: () => Promise<boolean>;
  nextClientSequence: () => number;
  beginEnding: () => void;
  cancelEnding: () => void;
  finishSessionLocally: () => void;
  connectTelemetry: () => void;
  disconnectTelemetry: () => void;
};

function newSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((byte, index) => ([4, 6, 8, 10].includes(index) ? `-${byte.toString(16).padStart(2, "0")}` : byte.toString(16).padStart(2, "0"))).join("");
}

export function createSessionContext(): SessionContext {
  return {
  // Evaluated once per browser page load. No prior context is restored.
  sessionId: newSessionId(),
  clientSequence: 0,
  clientStartedAt: new Date().toISOString(),
  };
}

const initialContext = createSessionContext();

let startRequest: Promise<boolean> | null = null;

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialContext,
  telemetrySocket: null,
  sessionStarted: false,
  ending: false,
  ended: false,

  startSession: async () => {
    if (get().sessionStarted) return true;
    if (get().ended) return false;
    if (startRequest) return startRequest;
    const { sessionId, clientStartedAt } = get();
    startRequest = fetch(`${import.meta.env.VITE_API_URL}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, client_started_at: clientStartedAt }),
    }).then((response) => {
      if (!response.ok) return false;
      set({ sessionStarted: true });
      return true;
    }).catch(() => false).finally(() => { startRequest = null; });
    return startRequest;
  },

  endSession: async () => {
    const { sessionId } = get();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_ended_at: new Date().toISOString() }),
      });
      if (!response.ok) return false;
      set({ sessionStarted: false, ending: false, ended: true });
      return true;
    } catch { return false; }
  },

  nextClientSequence: () => {
    const next = get().clientSequence + 1;
    set({ clientSequence: next });
    return next;
  },
  beginEnding: () => set({ ending: true }),
  cancelEnding: () => set({ ending: false }),
  finishSessionLocally: () => set({ sessionStarted: false, ending: false, ended: true }),
  connectTelemetry: () => {
    if (get().ending || get().ended || get().telemetrySocket?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/dashboard`);
    ws.onclose = () => set({ telemetrySocket: null });
    set({ telemetrySocket: ws });
  },
  disconnectTelemetry: () => {
    get().telemetrySocket?.close();
    set({ telemetrySocket: null });
  },
}));

export function getSessionContext(): SessionContext {
  const { sessionId, clientSequence, clientStartedAt } = useSessionStore.getState();
  return { sessionId, clientSequence, clientStartedAt };
}
