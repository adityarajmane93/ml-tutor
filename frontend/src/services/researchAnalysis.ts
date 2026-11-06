import type { TimelineEvent } from "./researchTimeline";

export type TimeWindow = { startMs: number; endMs: number };
export type SequenceItem = TimelineEvent & { elapsedMs: number | null };

export function centeredWindow(centerMs: number, seconds: number): TimeWindow {
  const half = seconds * 1000;
  return { startMs: centerMs - half, endMs: centerMs + half };
}

export function normalizedWindow(startMs: number, endMs: number): TimeWindow {
  return startMs <= endMs ? { startMs, endMs } : { startMs: endMs, endMs: startMs };
}

export function withinWindow<T extends { timeMs: number }>(records: T[], window: TimeWindow): T[] {
  return records.filter((record) => record.timeMs >= window.startMs && record.timeMs <= window.endMs);
}

export function chronologicalSequence(events: TimelineEvent[], enabledCategories: Set<string> | null = null): SequenceItem[] {
  const ordered = events
    .filter((event) => enabledCategories === null || enabledCategories.has(event.category))
    .slice()
    .sort((left, right) => left.timeMs - right.timeMs);
  return ordered.map((event, index) => ({ ...event, elapsedMs: index === 0 ? null : event.timeMs - ordered[index - 1].timeMs }));
}

const LEARN_ACTIONS = new Set([
  "LEARN_MODAL_OPENED",
  "LEARN_MODAL_CLOSED",
  "LEARN_RESOURCE_CHANGED",
  "TAB_CHANGED",
  "RESOURCE_SCROLL_MILESTONE",
  "NOTE_SAVED",
  "NOTE_DELETED_IN_DB",
  "HIGHLIGHT_CREATED",
]);

export type LearnWorkspaceTransition = { learnEvent: TimelineEvent; firstWorkspaceEvent: TimelineEvent | null };

/** Records adjacency only; it makes no claim that Learn caused workspace activity. */
export function learnWorkspaceTransitions(events: TimelineEvent[]): LearnWorkspaceTransition[] {
  const ordered = chronologicalSequence(events);
  return ordered.flatMap((event, index) => {
    if (event.action !== "LEARN_MODAL_CLOSED") return [];
    const firstWorkspaceEvent = ordered.slice(index + 1).find((candidate) => !LEARN_ACTIONS.has(candidate.action ?? candidate.label) && candidate.category !== "SAMM");
    return [{ learnEvent: event, firstWorkspaceEvent: firstWorkspaceEvent ?? null }];
  });
}

function csvCell(value: unknown): string {
  const serialized = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${serialized.replaceAll('"', '""')}"`;
}

export function recordsToCsv(records: Array<Record<string, unknown>>, columns: string[]): string {
  return [columns.map(csvCell).join(","), ...records.map((record) => columns.map((column) => csvCell(record[column])).join(","))].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
