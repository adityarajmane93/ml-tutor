import { useMemo, useState } from "react";
import type { AffectObservation, GazeSample, PipelineExecution, ResearchEvent, SammObservation, WorkflowSnapshot } from "../services/researchApi";
import { centeredWindow, chronologicalSequence, downloadCsv, learnWorkspaceTransitions, recordsToCsv, withinWindow, type TimeWindow } from "../services/researchAnalysis";
import { workflowAt, type Timed, type TimelineEvent } from "../services/researchTimeline";

const panel = { border: "2px solid var(--text)", background: "#fff", padding: 16 };

function formatTime(timeMs: number): string { return new Date(timeMs).toLocaleString(); }
function elapsed(ms: number | null): string { return ms === null ? "start" : `${(ms / 1000).toFixed(1)} s after previous`; }

type Props = {
  sessionId: string;
  setCursor: (timeMs: number) => void;
  selectedEvent: TimelineEvent | null;
  setSelectedEvent: (event: TimelineEvent | null) => void;
  events: TimelineEvent[];
  rawEvents: Timed<ResearchEvent>[];
  snapshots: Timed<WorkflowSnapshot>[];
  affect: Timed<AffectObservation>[];
  samm: Timed<SammObservation>[];
  gaze: Timed<GazeSample>[];
  executions: Timed<PipelineExecution>[];
  affectWindow: TimeWindow | null;
  clearAffectWindow: () => void;
};

