export type ResearchStudy = { study_id: string | null; session_count: number };
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

async function researchRequest<T>(path: string, researcherKey: string): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: { "X-Researcher-Key": researcherKey },
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Researcher authentication failed." : "Research data could not be loaded.");
  }
  return response.json() as Promise<T>;
}

function nullableScope(idParameter: string, unassignedParameter: string, value: string | null): string {
  return value === null ? `${unassignedParameter}=true` : `${idParameter}=${encodeURIComponent(value)}`;
}

export function getStudies(researcherKey: string): Promise<{ items: ResearchStudy[] }> {
  return researchRequest("/research/studies", researcherKey);
}

export function getParticipants(researcherKey: string, studyId: string | null): Promise<{ items: ResearchParticipant[] }> {
  return researchRequest(`/research/participants?${nullableScope("study_id", "unassigned_study", studyId)}`, researcherKey);
}

export function getSessions(
  researcherKey: string,
  studyId: string | null,
  participantId: string | null,
): Promise<Page<ResearchSession>> {
  return researchRequest(
    `/research/sessions?${nullableScope("study_id", "unassigned_study", studyId)}&${nullableScope("participant_id", "unassigned_participant", participantId)}`,
    researcherKey,
  );
}
