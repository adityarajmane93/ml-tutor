import type { ResearchSession, ResearchStudy } from "./researchApi";

export const AFFECT_SERIES_COLORS = {
  hseValence: "#2563eb",
  hseArousal: "#dc2626",
  sammValence: "#0891b2",
  sammArousal: "#9333ea",
} as const;

export const WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED = false;

export function sessionDisplayLabel(session: ResearchSession, index: number): string {
  return `Session ${String(index + 1).padStart(2, "0")} | ${new Date(session.server_started_at).toLocaleString()} | ${session.session_id.slice(0, 7)}…`;
}

export function studyStatusLabel(study: ResearchStudy): string {
  return study.system_default ? "Default / Testing" : study.status === "historical-unassigned" ? "Historical unassigned" : study.status;
}
