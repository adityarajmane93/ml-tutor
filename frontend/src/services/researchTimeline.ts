export type Timed<T> = T & { timeMs: number };

export type TimelineEvent = {
  id: string;
  timeMs: number;
  category: string;
  label: string;
  action?: string;
  metadata: Record<string, unknown>;
  derived?: boolean;
};

export const AFFECT_CENTROIDS = [
  { name: "Boredom", valence: -0.55, arousal: -0.35 },
  { name: "Confusion", valence: -0.25, arousal: 0.35 },
  { name: "Frustration", valence: -0.7, arousal: 0.65 },
  { name: "Engaged concentration", valence: 0.2, arousal: 0.1 },
  { name: "Delight", valence: 0.7, arousal: 0.65 },
  { name: "Surprise", valence: 0.1, arousal: 0.8 },
  { name: "Neutral", valence: 0, arousal: 0 },
] as const;

export function timestampToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? (numeric < 100_000_000_000 ? numeric * 1000 : numeric) : null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function observationTime(record: { client_timestamp?: string | null; timestamp?: string | null; server_timestamp?: string | null }): number | null {
  return timestampToMs(record.client_timestamp) ?? timestampToMs(record.timestamp) ?? timestampToMs(record.server_timestamp);
}

export function withObservationTimes<T extends { client_timestamp?: string | null; timestamp?: string | null; server_timestamp?: string | null }>(records: T[]): Timed<T>[] {
  return records.flatMap((record) => {
    const timeMs = observationTime(record);
    return timeMs === null ? [] : [{ ...record, timeMs }];
  }).sort((left, right) => left.timeMs - right.timeMs);
}

export function timelineBounds(times: number[], fallbackStart?: string | null, fallbackEnd?: string | null): [number, number] | null {
  const valid = times.filter(Number.isFinite);
  const fallback = [timestampToMs(fallbackStart), timestampToMs(fallbackEnd)].filter((value): value is number => value !== null);
  const all = [...valid, ...fallback];
  if (!all.length) return null;
  const start = Math.min(...all);
  const end = Math.max(...all);
  return start === end ? [start, start + 1] : [start, end];
}

export function nearestAtOrBefore<T extends { timeMs: number }>(records: T[], cursor: number): T | null {
  let result: T | null = null;
  for (const record of records) {
    if (record.timeMs > cursor) break;
    result = record;
  }
  return result;
}

export function nearby<T extends { timeMs: number }>(records: T[], cursor: number, windowMs = 10_000): T[] {
  return records.filter((record) => Math.abs(record.timeMs - cursor) <= windowMs);
}

export function workflowAt<T extends { timeMs: number; metadata: Record<string, unknown> }>(snapshots: T[], cursor: number): { nodes: unknown[]; edges: unknown[] } | null {
  const snapshot = nearestAtOrBefore(snapshots, cursor);
  if (!snapshot) return null;
  const nodes = Array.isArray(snapshot.metadata.nodes) ? snapshot.metadata.nodes : [];
  const edges = Array.isArray(snapshot.metadata.edges) ? snapshot.metadata.edges : [];
  return { nodes, edges };
}

export function euclideanDistance(valence: number, arousal: number, centroid: { valence: number; arousal: number }): number {
  return Math.hypot(valence - centroid.valence, arousal - centroid.arousal);
}

export function aoiVisits<T extends { timeMs: number; aoi_type: string; aoi_id?: string | null }>(samples: T[], maxGapMs = 2_000): Array<{ aoi_type: string; aoi_id: string | null; startMs: number; endMs: number; count: number }> {
  const visits: Array<{ aoi_type: string; aoi_id: string | null; startMs: number; endMs: number; count: number }> = [];
  for (const sample of samples) {
    const previous = visits.at(-1);
    if (previous && previous.aoi_type === sample.aoi_type && previous.aoi_id === (sample.aoi_id ?? null) && sample.timeMs - previous.endMs <= maxGapMs) {
      previous.endMs = sample.timeMs;
      previous.count += 1;
    } else {
      visits.push({ aoi_type: sample.aoi_type, aoi_id: sample.aoi_id ?? null, startMs: sample.timeMs, endMs: sample.timeMs, count: 1 });
    }
  }
  return visits;
}
