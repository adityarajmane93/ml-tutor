import { describe, expect, it } from "vitest";
import { summarizeErrors } from "./aoi";
import { createSessionContext } from "../store/sessionStore";

describe("session-only identification", () => {
  it("generates distinct UUIDs for independent page contexts", () => {
    const first = createSessionContext();
    const second = createSessionContext();
    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.clientSequence).toBe(0);
    expect(second.clientSequence).toBe(0);
  });
});

describe("gaze validation summaries", () => {
  it("calculates median and mean pixel error without fabricating samples", () => {
    expect(summarizeErrors([])).toEqual({ median: null, mean: null });
    expect(summarizeErrors([10, 20, 100])).toEqual({ median: 20, mean: 130 / 3 });
  });
});
