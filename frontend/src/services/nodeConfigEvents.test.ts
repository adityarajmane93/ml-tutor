import { describe, expect, it } from "vitest";
import { getNodeConfigChanges } from "./nodeConfigEvents";

describe("getNodeConfigChanges", () => {
  it("omits unchanged values and raw dataset payloads", () => {
    expect(getNodeConfigChanges(
      { algorithm: "knn", k: 5, dataset: [{ target: 1 }], filename: "data.csv" },
      { algorithm: "knn", k: 5, dataset: [{ target: 2 }], filename: "other.csv" },
    )).toEqual([]);
  });

  it("groups related changed parameters in one semantic delta", () => {
    expect(getNodeConfigChanges(
      { algorithm: "knn", k: 5, maxDepth: null },
      { algorithm: "decision_tree", k: 7, maxDepth: 4 },
    )).toEqual([
      { parameter: "algorithm", previous_value: "knn", new_value: "decision_tree" },
      { parameter: "k", previous_value: 5, new_value: 7 },
      { parameter: "maxDepth", previous_value: null, new_value: 4 },
    ]);
  });
});
