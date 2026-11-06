import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getParticipants,
  getSessions,
  getStudies,
  type ResearchParticipant,
  type ResearchSession,
  type ResearchStudy,
} from "../services/researchApi";

const UNASSIGNED = "__unassigned__";

function valueForSelect(value: string | null): string {
  return value ?? UNASSIGNED;
}

function valueFromSelect(value: string): string | null {
  return value === UNASSIGNED ? null : value;
}

function identifierLabel(label: string, value: string | null): string {
  return value === null ? `No ${label} recorded` : value;
}

export default function ResearchPage() {
  const [researcherKey, setResearcherKey] = useState("");
  const [authenticatedKey, setAuthenticatedKey] = useState<string | null>(null);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  const [participants, setParticipants] = useState<ResearchParticipant[]>([]);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [studyId, setStudyId] = useState<string | null | undefined>(undefined);
  const [participantId, setParticipantId] = useState<string | null | undefined>(undefined);
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!researcherKey) return;
    setLoading(true);
    setError("");
    try {
      const response = await getStudies(researcherKey);
      setAuthenticatedKey(researcherKey);
      setStudies(response.items);
      setStudyId(undefined);
    } catch (reason) {
      setAuthenticatedKey(null);
      setError(reason instanceof Error ? reason.message : "Researcher authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticatedKey || studyId === undefined) return;
    setParticipants([]);
    setParticipantId(undefined);
    setSessions([]);
    setSelectedSession(null);
    void getParticipants(authenticatedKey, studyId)
      .then((response) => setParticipants(response.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Research data could not be loaded."));
  }, [authenticatedKey, studyId]);

  useEffect(() => {
    if (!authenticatedKey || studyId === undefined || participantId === undefined) return;
    setSessions([]);
    setSelectedSession(null);
    void getSessions(authenticatedKey, studyId, participantId)
      .then((response) => setSessions(response.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Research data could not be loaded."));
  }, [authenticatedKey, studyId, participantId]);

  if (!authenticatedKey) {
    return (
      <main style={{ maxWidth: 440, margin: "10vh auto", padding: 24 }}>
        <h1>Research access</h1>
        <p>Enter the server-configured researcher key to access recorded research data.</p>
        <form onSubmit={(event) => void authenticate(event)}>
          <label htmlFor="researcher-key">Researcher key</label>
          <input id="researcher-key" type="password" autoComplete="current-password" value={researcherKey} onChange={(event) => setResearcherKey(event.target.value)} style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: 10, boxSizing: "border-box" }} />
          {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
          <button className="neo-btn" type="submit" disabled={loading || !researcherKey}>{loading ? "Checking…" : "Continue"}</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: 24, textAlign: "left" }}>
      <h1>Research sessions</h1>
      <p>Select the recorded study, participant, and session. Temporal analysis is added in Stage C.</p>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <label>Study<select value={studyId === undefined ? "" : valueForSelect(studyId)} onChange={(event) => setStudyId(valueFromSelect(event.target.value))} style={{ display: "block", width: "100%" }}><option value="" disabled>Select a study</option>{studies.map((study) => <option key={valueForSelect(study.study_id)} value={valueForSelect(study.study_id)}>{identifierLabel("study ID", study.study_id)} ({study.session_count})</option>)}</select></label>
        <label>Participant<select disabled={studyId === undefined} value={participantId === undefined ? "" : valueForSelect(participantId)} onChange={(event) => setParticipantId(valueFromSelect(event.target.value))} style={{ display: "block", width: "100%" }}><option value="" disabled>Select a participant</option>{participants.map((participant) => <option key={valueForSelect(participant.participant_id)} value={valueForSelect(participant.participant_id)}>{identifierLabel("participant ID", participant.participant_id)} ({participant.session_count})</option>)}</select></label>
        <label>Session<select disabled={participantId === undefined} value={selectedSession?.session_id ?? ""} onChange={(event) => setSelectedSession(sessions.find((session) => session.session_id === event.target.value) ?? null)} style={{ display: "block", width: "100%" }}><option value="" disabled>Select a session</option>{sessions.map((session) => <option key={session.session_id} value={session.session_id}>{session.session_id}</option>)}</select></label>
      </div>
      {selectedSession && <section style={{ marginTop: 28, border: "2px solid var(--text)", padding: 16 }}><h2>Selected session</h2><p><code>{selectedSession.session_id}</code></p><p>Started: {selectedSession.server_started_at}</p><p>{selectedSession.server_ended_at ? `Ended: ${selectedSession.server_ended_at}` : "No end acknowledgement recorded."}</p><p>Its authorized temporal data endpoints are ready for the Stage C dashboard.</p></section>}
    </main>
  );
}
