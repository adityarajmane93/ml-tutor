import { useEffect, useRef, useState } from "react";
import { queueGazeSample, saveCalibration } from "../services/gaze";
import { classifyAoi, summarizeErrors } from "../services/aoi";
import { getSessionContext } from "../store/sessionStore";
import { releaseCamera } from "../services/cameraManager";
import { loadWebGazer } from "../services/webgazerLoader";
import type { GazeData, WebGazer } from "../types/webgazer";

type Phase = "notice" | "calibrating" | "validating" | "review" | "ready" | "error";
const calibrationPoints = [[10,10],[50,10],[90,10],[10,50],[50,50],[90,50],[10,90],[50,90],[90,90]];
const validationPoints = [[25,25],[75,25],[50,50],[25,75],[75,75]];
const CLICKS_PER_POINT = 3;
const SAMPLE_INTERVAL_MS = 100;

type Props = { onReady: () => void; onStopped: () => void };

export default function GazeCalibration({ onReady, onStopped }: Props) {
  const [phase, setPhase] = useState<Phase>("notice");
  const [pointIndex, setPointIndex] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [errorSummary, setErrorSummary] = useState<{ median: number | null; mean: number | null }>({ median: null, mean: null });
  const calibrationId = useRef(crypto.randomUUID());
  const startedAt = useRef("");
  const latestGaze = useRef<GazeData>(null);
  const errors = useRef<number[]>([]);
  const lastStoredAt = useRef(0);
  const active = useRef(false);
  const initializing = useRef(false);
  const webgazerRef = useRef<WebGazer | null>(null);
  const phaseRef = useRef<Phase>("notice");

  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next); };

  const stopWebGazer = () => {
    const instance = webgazerRef.current;
    webgazerRef.current = null;
    if (!instance) return;
    try { instance.clearGazeListener(); } catch { /* initialization may have failed before a listener existed */ }
    try { instance.stopVideo(); } catch { /* WebGazer may not have obtained a stream */ }
    try { instance.end(); } catch { /* WebGazer may not have created its preview elements */ }
  };

  const stop = () => {
    active.current = false;
    stopWebGazer();
    onStopped();
  };

  useEffect(() => () => stop(), []);
  useEffect(() => {
    const shutdown = () => stop();
    window.addEventListener("ml-tutor:shutdown-modalities", shutdown);
    return () => window.removeEventListener("ml-tutor:shutdown-modalities", shutdown);
  }, []);

  const listener = (data: GazeData) => {
    latestGaze.current = data;
    if (!active.current || phaseRef.current !== "ready" || !data || Date.now() - lastStoredAt.current < SAMPLE_INTERVAL_MS) return;
    lastStoredAt.current = Date.now();
    const aoi = classifyAoi(data.x, data.y);
    queueGazeSample({
      sample_id: crypto.randomUUID(), session_id: getSessionContext().sessionId, client_timestamp: new Date().toISOString(),
      elapsed_ms: Math.max(0, Date.now() - Date.parse(getSessionContext().clientStartedAt)), x: data.x, y: data.y, viewport_width: window.innerWidth, viewport_height: window.innerHeight,
      route: window.location.pathname, aoi_type: aoi.type, aoi_id: aoi.id, calibration_id: calibrationId.current,
      validity_metadata: { source: "webgazer", prediction_present: true },
    });
  };

  const start = async () => {
    if (initializing.current || active.current) return;
    initializing.current = true;
    try {
      // WebGazer 3.5.3 has no supported external MediaStream API. Release the
      // shared MediaPipe track before it requests its one browser-owned stream.
      window.dispatchEvent(new Event("ml-tutor:pause-video"));
      releaseCamera();
      const webgazer = await loadWebGazer();
      webgazerRef.current = webgazer;
      await webgazer.clearData();
      webgazer.saveDataAcrossSessions(false).showVideoPreview(false).showFaceOverlay(false).showFaceFeedbackBox(false).showPredictionPoints(false).setGazeListener(listener);
      // Avoid WebGazer's default "No stream" console callback. The catch
      // below presents the single actionable application error instead.
      await webgazer.begin(() => undefined);
      startedAt.current = new Date().toISOString();
      active.current = true;
      changePhase("calibrating"); setPointIndex(0); setClicks(0);
    } catch (error) {
      stopWebGazer();
      window.dispatchEvent(new Event("ml-tutor:resume-video"));
      console.error("WebGazer initialization failed", error);
      changePhase("error");
    } finally {
      initializing.current = false;
    }
  };

  const point = (phase === "calibrating" ? calibrationPoints : validationPoints)[pointIndex];
  const pointStyle = point ? { left: `${point[0]}vw`, top: `${point[1]}vh` } : {};
  const handlePoint = async () => {
    if (!point) return;
    const x = window.innerWidth * point[0] / 100; const y = window.innerHeight * point[1] / 100;
    webgazerRef.current?.recordScreenPosition(x, y, "click");
    if (phase === "validating" && latestGaze.current) errors.current.push(Math.hypot(latestGaze.current.x - x, latestGaze.current.y - y));
    if (phase === "calibrating" && clicks + 1 < CLICKS_PER_POINT) { setClicks(clicks + 1); return; }
    setClicks(0);
    const last = (phase === "calibrating" ? calibrationPoints : validationPoints).length - 1;
    if (pointIndex < last) { setPointIndex(pointIndex + 1); return; }
    if (phase === "calibrating") { changePhase("validating"); setPointIndex(0); return; }
    const summary = summarizeErrors(errors.current);
    setErrorSummary(summary);
    const quality = summary.median === null ? "insufficient_validation" : summary.median <= 150 ? "acceptable" : "low";
    const saved = await saveCalibration({ calibration_id: calibrationId.current, session_id: getSessionContext().sessionId, started_at: startedAt.current, completed_at: new Date().toISOString(), viewport_width: window.innerWidth, viewport_height: window.innerHeight, calibration_metadata: { points: calibrationPoints, clicks_per_point: CLICKS_PER_POINT, implementation: "webgazer@3.5.3" }, validation_metadata: { points: validationPoints, errors_px: errors.current }, median_error_px: summary.median, mean_error_px: summary.mean, quality_status: quality });
    if (!saved) { changePhase("error"); return; }
    if (quality === "low" || quality === "insufficient_validation") { changePhase("review"); return; }
    changePhase("ready"); onReady();
  };

  if (phase === "ready") return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#fff", display: "grid", placeItems: "center", color: "#111827" }}>
    {phase === "notice" && <div style={{ maxWidth: 560, textAlign: "center" }}><h2>Eye-tracking notice</h2><p>Approximate gaze coordinates will be recorded in this browser during this session. No webcam video is sent to the server.</p><button className="neo-btn" onClick={() => void start()}>Start calibration</button></div>}
    {(phase === "calibrating" || phase === "validating") && <><p style={{ position: "fixed", top: 24 }}> {phase === "calibrating" ? `Calibration ${pointIndex + 1}/9 — click each point ${CLICKS_PER_POINT} times` : `Validation ${pointIndex + 1}/5 — look at and click each point`} </p><button aria-label="Calibration target" onClick={() => void handlePoint()} style={{ position: "fixed", transform: "translate(-50%, -50%)", width: 34, height: 34, borderRadius: "50%", border: "4px solid #111827", background: "#fbbf24", cursor: "pointer", ...pointStyle }} /></>}
    {phase === "error" && <div style={{ textAlign: "center" }}><h2>Eye tracking could not be started</h2><p>Check camera permission and retry. No gaze collection is active.</p><button className="neo-btn" onClick={() => { calibrationId.current = crypto.randomUUID(); errors.current = []; changePhase("notice"); }}>Retry calibration</button></div>}
    {phase === "review" && <div style={{ textAlign: "center", maxWidth: 560 }}><h2>Calibration quality is low</h2><p>Median validation error: {errorSummary.median === null ? "unavailable" : `${Math.round(errorSummary.median)} px`}. Recalibration is recommended; this is not research-grade accuracy evidence.</p><div style={{ display: "flex", justifyContent: "center", gap: 12 }}><button className="neo-btn" onClick={() => { stop(); calibrationId.current = crypto.randomUUID(); errors.current = []; changePhase("notice"); }}>Recalibrate</button><button className="neo-btn" onClick={() => { changePhase("ready"); onReady(); }}>Continue with low quality</button></div></div>}
    {errorSummary.median !== null && <span>Median validation error: {Math.round(errorSummary.median)} px</span>}
  </div>;
}
