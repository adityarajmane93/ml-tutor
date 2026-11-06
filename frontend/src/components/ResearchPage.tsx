import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getSessions,
  getStudies,
  type ResearchSession,
  type ResearchStudy,
} from "../services/researchApi";
import ResearchDashboard from "./ResearchDashboard";
import StudyManager from "./StudyManager";
import { sessionDisplayLabel } from "../services/researchUiConfig";

const UNASSIGNED = "__unassigned__";

function valueForSelect(value: string | null): string {
  return value ?? UNASSIGNED;
}

function valueFromSelect(value: string): string | null {
  return value === UNASSIGNED ? null : value;
}

function studyLabel(study: ResearchStudy): string {
  return `${study.name} (${study.study_id ?? "historical"})`;
}


export default function ResearchPage() {
  const [researcherKey, setResearcherKey] = useState("");
  const [authenticatedKey, setAuthenticatedKey] = useState<string | null>(null);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [studyId, setStudyId] = useState<string | null | undefined>(undefined);
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshStudies = useCallback(async () => {
    if (!authenticatedKey) return;
    const response = await getStudies(authenticatedKey);
    setStudies(response.items);
  }, [authenticatedKey]);

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!researcherKey) return;
    setLoading(true);
    setError("");
    try {
      setAuthenticatedKey(researcherKey);
      const response = await getStudies(researcherKey);
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
    setSessions([]);
    setSelectedSession(null);
  }, [authenticatedKey, studyId]);

  useEffect(() => {
    if (!authenticatedKey || studyId === undefined) return;
    setSessions([]);
    setSelectedSession(null);
    void getSessions(authenticatedKey, studyId)
      .then((response) => setSessions(response.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Research data could not be loaded."));
  }, [authenticatedKey, studyId]);

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
      <p>Select a study and session to inspect its timestamped multimodal record.</p>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <StudyManager researcherKey={authenticatedKey} studies={studies} onChanged={refreshStudies} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
        <label>Study<select value={studyId === undefined ? "" : valueForSelect(studyId)} onChange={(event) => setStudyId(valueFromSelect(event.target.value))} style={{ display: "block", width: "100%" }}><option value="" disabled>Select a study</option>{studies.map((study) => <option key={valueForSelect(study.study_id)} value={valueForSelect(study.study_id)}>{studyLabel(study)} · {study.session_count} sessions</option>)}</select></label>
        <label>Session<select disabled={studyId === undefined} value={selectedSession?.session_id ?? ""} onChange={(event) => setSelectedSession(sessions.find((session) => session.session_id === event.target.value) ?? null)} style={{ display: "block", width: "100%" }}><option value="" disabled>Select a session</option>{sessions.map((session, index) => <option key={session.session_id} value={session.session_id}>{sessionDisplayLabel(session, index)}</option>)}</select></label>
      </div>
      {selectedSession && <ResearchDashboard researcherKey={authenticatedKey} session={selectedSession} />}
    </main>
  );
}
