import { describe, expect, it } from "vitest";
import { AFFECT_SERIES_COLORS, WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED, sessionDisplayLabel, studyStatusLabel } from "./researchUiConfig";

describe("research dashboard UI configuration", () => {
  it("keeps SAMM and HSEmotion series visually distinct", () => {
    expect(AFFECT_SERIES_COLORS).toEqual({ hseValence: "#2563eb", hseArousal: "#dc2626", sammValence: "#0891b2", sammArousal: "#9333ea" });
  });

  it("starts workflow reconstruction collapsed and labels sessions deterministically", () => {
    expect(WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED).toBe(false);
    expect(sessionDisplayLabel({ session_id: "a7f9c2abcdef", study_id: "0000", participant_id: null, client_started_at: null, server_started_at: "2026-11-06T14:32:00Z", client_ended_at: null, server_ended_at: null }, 2)).toContain("Session 03");
    expect(studyStatusLabel({ study_id: "0000", name: "Testing / Development", description: null, status: "system-default", created_at: null, started_at: null, stopped_at: null, session_count: 0, system_default: true })).toBe("Default / Testing");
  });
});
