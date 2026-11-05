import axios from "axios";
import { getStudySessionContext, useSessionStore } from "../store/sessionStore.ts";

const QUEUE_STORAGE_KEY = "ml-tutor.telemetry-outbox.v1";
const MAX_BATCH_SIZE = 50;
const MAX_BACKOFF_MS = 30_000;

type QueuedEvent = {
  event_id: string;
  session_id: string;
  study_id: string;
  participant_id: string;
  timestamp: string;
  client_timestamp: string;
  client_sequence: number;
  event_type: string;
  action: string;
  source: string;
  schema_version: string;
  metadata: Record<string, unknown>;
};

let draining = false;
let retryAttempt = 0;
let retryTimer: number | null = null;

function readQueue(): QueuedEvent[] {
  try {
    const stored = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]): void {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  const delay = Math.min(1_000 * 2 ** retryAttempt, MAX_BACKOFF_MS);
  retryAttempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void flushEventQueue();
  }, delay);
}

export async function flushEventQueue(): Promise<void> {
  if (draining || readQueue().length === 0) return;
  draining = true;
  try {
    const sessionStarted = await useSessionStore.getState().startSession();
    if (!sessionStarted) throw new Error("Study session has not been acknowledged");

    const batch = readQueue().slice(0, MAX_BATCH_SIZE);
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/log-events/batch`, { events: batch });
    const acknowledged = new Set<string>(response.data.acknowledged_event_ids ?? []);
    if (acknowledged.size === 0) throw new Error("Event batch was not acknowledged");
    writeQueue(readQueue().filter((event) => !acknowledged.has(event.event_id)));
    retryAttempt = 0;
  } catch (error) {
    console.error("Telemetry delivery deferred:", error);
    scheduleRetry();
  } finally {
    draining = false;
  }

  if (readQueue().length > 0 && retryTimer === null) void flushEventQueue();
}

export async function logEvent(
  eventType: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  const { studyId, participantId, sessionId } = getStudySessionContext();
  const event: QueuedEvent = {
    event_id: crypto.randomUUID(),
    session_id: sessionId,
    study_id: studyId,
    participant_id: participantId,
    // Retain epoch seconds for legacy dashboard consumers.
    timestamp: Math.floor(Date.now() / 1000).toString(),
    client_timestamp: new Date().toISOString(),
    client_sequence: useSessionStore.getState().nextClientSequence(),
    event_type: eventType,
    action,
    source: "frontend",
    schema_version: "1.1",
    metadata,
  };
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
  void flushEventQueue();
}
