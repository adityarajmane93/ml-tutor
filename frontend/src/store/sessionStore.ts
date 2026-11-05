import { create } from "zustand";

const STORAGE_KEY = "ml-tutor.study-session.v1";

export type StudySessionContext = {
  studyId: string;
  participantId: string;
  sessionId: string;
  clientSequence: number;
};

type SessionStore = StudySessionContext & {
  telemetrySocket: WebSocket | null;
  sessionStarted: boolean;
  startSession: () => Promise<boolean>;
  endSession: () => Promise<boolean>;
  createNextSession: () => void;
  nextClientSequence: () => number;
  connectTelemetry: () => void;
  disconnectTelemetry: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function loadContext(): StudySessionContext {
  const params = new URLSearchParams(window.location.search);
  const requestedStudyId = params.get("study_id");
  const requestedParticipantId = params.get("participant_id");
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as StudySessionContext | null;
    if (
      stored
      && (!requestedStudyId || requestedStudyId === stored.studyId)
      && (!requestedParticipantId || requestedParticipantId === stored.participantId)
    ) return stored;
    return {
      studyId: requestedStudyId || stored?.studyId || import.meta.env.VITE_STUDY_ID || "ml-tutor-study",
      participantId: requestedParticipantId || stored?.participantId || crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      clientSequence: 0,
    };
  } catch {
    return {
      studyId: requestedStudyId || import.meta.env.VITE_STUDY_ID || "ml-tutor-study",
      participantId: requestedParticipantId || crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      clientSequence: 0,
    };
  }
}

function persist(context: StudySessionContext): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

const initialContext = loadContext();
persist(initialContext);

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialContext,
  telemetrySocket: null,
  sessionStarted: false,

  startSession: async () => {
    if (get().sessionStarted) return true;
    const { studyId, participantId, sessionId } = get();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_id: studyId,
          participant_id: participantId,
          session_id: sessionId,
          client_started_at: nowIso(),
        }),
      });
      if (!response.ok) return false;
      set({ sessionStarted: true });
      return true;
    } catch {
      return false;
    }
  },

  endSession: async () => {
    const { studyId, participantId, sessionId } = get();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_id: studyId,
          participant_id: participantId,
          client_ended_at: nowIso(),
        }),
      });
      if (!response.ok) return false;
      set({ sessionStarted: false });
      return true;
    } catch {
      return false;
    }
  },

  createNextSession: () => {
    const current = get();
    const next: StudySessionContext = {
      studyId: current.studyId,
      participantId: current.participantId,
      sessionId: crypto.randomUUID(),
      clientSequence: 0,
    };
    persist(next);
    set({ sessionId: next.sessionId, clientSequence: 0, sessionStarted: false });
  },

  nextClientSequence: () => {
    const next = get().clientSequence + 1;
    const context = get();
    persist({
      studyId: context.studyId,
      participantId: context.participantId,
      sessionId: context.sessionId,
      clientSequence: next,
    });
    set({ clientSequence: next });
    return next;
  },

  connectTelemetry: () => {
    if (get().telemetrySocket?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/dashboard`);
    ws.onclose = () => set({ telemetrySocket: null });
    set({ telemetrySocket: ws });
  },

  disconnectTelemetry: () => {
    get().telemetrySocket?.close();
    set({ telemetrySocket: null });
  },
}));

export function getStudySessionContext(): StudySessionContext {
  const { studyId, participantId, sessionId, clientSequence } = useSessionStore.getState();
  return { studyId, participantId, sessionId, clientSequence };
}
