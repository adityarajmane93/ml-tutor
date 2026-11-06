import axios from "axios";
import { getSessionContext, useSessionStore } from "../store/sessionStore";

const MAX_BATCH_SIZE = 50;
const MAX_QUEUE_SIZE = 500;
const MAX_BACKOFF_MS = 30_000;

type QueuedEvent = {
  event_id: string; session_id: string; timestamp: string; client_timestamp: string;
  client_sequence: number; event_type: string; action: string; source: string;
  schema_version: string; metadata: Record<string, unknown>;
};

let draining = false;
let retryAttempt = 0;
let retryTimer: number | null = null;
function storageKey(): string { return `ml-tutor.telemetry-outbox.${getSessionContext().sessionId}`; }
function readQueue(): QueuedEvent[] {
  try { const value = JSON.parse(localStorage.getItem(storageKey()) ?? "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function writeQueue(queue: QueuedEvent[]): void { localStorage.setItem(storageKey(), JSON.stringify(queue)); }
function scheduleRetry(): void {
  if (retryTimer !== null || useSessionStore.getState().ended) return;
  const delay = Math.min(1_000 * 2 ** retryAttempt, MAX_BACKOFF_MS);
  retryAttempt += 1;
  retryTimer = window.setTimeout(() => { retryTimer = null; void flushEventQueue(); }, delay);
}

export async function flushEventQueue(): Promise<boolean> {
  if (draining) return false;
  if (readQueue().length === 0) return true;
  draining = true;
  try {
    if (!await useSessionStore.getState().startSession()) throw new Error("Session start was not acknowledged");
    while (readQueue().length > 0) {
      const batch = readQueue().slice(0, MAX_BATCH_SIZE);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/log-events/batch`, { events: batch });
      const acknowledged = new Set<string>(response.data.acknowledged_event_ids ?? []);
      if (acknowledged.size === 0) throw new Error("Event batch was not acknowledged");
      writeQueue(readQueue().filter((event) => !acknowledged.has(event.event_id)));
    }
    retryAttempt = 0;
    return true;
  } catch (error) {
    console.error("Telemetry delivery deferred:", error);
    scheduleRetry();
    return false;
  } finally { draining = false; }
}

export function cancelTelemetryRetry(): void {
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = null;
}

export async function logEvent(eventType: string, action: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const state = useSessionStore.getState();
  if (state.ending || state.ended) return;
  const { sessionId } = getSessionContext();
  const event: QueuedEvent = {
    event_id: crypto.randomUUID(), session_id: sessionId,
    timestamp: Math.floor(Date.now() / 1000).toString(), client_timestamp: new Date().toISOString(),
    client_sequence: state.nextClientSequence(), event_type: eventType, action, source: "frontend", schema_version: "2.0", metadata,
  };
  writeQueue([...readQueue(), event].slice(-MAX_QUEUE_SIZE));
  void flushEventQueue();
}
