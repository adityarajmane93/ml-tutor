import { describe, expect, it } from "vitest";
import { AFFECT_CENTROIDS, aoiVisits, euclideanDistance, nearestAtOrBefore, observationTime, timelineBounds, withObservationTimes, workflowAt } from "./researchTimeline";

describe("research temporal utilities", () => {
  it("uses original client observations and preserves chronological order", () => {
    const records = withObservationTimes([{ timestamp: "20", client_timestamp: "1970-01-01T00:00:05.000Z" }, { timestamp: "10" }]);
    expect(records.map((record) => record.timeMs)).toEqual([5_000, 10_000]);
    expect(timelineBounds(records.map((record) => record.timeMs))).toEqual([5_000, 10_000]);
    expect(observationTime({ timestamp: "not-a-date" })).toBeNull();
  });

  it("never reconstructs workflow state from a future snapshot", () => {
    const snapshots = [{ timeMs: 10, metadata: { nodes: ["first"], edges: [] } }, { timeMs: 20, metadata: { nodes: ["future"], edges: [] } }];
    expect(workflowAt(snapshots, 15)?.nodes).toEqual(["first"]);
    expect(workflowAt(snapshots, 5)).toBeNull();
    expect(nearestAtOrBefore(snapshots, 20)?.timeMs).toBe(20);
  });

  it("retains AOI chronology and separates gaps", () => {
    expect(aoiVisits([{ timeMs: 0, aoi_type: "model_node", aoi_id: "m1" }, { timeMs: 100, aoi_type: "model_node", aoi_id: "m1" }, { timeMs: 5_000, aoi_type: "model_node", aoi_id: "m1" }])).toHaveLength(2);
  });

  it("handles a long gaze sequence without changing temporal order", () => {
    const samples = Array.from({ length: 10_000 }, (_, index) => ({ timeMs: index * 100, aoi_type: "workspace_background", aoi_id: null }));
    const visits = aoiVisits(samples);
    expect(visits).toEqual([{ aoi_type: "workspace_background", aoi_id: null, startMs: 0, endMs: 999_900, count: 10_000 }]);
  });

  it("calculates only geometric proximity to conceptual centroids", () => {
    expect(euclideanDistance(0, 0, AFFECT_CENTROIDS[6])).toBe(0);
    expect(euclideanDistance(0, 0, AFFECT_CENTROIDS[0])).toBeGreaterThan(0);
  });
});
