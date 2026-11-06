import { describe, expect, it } from "vitest";
import { centeredWindow, chronologicalSequence, learnWorkspaceTransitions, normalizedWindow, recordsToCsv, withinWindow } from "./researchAnalysis";
import type { TimelineEvent } from "./researchTimeline";

const events: TimelineEvent[] = [
  { id: "run-2", timeMs: 30_000, category: "PIPELINE_EVENT", label: "run", metadata: {} },
  { id: "learn-close", timeMs: 20_000, category: "CLICK_EVENT", label: "close", metadata: {}, action: "LEARN_MODAL_CLOSED" },
  { id: "config", timeMs: 25_000, category: "PIPELINE_EVENT", label: "config", metadata: {} },
];

describe("research analysis utilities", () => {
  it("selects inclusive event-centered and affect-centered windows", () => {
    const window = centeredWindow(20_000, 10);
    expect(window).toEqual({ startMs: 10_000, endMs: 30_000 });
    expect(withinWindow([{ timeMs: 10_000 }, { timeMs: 30_000 }, { timeMs: 30_001 }], window)).toHaveLength(2);
    expect(normalizedWindow(50, 10)).toEqual({ startMs: 10, endMs: 50 });
  });

  it("orders sequences and retains elapsed gaps", () => {
    const sequence = chronologicalSequence(events);
    expect(sequence.map((event) => event.id)).toEqual(["learn-close", "config", "run-2"]);
    expect(sequence.map((event) => event.elapsedMs)).toEqual([null, 5_000, 5_000]);
  });

  it("records Learn-to-workspace adjacency without causal interpretation", () => {
    const transitionEvents = [
      { id: "open", timeMs: 1, category: "CLICK_EVENT", label: "open", action: "LEARN_MODAL_OPENED", metadata: {} },
      { id: "close", timeMs: 2, category: "CLICK_EVENT", label: "close", action: "LEARN_MODAL_CLOSED", metadata: {} },
      { id: "config", timeMs: 3, category: "PIPELINE_EVENT", label: "config", action: "NODE_CONFIG_CHANGED", metadata: {} },
    ] as TimelineEvent[];
    expect(learnWorkspaceTransitions(transitionEvents)[0].firstWorkspaceEvent?.id).toBe("config");
  });

  it("exports source fields and escapes JSON safely", () => {
    const csv = recordsToCsv([{ session_id: "s1", note: 'a"b' }], ["session_id", "note"]);
    expect(csv).toContain('"s1"');
    expect(csv).toContain('a""b');
  });

  it("keeps missing modalities and incomplete-session windows empty", () => {
    const window = normalizedWindow(100, 200);
    expect(withinWindow([], window)).toEqual([]);
    expect(learnWorkspaceTransitions([])).toEqual([]);
  });
});