export default function ResearchAnalysis({ sessionId, setCursor, selectedEvent, setSelectedEvent, events, rawEvents, snapshots, affect, samm, gaze, executions, affectWindow, clearAffectWindow }: Props) {
  const [windowSeconds, setWindowSeconds] = useState(30);
  const [customSeconds, setCustomSeconds] = useState("30");
  const analysisWindow = selectedEvent ? centeredWindow(selectedEvent.timeMs, windowSeconds) : null;
  const sequence = useMemo(() => chronologicalSequence(events), [events]);
  const learnTransitions = useMemo(() => learnWorkspaceTransitions(events), [events]);

  const exportWindow = (window: TimeWindow, label: string) => {
    const suffix = `${sessionId}-${label}-${window.startMs}-${window.endMs}`;
    const exportOne = (name: string, rows: Array<Record<string, unknown>>, columns: string[]) => downloadCsv(`${suffix}-${name}.csv`, recordsToCsv(rows, columns));
    exportOne("events", withinWindow(rawEvents, window), ["event_id", "session_id", "timestamp", "client_timestamp", "server_timestamp", "client_sequence", "event_type", "action", "source", "schema_version", "metadata"]);
    exportOne("gaze", withinWindow(gaze, window), ["sample_id", "session_id", "client_timestamp", "server_timestamp", "elapsed_ms", "x", "y", "viewport_width", "viewport_height", "route", "aoi_type", "aoi_id", "calibration_id", "validity_metadata"]);
    exportOne("affect", withinWindow(affect, window), ["id", "timestamp", "client_timestamp", "server_timestamp", "valence", "arousal"]);
    exportOne("samm", withinWindow(samm, window), ["id", "timestamp", "client_timestamp", "server_timestamp", "time_taken_to_answer", "valence", "arousal", "dominance"]);
    exportOne("executions", withinWindow(executions, window), ["execution_id", "session_id", "client_started_at", "server_started_at", "server_completed_at", "status", "request_metadata", "result_metadata", "error_message"]);
    exportOne("workflow-snapshots", withinWindow(snapshots, window), ["event_id", "timestamp", "client_timestamp", "server_timestamp", "client_sequence", "metadata"]);
  };

  const renderWindow = (window: TimeWindow, title: string) => {
    const actions = withinWindow(events, window);
    const gazeWindow = withinWindow(gaze, window);
    const affectWindowRecords = withinWindow(affect, window);
    const sammWindow = withinWindow(samm, window);
    const executionWindow = withinWindow(executions, window);
    const before = workflowAt(snapshots, window.startMs);
    const after = workflowAt(snapshots, window.endMs);
    return <section style={panel}><h3>{title}</h3><p>{formatTime(window.startMs)} – {formatTime(window.endMs)}</p><button className="counter" style={{ margin: 0 }} onClick={() => exportWindow(window, title.toLowerCase().replaceAll(" ", "-"))}>Export this window as CSV</button><div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}><div><strong>Actions ({actions.length})</strong><ul>{actions.map((event) => <li key={event.id}><button onClick={() => { setCursor(event.timeMs); setSelectedEvent(event); }}>{new Date(event.timeMs).toLocaleTimeString()} · {event.label}</button></li>)}</ul></div><div><strong>Gaze AOI ({gazeWindow.length})</strong><ul>{gazeWindow.slice(0, 40).map((sample) => <li key={sample.sample_id}>{new Date(sample.timeMs).toLocaleTimeString()} · {sample.aoi_type}{sample.aoi_id ? ` (${sample.aoi_id})` : ""}</li>)}</ul>{gazeWindow.length > 40 && <p>Showing first 40 source samples.</p>}</div><div><strong>Modalities</strong><p>HSEmotion: {affectWindowRecords.length} observations</p><p>SAMM: {sammWindow.length} responses</p><p>Executions: {executionWindow.length}</p></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><details><summary>Workflow at window start</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(before, null, 2)}</pre></details><details><summary>Workflow at window end</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(after, null, 2)}</pre></details></div></section>;
  };

  return <section style={{ display: "grid", gap: 16 }}>
    <section style={panel}><h2>Event-centered analysis</h2><p>Select an event from the timeline, then inspect recorded observations around it. This view does not infer learner state.</p><label>Window <select value={windowSeconds} onChange={(event) => setWindowSeconds(Number(event.target.value))}><option value={10}>±10 seconds</option><option value={30}>±30 seconds</option><option value={60}>±60 seconds</option></select></label><label style={{ marginLeft: 12 }}>Custom ± seconds <input type="number" min="1" value={customSeconds} onChange={(event) => setCustomSeconds(event.target.value)} /><button onClick={() => setWindowSeconds(Math.max(1, Number(customSeconds) || 30))}>Apply</button></label>{selectedEvent ? <><p><strong>{selectedEvent.label}</strong> at {formatTime(selectedEvent.timeMs)}</p>{analysisWindow && renderWindow(analysisWindow, "Event-centered window")}</> : <p>Select an event in the timeline above.</p>}</section>

    <section style={panel}><h2>Affect-centered analysis</h2><p>Click two observed points in the affect chart to define an interval. The dashboard preserves actual observations; it does not label or interpret the affect change.</p>{affectWindow ? <>{renderWindow(affectWindow, "Affect-selected interval")}<button className="counter" style={{ margin: 0 }} onClick={clearAffectWindow}>Clear affect interval</button></> : <p>No affect interval selected.</p>}</section>

    <section style={panel}><h2>Chronological sequence</h2><p>Sequence respects the active event-category filters. Gaps show elapsed time between actual records.</p><div style={{ maxHeight: 280, overflow: "auto" }}>{sequence.map((event) => <button key={event.id} onClick={() => { setCursor(event.timeMs); setSelectedEvent(event); }} style={{ display: "block", width: "100%", textAlign: "left", background: "#fff", border: "1px solid #111827", padding: 7, marginBottom: 5 }}>{formatTime(event.timeMs)} · {event.label} <small>({elapsed(event.elapsedMs)})</small></button>)}</div></section>

    <section style={panel}><h2>Learn-to-workspace transitions</h2><p>These are recorded temporal adjacencies only; Learn use is not presented as a cause of later workspace activity.</p>{learnTransitions.length ? <ul>{learnTransitions.map((transition) => <li key={transition.learnEvent.id}><button onClick={() => { setCursor(transition.learnEvent.timeMs); setSelectedEvent(transition.learnEvent); }}>{formatTime(transition.learnEvent.timeMs)} · Learn closed</button> → {transition.firstWorkspaceEvent ? <button onClick={() => { setCursor(transition.firstWorkspaceEvent!.timeMs); setSelectedEvent(transition.firstWorkspaceEvent!); }}>{transition.firstWorkspaceEvent.label} ({((transition.firstWorkspaceEvent.timeMs - transition.learnEvent.timeMs) / 1000).toFixed(1)} s later)</button> : "No later workspace action recorded"}</li>)}</ul> : <p>No recorded Learn-close events.</p>}</section>
  </section>;
}
