export type ResearchStudy = { study_id: string | null; name: string; description: string | null; status: string; created_at: string | null; started_at: string | null; stopped_at: string | null; session_count: number; system_default: boolean };
export type ResearchParticipant = { participant_id: string | null; session_count: number };
export type ResearchSession = {
  session_id: string;
  study_id: string | null;
  participant_id: string | null;
  client_started_at: string | null;
  server_started_at: string;
  client_ended_at: string | null;
  server_ended_at: string | null;
};

type Page<T> = { items: T[]; limit: number; offset: number; next_offset: number | null };
export type ResearchEvent = { event_id: string; timestamp: string; client_timestamp: string | null; server_timestamp: string | null; client_sequence: number | null; event_type: string; action: string; source: string; schema_version: string; metadata: Record<string, unknown> };
export type WorkflowSnapshot = { event_id: string; timestamp: string; client_timestamp: string | null; server_timestamp: string | null; client_sequence: number | null; metadata: Record<string, unknown> };
export type AffectObservation = { id: number; timestamp: string; client_timestamp: string | null; server_timestamp: string | null; valence: number; arousal: number };
export type SammObservation = { id: number; timestamp: string; client_timestamp: string | null; server_timestamp: string | null; time_taken_to_answer: number; valence: number; arousal: number; dominance: number };
export type GazeSample = { sample_id: string; session_id: string; client_timestamp: string; server_timestamp: string; elapsed_ms: number; x: number | null; y: number | null; viewport_width: number; viewport_height: number; route: string; aoi_type: string; aoi_id: string | null; calibration_id: string | null; validity_metadata: Record<string, unknown> };
export type PipelineExecution = { execution_id: string; session_id: string; client_started_at: string | null; server_started_at: string; server_completed_at: string | null; status: string; request_metadata: Record<string, unknown> | null; result_metadata: Record<string, unknown> | null; error_message: string | null };
export type GazeCalibration = { calibration_id: string; session_id: string; started_at: string; completed_at: string | null; viewport_width: number; viewport_height: number; calibration_metadata: Record<string, unknown> | null; validation_metadata: Record<string, unknown> | null; median_error_px: number | null; mean_error_px: number | null; quality_status: string };

export type ResearchSessionData = { events: ResearchEvent[]; snapshots: WorkflowSnapshot[]; affect: AffectObservation[]; samm: SammObservation[]; gaze: GazeSample[]; executions: PipelineExecution[]; calibrations: GazeCalibration[] };

async function researchRequest<T>(path: string, researcherKey: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { "X-Researcher-Key": researcherKey, ...(init.headers ?? {}), ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Researcher authentication failed.");
    let detail = "";
    try {
      const body = await response.json() as { detail?: unknown; message?: unknown };
      detail = typeof body.detail === "string" ? body.detail : typeof body.message === "string" ? body.message : "";
    } catch {
      // Some proxy and server errors have no JSON response body.
    }
    throw new Error(`Research request failed (${response.status})${detail ? `: ${detail}` : ""}.`);
  }
  return response.json() as Promise<T>;
}

function nullableScope(idParameter: string, unassignedParameter: string, value: string | null): string {
  return value === null ? `${unassignedParameter}=true` : `${idParameter}=${encodeURIComponent(value)}`;
}

export function getStudies(researcherKey: string): Promise<{ items: ResearchStudy[] }> {
  return researchRequest("/research/studies", researcherKey);
}

export function createStudy(researcherKey: string, name: string, description: string): Promise<{ item: ResearchStudy }> {
  return researchRequest("/research/studies", researcherKey, { method: "POST", body: JSON.stringify({ name, description: description || null }) });
}

export function startStudy(researcherKey: string, studyId: string): Promise<{ item: ResearchStudy }> {
  return researchRequest(`/research/studies/${encodeURIComponent(studyId)}/start`, researcherKey, { method: "POST" });
}

export function stopStudy(researcherKey: string, studyId: string): Promise<{ item: ResearchStudy }> {
  return researchRequest(`/research/studies/${encodeURIComponent(studyId)}/stop`, researcherKey, { method: "POST" });
}
export type DeletionResult = { session_id?: string; study_id?: string; sessions_deleted?: number; deleted: Record<string, number> };
export function deleteResearchSession(researcherKey: string, sessionId: string): Promise<DeletionResult> { return researchRequest(`/research/sessions/${encodeURIComponent(sessionId)}`, researcherKey, { method: "DELETE" }); }
export function clearTestData(researcherKey: string, confirmation: string): Promise<DeletionResult> { return researchRequest(`/research/studies/0000/test-data?confirmation=${encodeURIComponent(confirmation)}`, researcherKey, { method: "DELETE" }); }

export function getParticipants(researcherKey: string, studyId: string | null): Promise<{ items: ResearchParticipant[] }> {
  return researchRequest(`/research/participants?${nullableScope("study_id", "unassigned_study", studyId)}`, researcherKey);
}

export function getSessions(
  researcherKey: string,
  studyId: string | null,
): Promise<Page<ResearchSession>> {
  return researchRequest(
    `/research/sessions?${nullableScope("study_id", "unassigned_study", studyId)}`,
    researcherKey,
  );
}

async function getAllPages<T>(path: string, researcherKey: string): Promise<T[]> {
  const records: T[] = [];
  let offset = 0;
  while (true) {
    const delimiter = path.includes("?") ? "&" : "?";
    const page = await researchRequest<Page<T>>(`${path}${delimiter}limit=500&offset=${offset}`, researcherKey);
    records.push(...page.items);
    if (page.next_offset === null) return records;
    offset = page.next_offset;
  }
}

export async function getResearchSessionData(researcherKey: string, sessionId: string): Promise<ResearchSessionData> {
  const base = `/research/sessions/${encodeURIComponent(sessionId)}`;
  const [events, snapshots, affect, samm, gaze, executions, calibrations] = await Promise.all([
    getAllPages<ResearchEvent>(`${base}/events`, researcherKey),
    getAllPages<WorkflowSnapshot>(`${base}/workflow-snapshots`, researcherKey),
    getAllPages<AffectObservation>(`${base}/affect`, researcherKey),
    getAllPages<SammObservation>(`${base}/samm`, researcherKey),
    getAllPages<GazeSample>(`${base}/gaze-samples`, researcherKey),
    getAllPages<PipelineExecution>(`${base}/executions`, researcherKey),
    getAllPages<GazeCalibration>(`${base}/calibrations`, researcherKey),
  ]);
  return { events, snapshots, affect, samm, gaze, executions, calibrations };
}
