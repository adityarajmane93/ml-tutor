import { useState } from "react";
import type { ResearchStudy } from "../services/researchApi";
import { createStudy, startStudy, stopStudy } from "../services/researchApi";

const panel = { border: "2px solid var(--text)", background: "#fff", padding: 16, marginBottom: 18 };

function date(value: string | null): string { return value ? new Date(value).toLocaleString() : "—"; }

export default function StudyManager({ researcherKey, studies, onChanged }: { researcherKey: string; studies: ResearchStudy[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const formalActive = studies.find((study) => study.status === "active");

  const create = async () => {
    if (!name.trim()) return;
    setPending("create"); setError("");
    try { await createStudy(researcherKey, name.trim(), description.trim()); setName(""); setDescription(""); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Study creation failed."); }
    finally { setPending(null); }
  };
  const start = async (study: ResearchStudy) => {
    if (!study.study_id) return;
    setPending(study.study_id); setError("");
    try { await startStudy(researcherKey, study.study_id); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Study activation failed."); }
    finally { setPending(null); }
  };
  const stop = async (study: ResearchStudy) => {
    if (!study.study_id || !window.confirm(`Stop “${study.name}”? Existing learner sessions will continue with their original study assignment.`)) return;
    setPending(study.study_id); setError("");
    try { await stopStudy(researcherKey, study.study_id); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Study completion failed."); }
    finally { setPending(null); }
  };

  return <section style={panel}><h2 style={{ marginTop: 0 }}>Study Manager</h2><p>Active formal study: <strong>{formalActive ? formalActive.name : "None — new sessions use Testing / Development (0000)."}</strong></p>{error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}<div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 2fr) auto", gap: 8 }}><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description (optional)<input value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className="counter" style={{ margin: 0 }} disabled={!name.trim() || pending === "create"} onClick={() => void create()}>{pending === "create" ? "Saving…" : "Create study"}</button></div><div style={{ overflowX: "auto", marginTop: 14 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">Study</th><th align="left">Status</th><th align="left">Sessions</th><th align="left">Started / stopped</th><th /></tr></thead><tbody>{studies.filter((study) => study.study_id !== null).map((study) => <tr key={study.study_id}><td><strong>{study.name}</strong><br /><code>{study.study_id}</code>{study.description && <small style={{ display: "block" }}>{study.description}</small>}</td><td>{study.status}</td><td>{study.session_count}</td><td>{date(study.started_at)} / {date(study.stopped_at)}</td><td>{study.status === "draft" && <button disabled={pending !== null} onClick={() => void start(study)}>Start</button>}{study.status === "active" && <button disabled={pending !== null} onClick={() => void stop(study)}>Stop</button>}</td></tr>)}</tbody></table></div></section>;
}
