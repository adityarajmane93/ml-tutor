import axios from "axios";
import { getSessionContext, useSessionStore } from "../store/sessionStore";

const MAX_BATCH_SIZE = 50;
const MAX_QUEUE_SIZE = 500;
type GazeSample = {
  sample_id: string; session_id: string; client_timestamp: string; elapsed_ms: number;
  x: number | null; y: number | null; viewport_width: number; viewport_height: number;
  route: string; aoi_type: string; aoi_id: string | null; calibration_id: string | null;
  validity_metadata: Record<string, unknown>;
};
let sending = false;
let retryTimer: number | null = null;
function key(): string { return `ml-tutor.gaze-outbox.${getSessionContext().sessionId}`; }
function read(): GazeSample[] { try { const parsed = JSON.parse(localStorage.getItem(key()) ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function write(samples: GazeSample[]): void { localStorage.setItem(key(), JSON.stringify(samples)); }

export async function flushGazeQueue(): Promise<boolean> {
  if (sending) return false;
  if (!read().length) return true;
  sending = true;
  try {
    if (!await useSessionStore.getState().startSession()) return false;
    while (read().length) {
      const samples = read().slice(0, MAX_BATCH_SIZE);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/gaze/samples/batch`, { samples });
      const acknowledged = new Set<string>(response.data.acknowledged_sample_ids ?? []);
      if (!acknowledged.size) throw new Error("Gaze batch was not acknowledged");
      write(read().filter((sample) => !acknowledged.has(sample.sample_id)));
    }
    return true;
  } catch (error) {
    console.error("Gaze delivery deferred:", error);
    if (retryTimer === null && !useSessionStore.getState().ended) retryTimer = window.setTimeout(() => { retryTimer = null; void flushGazeQueue(); }, 3_000);
    return false;
  } finally { sending = false; }
}

export function queueGazeSample(sample: GazeSample): void {
  if (useSessionStore.getState().ending || useSessionStore.getState().ended) return;
  write([...read(), sample].slice(-MAX_QUEUE_SIZE));
  void flushGazeQueue();
}

export async function saveCalibration(payload: Record<string, unknown>): Promise<boolean> {
  try { await axios.post(`${import.meta.env.VITE_API_URL}/gaze/calibrations`, payload); return true; }
  catch (error) { console.error("Calibration delivery deferred:", error); return false; }
}

export function cancelGazeRetry(): void { if (retryTimer !== null) window.clearTimeout(retryTimer); retryTimer = null; }
