import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import ResearchAnalysis from "./ResearchAnalysis";
import type { ResearchSession, ResearchSessionData } from "../services/researchApi";
import { getResearchSessionData } from "../services/researchApi";
import {
  AFFECT_CENTROIDS, aoiVisits, euclideanDistance, nearestAtOrBefore, nearby,
  timelineBounds, withObservationTimes, workflowAt, type TimelineEvent,
} from "../services/researchTimeline";
import { normalizedWindow, type TimeWindow } from "../services/researchAnalysis";
import { AFFECT_SERIES_COLORS, WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED } from "../services/researchUiConfig";

ChartJS.register(LinearScale, LineElement, PointElement, Tooltip, Legend);

const circumplexBoundary = {
  id: "circumplexBoundary",
  afterDraw(chart: any) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const size = Math.min(chartArea.width, chartArea.height);
    ctx.save(); ctx.strokeStyle = "#111827"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc((chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2, size / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  },
};

const panel: CSSProperties = { border: "2px solid var(--text)", background: "#fff", padding: 16 };
const aoiLabels = ["outside", "unknown", "workspace_background", "dataset_node", "preprocessing_node", "model_node", "evaluation_node", "workflow_node", "learn_navigation", "learn_content", "learn_notes", "learn_controls"];

function aoiIndex(type: string): number {
  const index = aoiLabels.indexOf(type);
  return index === -1 ? aoiLabels.indexOf("unknown") : index;
}

function formatTime(timeMs: number): string {
  return new Date(timeMs).toLocaleString();
}

function shortTime(timeMs: number): string {
  return new Date(timeMs).toLocaleTimeString();
}

function asTimedEvents(data: ResearchSessionData): TimelineEvent[] {
  const events = withObservationTimes(data.events).map((event) => ({ id: event.event_id, timeMs: event.timeMs, category: event.event_type, label: event.action, action: event.action, metadata: event.metadata }));
  const samm = withObservationTimes(data.samm).map((record) => ({ id: `samm-${record.id}`, timeMs: record.timeMs, category: "SAMM", label: "SAMM submission", action: "SAMM_SUBMISSION", metadata: { valence: record.valence, arousal: record.arousal, dominance: record.dominance }, derived: true }));
  const executions = withObservationTimes(data.executions.map((record) => ({ ...record, timestamp: record.client_started_at ?? record.server_started_at, client_timestamp: record.client_started_at, server_timestamp: record.server_started_at }))).map((record) => ({ id: `execution-${record.execution_id}`, timeMs: record.timeMs, category: "EXECUTION", label: `Pipeline ${record.status}`, action: "PIPELINE_EXECUTION", metadata: { execution_id: record.execution_id, status: record.status, error_message: record.error_message }, derived: true }));
  return [...events, ...samm, ...executions].sort((left, right) => left.timeMs - right.timeMs);
}

function ReadOnlyWorkflow({ workflow }: { workflow: { nodes: unknown[]; edges: unknown[] } | null }) {
  if (!workflow) return <p>No workflow snapshot was recorded at or before this time.</p>;
  return <div><strong>{workflow.nodes.length} nodes · {workflow.edges.length} connections</strong><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{workflow.nodes.map((node, index) => {
    const item = node as { id?: string; type?: string; data?: Record<string, unknown>; position?: { x?: number; y?: number } };
    return <div key={item.id ?? index} style={{ border: "1px solid #111827", padding: 8 }}><strong>{item.type ?? "node"}</strong> <code>{item.id}</code><br /><small>Position: {item.position?.x ?? "?"}, {item.position?.y ?? "?"}</small><pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: 11 }}>{JSON.stringify(item.data ?? {}, null, 2)}</pre></div>;
  })}</div><details style={{ marginTop: 10 }}><summary>Connections</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(workflow.edges, null, 2)}</pre></details></div>;
}

export default function ResearchDashboard({ researcherKey, session }: { researcherKey: string; session: ResearchSession }) {
  const [data, setData] = useState<ResearchSessionData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [series, setSeries] = useState({ hValence: true, hArousal: true, sValence: true, sArousal: true });
  const [radius, setRadius] = useState(0.1);
  const [showVisits, setShowVisits] = useState(false);
  const [zoomWindowMs, setZoomWindowMs] = useState<number | null>(null);
  const [affectWindow, setAffectWindow] = useState<TimeWindow | null>(null);
  const [workflowExpanded, setWorkflowExpanded] = useState(WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(null); setCursor(null); setSelectedEvent(null); setZoomWindowMs(null); setAffectWindow(null); setWorkflowExpanded(WORKFLOW_RECONSTRUCTION_DEFAULT_EXPANDED);
    void getResearchSessionData(researcherKey, session.session_id).then((next) => {
      if (!active) return;
      const times = [
        ...withObservationTimes(next.events).map((record) => record.timeMs),
        ...withObservationTimes(next.affect).map((record) => record.timeMs),
        ...withObservationTimes(next.samm).map((record) => record.timeMs),
        ...withObservationTimes(next.gaze).map((record) => record.timeMs),
      ];
      const bounds = timelineBounds(times, session.server_started_at, session.server_ended_at);
      setData(next); setCursor(bounds?.[0] ?? null); setLoading(false);
    }).catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Research data could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, [researcherKey, session]);

  const affect = useMemo(() => data ? withObservationTimes(data.affect) : [], [data]);
  const samm = useMemo(() => data ? withObservationTimes(data.samm) : [], [data]);
  const gaze = useMemo(() => data ? withObservationTimes(data.gaze) : [], [data]);
  const snapshots = useMemo(() => data ? withObservationTimes(data.snapshots) : [], [data]);
  const rawEvents = useMemo(() => data ? withObservationTimes(data.events) : [], [data]);
  const executions = useMemo(() => data ? withObservationTimes(data.executions.map((record) => ({ ...record, timestamp: record.client_started_at ?? record.server_started_at, client_timestamp: record.client_started_at, server_timestamp: record.server_started_at }))) : [], [data]);
  const events = useMemo(() => data ? asTimedEvents(data) : [], [data]);
  const bounds = useMemo(() => timelineBounds([...affect, ...samm, ...gaze, ...events].map((record) => record.timeMs), session.server_started_at, session.server_ended_at), [affect, samm, gaze, events, session]);
  const eventCategories = useMemo(() => [...new Set(events.map((event) => event.category))], [events]);
  const visibleEvents = useMemo(() => events.filter((event) => filters[event.category] !== false), [events, filters]);
  const workflow = cursor === null ? null : workflowAt(snapshots, cursor);
  const currentAffect = cursor === null ? null : nearestAtOrBefore(affect, cursor);
  const currentSamm = cursor === null ? null : nearestAtOrBefore(samm, cursor);
  const currentVisits = useMemo(() => aoiVisits(gaze), [gaze]);

  if (loading) return <section style={panel}>Loading recorded session data…</section>;
  if (error) return <section style={panel}><p role="alert" style={{ color: "#b91c1c" }}>{error}</p></section>;
  if (!data || cursor === null || !bounds) return <section style={panel}>This session has no timestamped research observations.</section>;

  const [start, end] = bounds;
  const viewStart = zoomWindowMs === null ? start : Math.max(start, cursor - zoomWindowMs / 2);
  const viewEnd = zoomWindowMs === null ? end : Math.min(end, cursor + zoomWindowMs / 2);
  const currentAffectIsContiguous = currentAffect !== null && cursor - currentAffect.timeMs <= 15_000;
  const currentPoint = currentAffectIsContiguous && currentAffect ? { valence: currentAffect.valence, arousal: currentAffect.arousal, label: "HSEmotion" } : currentSamm ? { valence: currentSamm.valence, arousal: currentSamm.arousal, label: "SAMM" } : null;
  const affectChartData = {
    datasets: [
      series.hValence && { label: "HSEmotion valence", data: affect.map((point) => ({ x: point.timeMs, y: point.valence })), borderColor: AFFECT_SERIES_COLORS.hseValence, pointRadius: 2, pointHitRadius: 12, spanGaps: 15_000 },
      series.hArousal && { label: "HSEmotion arousal", data: affect.map((point) => ({ x: point.timeMs, y: point.arousal })), borderColor: AFFECT_SERIES_COLORS.hseArousal, pointRadius: 2, pointHitRadius: 12, spanGaps: 15_000 },
      series.sValence && { label: "SAMM valence (discrete)", data: samm.map((point) => ({ x: point.timeMs, y: point.valence })), borderColor: AFFECT_SERIES_COLORS.sammValence, backgroundColor: AFFECT_SERIES_COLORS.sammValence, pointRadius: 6, pointStyle: "rectRot", showLine: false },
      series.sArousal && { label: "SAMM arousal (discrete)", data: samm.map((point) => ({ x: point.timeMs, y: point.arousal })), borderColor: AFFECT_SERIES_COLORS.sammArousal, backgroundColor: AFFECT_SERIES_COLORS.sammArousal, pointRadius: 5, pointStyle: "circle", showLine: false },
      { label: "Selected time", data: [{ x: cursor, y: -1 }, { x: cursor, y: 1 }], borderColor: "#111827", borderDash: [4, 4], pointRadius: 0 },
    ].filter(Boolean),
  } as any;
  const linearTimeOptions = { responsive: true, maintainAspectRatio: false, animation: false, parsing: false, scales: { x: { type: "linear", min: viewStart, max: viewEnd, ticks: { callback: (value: string | number) => shortTime(Number(value)) } }, y: { min: -1, max: 1 } }, plugins: { tooltip: { callbacks: { title: (items: any[]) => items.length ? formatTime(items[0].parsed.x) : "" } } } } as any;
  const affectOptions = { ...linearTimeOptions, onClick: (_event: unknown, elements: Array<{ datasetIndex: number; index: number }>, chart: any) => {
    const element = elements[0];
    if (!element) return;
    const point = chart.data.datasets[element.datasetIndex]?.data?.[element.index] as { x?: unknown } | undefined;
    const selectedTime = point?.x;
    if (typeof selectedTime !== "number") return;
    setCursor(selectedTime);
    setAffectWindow((current) => current === null ? { startMs: selectedTime, endMs: selectedTime } : normalizedWindow(current.startMs, selectedTime));
  } } as any;
  const aoiData = { datasets: [{ label: "AOI sample", data: gaze.map((sample) => ({ x: sample.timeMs, y: aoiIndex(sample.aoi_type), aoi: sample.aoi_type, id: sample.aoi_id })), borderColor: "#7c3aed", backgroundColor: "#7c3aed", stepped: true, pointRadius: gaze.length > 1500 ? 0 : 2, showLine: true, spanGaps: 2_000 }, { label: "Selected time", data: [{ x: cursor, y: 0 }, { x: cursor, y: aoiLabels.length - 1 }], borderColor: "#111827", borderDash: [4, 4], pointRadius: 0 } ] } as any;
  const aoiOptions = { ...linearTimeOptions, scales: { x: linearTimeOptions.scales.x, y: { min: 0, max: aoiLabels.length - 1, ticks: { callback: (value: string | number) => aoiLabels[Number(value)] ?? "" } } }, plugins: { tooltip: { callbacks: { title: (items: any[]) => items.length ? formatTime(items[0].parsed.x) : "", label: (item: any) => `${item.raw.aoi ?? "selected"}${item.raw.id ? ` · ${item.raw.id}` : ""}` } } } } as any;
  const circumplexData = { datasets: [
    { label: "Conceptual reference centroids", data: AFFECT_CENTROIDS.map((centroid) => ({ x: centroid.valence, y: centroid.arousal, emotion: centroid.name })), backgroundColor: "#9ca3af", pointRadius: 5, showLine: false },
    currentAffectIsContiguous && currentAffect && { label: "HSEmotion observation", data: [{ x: currentAffect.valence, y: currentAffect.arousal, source: "HSEmotion" }], backgroundColor: "#dc2626", pointRadius: 7, showLine: false },
    currentSamm && { label: "SAMM observation", data: [{ x: currentSamm.valence, y: currentSamm.arousal, source: "SAMM" }], backgroundColor: "#0891b2", pointRadius: 7, pointStyle: "rectRot", showLine: false },
  ].filter(Boolean) } as any;
  const circumplexOptions = { responsive: true, maintainAspectRatio: true, aspectRatio: 1, animation: false, parsing: false, scales: { x: { type: "linear", min: -1, max: 1, title: { display: true, text: "Valence" }, grid: { color: (c: any) => c.tick.value === 0 ? "#111827" : "#e5e7eb", lineWidth: (c: any) => c.tick.value === 0 ? 2.5 : 1 } }, y: { min: -1, max: 1, title: { display: true, text: "Arousal" }, grid: { color: (c: any) => c.tick.value === 0 ? "#111827" : "#e5e7eb", lineWidth: (c: any) => c.tick.value === 0 ? 2.5 : 1 } } }, plugins: { tooltip: { callbacks: { label: (item: any) => { const raw = item.raw; const point = { valence: item.parsed.x, arousal: item.parsed.y }; if (raw.emotion) return [`Reference: ${raw.emotion}`, `Valence ${point.valence.toFixed(2)}, Arousal ${point.arousal.toFixed(2)}`]; const nearest = AFFECT_CENTROIDS.map((c) => ({ ...c, distance: euclideanDistance(point.valence, point.arousal, c) })).sort((a,b) => a.distance - b.distance)[0]; return [`${raw.source}: V ${point.valence.toFixed(2)}, A ${point.arousal.toFixed(2)}`, `Nearest reference: ${nearest ? nearest.name : "No sufficiently close reference"}`]; } } } } } as any;
  const nearestCentroids = currentPoint ? AFFECT_CENTROIDS.map((centroid) => ({ ...centroid, distance: euclideanDistance(currentPoint.valence, currentPoint.arousal, centroid) })).filter((centroid) => centroid.distance <= radius) : [];

  return <section style={{ display: "grid", gap: 16, marginTop: 24 }}>
    <div style={panel}><strong>Session:</strong> <code>{session.session_id}</code><p style={{ margin: "8px 0" }}>Cursor: {formatTime(cursor)} · HSEmotion: {affect.length} observations · SAMM: {samm.length} responses · Gaze: {gaze.length} samples · Calibrations: {data.calibrations.length}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="counter" style={{ margin: 0 }} onClick={() => setCursor(visibleEvents.filter((event) => event.timeMs < cursor).at(-1)?.timeMs ?? start)}>Previous event</button><button className="counter" style={{ margin: 0 }} onClick={() => setCursor(visibleEvents.find((event) => event.timeMs > cursor)?.timeMs ?? end)}>Next event</button><label>Chart zoom <select value={zoomWindowMs ?? "all"} onChange={(event) => setZoomWindowMs(event.target.value === "all" ? null : Number(event.target.value))}><option value="all">Full session</option><option value={60_000}>1 minute around cursor</option><option value={300_000}>5 minutes around cursor</option></select></label></div><input aria-label="Session time" type="range" min={start} max={end} step={Math.max(1, Math.round((end - start) / 2000))} value={cursor} onChange={(event) => setCursor(Number(event.target.value))} style={{ width: "100%", marginTop: 14 }} /></div>

    <div style={panel}><h2>Affect trajectory</h2><p>HSEmotion observations are connected only across short recorded gaps; SAMM is shown as discrete self-report points. Click two observed points to select an affect-centered interval.</p><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{([['hValence','HSE valence'], ['hArousal','HSE arousal'], ['sValence','SAMM valence'], ['sArousal','SAMM arousal']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={series[key]} onChange={() => setSeries((current) => ({ ...current, [key]: !current[key] }))} /> {label}</label>)}</div><div style={{ height: 360 }}><Line data={affectChartData} options={affectOptions} /></div></div>

    <div style={panel}><h2>Learning-centered affect circumplex</h2><p>Reference centroids are exploratory conceptual placements, not emotion classifications or confidence estimates.</p><label>Conceptual proximity radius <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>{[0.05, 0.1, 0.15].map((value) => <option value={value} key={value}>{value.toFixed(2)}</option>)}</select></label><div style={{ height: 500, maxHeight: "70vw" }}><Line data={circumplexData} options={circumplexOptions} plugins={[circumplexBoundary]} /></div><p>{currentPoint ? `${currentPoint.label} at (${currentPoint.valence.toFixed(2)}, ${currentPoint.arousal.toFixed(2)}).` : "No affect observation at or before this time."}</p><p>Within selected radius: {nearestCentroids.length ? nearestCentroids.map((item) => `${item.name} (${item.distance.toFixed(3)})`).join(", ") : "none"}</p><details><summary>Reference centroid coordinates</summary><ul>{AFFECT_CENTROIDS.map((item) => <li key={item.name}>{item.name}: ({item.valence.toFixed(2)}, {item.arousal.toFixed(2)})</li>)}</ul></details></div>

    <div style={panel}><h2>Temporal AOI observations</h2><p>Timestamped classifications retain node IDs where recorded. This is a temporal track, not an aggregate attention measure.</p><div style={{ height: 300 }}><Line data={aoiData} options={aoiOptions} /></div><label><input type="checkbox" checked={showVisits} onChange={() => setShowVisits((value) => !value)} /> Show short contiguous AOI visits</label>{showVisits && <div style={{ maxHeight: 160, overflow: "auto" }}>{currentVisits.map((visit, index) => <button key={`${visit.startMs}-${index}`} className="counter" style={{ margin: "6px", fontSize: 12 }} onClick={() => setCursor(visit.startMs)}>{shortTime(visit.startMs)}–{shortTime(visit.endMs)} · {visit.aoi_type}{visit.aoi_id ? ` (${visit.aoi_id})` : ""} · {visit.count} samples</button>)}</div>}</div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 1fr)", gap: 16 }}><div style={panel}><h2>Event timeline</h2><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{eventCategories.map((category) => <label key={category}><input type="checkbox" checked={filters[category] !== false} onChange={() => setFilters((current) => ({ ...current, [category]: current[category] === false }))} /> {category}</label>)}</div><div style={{ maxHeight: 360, overflow: "auto", marginTop: 10 }}>{visibleEvents.map((event) => <button key={event.id} onClick={() => { setCursor(event.timeMs); setSelectedEvent(event); }} style={{ display: "block", width: "100%", textAlign: "left", border: "1px solid #111827", background: selectedEvent?.id === event.id ? "#fde68a" : "#fff", padding: 8, marginBottom: 6, cursor: "pointer" }}><strong>{shortTime(event.timeMs)}</strong> · {event.category} · {event.label}{event.derived ? " (derived display marker)" : ""}</button>)}</div></div><div style={panel}><h2>Event detail</h2>{selectedEvent ? <><p><strong>{selectedEvent.label}</strong><br />{formatTime(selectedEvent.timeMs)}</p><pre style={{ whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>{JSON.stringify(selectedEvent.metadata, null, 2)}</pre></> : <p>Select an event to inspect its recorded metadata.</p>}<h3>Nearby events (±10 seconds)</h3><ul>{nearby(visibleEvents, cursor).map((event) => <li key={event.id}>{shortTime(event.timeMs)} · {event.label}</li>)}</ul></div></div>

    <div style={panel}><button type="button" aria-expanded={workflowExpanded} className="counter" style={{ margin: 0, width: "100%", textAlign: "left" }} onClick={() => setWorkflowExpanded((expanded) => !expanded)}>{workflowExpanded ? "⌄" : "›"} Workflow Reconstruction</button>{workflowExpanded && <><p>Shows the most recent recorded snapshot at or before the cursor; never a future state.</p><ReadOnlyWorkflow workflow={workflow} /></>}</div>

    <ResearchAnalysis sessionId={session.session_id} setCursor={setCursor} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} events={visibleEvents} rawEvents={rawEvents} snapshots={snapshots} affect={affect} samm={samm} gaze={gaze} executions={executions} affectWindow={affectWindow} clearAffectWindow={() => setAffectWindow(null)} />
  </section>;
}
