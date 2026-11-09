import  { useEffect, useRef, useState } from "react";
import { type FaceDetector, type Detection } from "@mediapipe/tasks-vision";
import { useSessionStore } from '../store/sessionStore';
import { acquireCamera, releaseCamera } from "../services/cameraManager";
import { getFaceDetector, mediaPipeErrorDetails } from "../services/faceDetector";
import { devLog }
  from "../flow/logger"

export default function VideoStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null); 
  const canvasRef = useRef<HTMLCanvasElement | null>(null); 
  const [detector, setDetector] = useState<FaceDetector | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const isRecording = useRef<boolean>(false); // Using a ref to prevent stale state in loops
  const sessionId = useSessionStore((state) => state.sessionId);
  const sessionIdRef = useRef(sessionId);
  const rppgWsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRppgRef = useRef(true);
  const reconnectTimerRef = useRef<number | null>(null);
  const rppgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestFaceRef = useRef<Detection | null>(null);
  const affectInFlightRef = useRef(false);
  const startingRef = useRef(false);
  const rppgSentRef = useRef(0);
  const [cameraError, setCameraError] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const ENABLE_BACKEND = true;
  const ending = useSessionStore((state) => state.ending || state.ended);
  

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize AI Model on Mount
  useEffect(() => {
    let active = true;
    const initializeMediaPipe = async () => {
      try {
        const faceDetector = await getFaceDetector();
        if (active) {
          detectorRef.current = faceDetector;
          setDetector(faceDetector);
        }
      } catch (error) {
        console.error("[mediapipe] face detector initialization failed", mediaPipeErrorDetails(error));
        if (active) setAnalysisError("Facial analysis could not be initialized. Affect and rPPG collection are unavailable.");
      }
    };
    void initializeMediaPipe();

    return () => {
      active = false;
      detectorRef.current = null;
    };
  }, []);

  const stopCamera = () => {
    isRecording.current = false;
    shouldReconnectRppgRef.current = false;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    rppgWsRef.current?.close(1000, "session ended");
    rppgWsRef.current = null;
    startingRef.current = false;
    releaseCamera("video-stream");
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    const pause = () => stopCamera();
    const resume = () => {
      if (!useSessionStore.getState().ending && !useSessionStore.getState().ended && !isRecording.current) {
        void startCamera();
      }
    };
    window.addEventListener("ml-tutor:shutdown-modalities", pause);
    window.addEventListener("ml-tutor:pause-video", pause);
    window.addEventListener("ml-tutor:resume-video", resume);
    return () => {
      window.removeEventListener("ml-tutor:shutdown-modalities", pause);
      window.removeEventListener("ml-tutor:pause-video", pause);
      window.removeEventListener("ml-tutor:resume-video", resume);
      stopCamera();
    };
  }, []);

  const baseUrl = import.meta.env.VITE_API_URL;
  const wsUrl = baseUrl ? baseUrl.replace(/^http/, "ws") + "/ws/rppg" : null;

    function connectRppgSocket() {
      if (!wsUrl) {
        console.error("[rppg] WebSocket not started: VITE_API_URL is not configured");
        return;
      }
      const existing = rppgWsRef.current;
      if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return;
      console.info("[rppg] connecting", { url: wsUrl });
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.info("[rppg] socket open");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.bpm !== undefined) {
            console.info("[rppg] BPM calculated", { bpm: data.bpm });
          }
        } catch (error) {
          console.warn("[rppg] invalid socket response", { error });
        }
      };

      ws.onclose = (event) => {
        console.warn("[rppg] socket closed", { code: event.code, reason: event.reason || "none" });
        if (rppgWsRef.current === ws) rppgWsRef.current = null;

        if (!shouldReconnectRppgRef.current) return;

        reconnectTimerRef.current = window.setTimeout(() => {
          connectRppgSocket();
        }, 2000);
      };

      ws.onerror = () => {
        console.error("[rppg] socket error; closing connection");
        ws.close();
      };

      rppgWsRef.current = ws;
    }
  useEffect(() => {
      if (!ENABLE_BACKEND) return;
      connectRppgSocket();

      return () => {
        shouldReconnectRppgRef.current = false;
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        if (rppgWsRef.current) {
          rppgWsRef.current.close();
        }
      };
    }, []);

  // AUTO-START CAMERA when the detector is ready
  useEffect(() => {
    if (detector && !isRecording.current && !ending) {
      startCamera();
    }
  }, [detector, ending]);

  async function startCamera() {
    if (ending || isRecording.current || startingRef.current) return;
    startingRef.current = true;
    try {
      const stream = await acquireCamera("video-stream");
      shouldReconnectRppgRef.current = true;
      setCameraError(false);
      if(ENABLE_BACKEND){
        if (!rppgWsRef.current || rppgWsRef.current.readyState === WebSocket.CLOSED || rppgWsRef.current.readyState === WebSocket.CLOSING) {
          connectRppgSocket();
        }
      }

      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("Managed camera stream has no video track");

        const trackEnded = () => {
          console.warn("[camera] video track ended while VideoStream was active");
          setCameraError(true);
          shouldReconnectRppgRef.current = false;
          isRecording.current = false;

          if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
          }

          if (rppgWsRef.current) {
            rppgWsRef.current.close();
          }

          releaseCamera("video-stream");
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };
        track.addEventListener("ended", trackEnded, { once: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadeddata = () => {
          void videoRef.current?.play().catch((error) => {
            console.error("[camera] video playback could not start", { error });
            setCameraError(true);
          });
          isRecording.current = true;
          startingRef.current = false;
          console.info("[camera] VideoStream active", { width: videoRef.current?.videoWidth, height: videoRef.current?.videoHeight });
          processVideoLoop();
          processRppgLoop();
        };
      } else {
        throw new Error("Video element is unavailable");
      }
    } catch (err) {
      console.error("[camera] VideoStream activation failed", { error: err });
      setCameraError(true);
      releaseCamera("video-stream");
    } finally {
      // onloadeddata clears this before loops begin; this covers every early
      // failure path and keeps a reconnect click from being ignored forever.
      if (!isRecording.current) startingRef.current = false;
    }
  }

  // THE ENGAGEMENT HEURISTIC
  const checkEngagement = (face: Detection): boolean => {
    // MediaPipe keypoint indices: 0=Right Eye, 1=Left Eye, 2=Nose Tip
    const rightEye = face.keypoints[0];
    const leftEye = face.keypoints[1];
    const nose = face.keypoints[2];

    if (!rightEye || !leftEye || !nose) return false;

    // Calculate horizontal distance from nose to each eye
    const distRight = Math.abs(nose.x - rightEye.x);
    const distLeft = Math.abs(leftEye.x - nose.x);

    // Calculate ratio. 1.0 = perfect forward gaze. 
    // Drops near 0 if the head is turned completely sideways.
    const widestDistance = Math.max(distRight, distLeft);
    if (!Number.isFinite(widestDistance) || widestDistance <= 0) return false;
    const ratio = Math.min(distRight, distLeft) / widestDistance;

    // If the ratio is above 0.4, they are looking generally toward the screen
    return ratio > 0.4;
  };

  const validBoundingBox = (face: Detection) => {
    const bbox = face.boundingBox;
    const video = videoRef.current;
    if (!bbox || !video) return null;
    const { originX, originY, width, height } = bbox;
    if (![originX, originY, width, height].every(Number.isFinite) || width <= 1 || height <= 1) return null;
    const x = Math.max(0, originX);
    const y = Math.max(0, originY);
    const right = Math.min(video.videoWidth, originX + width);
    const bottom = Math.min(video.videoHeight, originY + height);
    if (right - x <= 1 || bottom - y <= 1) return null;
    return { x, y, width: right - x, height: bottom - y };
  };


const processVideoLoop = async () => {
    //If the camera was turned off, permanently kill this loop instance
    if (!isRecording.current || useSessionStore.getState().ending || useSessionStore.getState().ended) return;

    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      setTimeout(processVideoLoop, 100); 
      return;
    }

    // const result = detector.detectForVideo(videoRef.current, startTimeMs);
    const face = latestFaceRef.current;

    if (!face) {
        setTimeout(processVideoLoop, 1000);
        return;
    }
      
      const isEngaged = checkEngagement(face);
      const bounds = validBoundingBox(face);

      if (isEngaged && canvasRef.current && bounds && !affectInFlightRef.current) {
        const { x, y, width, height } = bounds;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("[affect] face frame extraction failed: 2D canvas is unavailable");
          setTimeout(processVideoLoop, 1000);
          return;
        }

        const padX = width * 0.1;
        const padY = height * 0.1;
        const sourceX = Math.max(0, x - padX);
        const sourceY = Math.max(0, y - padY);
        const sourceRight = Math.min(videoRef.current.videoWidth, x + width + padX);
        const sourceBottom = Math.min(videoRef.current.videoHeight, y + height + padY);
        const sourceWidth = sourceRight - sourceX;
        const sourceHeight = sourceBottom - sourceY;
        if (sourceWidth <= 1 || sourceHeight <= 1) {
          console.warn("[affect] face frame extraction skipped: crop is outside the video frame");
          setTimeout(processVideoLoop, 1000);
          return;
        }

        canvas.width = Math.round(sourceWidth);
        canvas.height = Math.round(sourceHeight);

        ctx.drawImage(
          videoRef.current,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        affectInFlightRef.current = true;
        canvas.toBlob(async (blob) => {
          if (!blob) {
            affectInFlightRef.current = false;
            console.warn("[affect] face frame extraction failed: canvas produced no image");
            return;
          }
          const formData = new FormData();
          const timestamp = Math.floor(Date.now() / 1000); 
          formData.append("file", blob, `${timestamp}_face.jpg`); 
          formData.append("session_id", sessionIdRef.current);
          formData.append("client_timestamp", new Date().toISOString());

          let timeout: number | null = null;
          try {
            if (ENABLE_BACKEND){
              const abortController = new AbortController();
              timeout = window.setTimeout(() => abortController.abort(), 20_000);
              const response = await fetch(`${import.meta.env.VITE_API_URL}/predict_valenceArousal`, {
                method: "POST",
                body: formData,
                signal: abortController.signal,
              });
              window.clearTimeout(timeout);
              timeout = null;
              if (!response.ok) {
                throw new Error(`Core API returned HTTP ${response.status}`);
              }
              await response.json();
              console.info("[affect] inference response received successfully");
            }
          } catch (error) {
            console.error("[affect] request failed", { error });
          } finally {
            if (timeout !== null) window.clearTimeout(timeout);
            affectInFlightRef.current = false;
          }
        }, "image/jpeg", 0.9);
      } else {
        const reason = !isEngaged ? "engagement_gate" : !bounds ? "invalid_bounding_box" : affectInFlightRef.current ? "request_in_flight" : "canvas_unavailable";
        devLog("[affect] sample skipped", { reason });
      }

    setTimeout(processVideoLoop, 1000);
  };

  const processRppgLoop = async () => {
    //If the camera was turned off, permanently kill this loop instance
    if (!isRecording.current || useSessionStore.getState().ending || useSessionStore.getState().ended) return;

    if (!videoRef.current || !detector || videoRef.current.videoWidth === 0) {
      setTimeout(processRppgLoop, 33);
      return;
    }

    // currentTime is the capture clock and avoids assigning a synthetic frame
    // time when the browser throttles this loop.
    const startTimeMs = videoRef.current.currentTime * 1000;
    const result = detector.detectForVideo(videoRef.current, startTimeMs);
    if (result.detections?.length) {
        latestFaceRef.current = result.detections[0];
    }

    if (result.detections && result.detections.length > 0 && rppgCanvasRef.current) {
      const face = result.detections[0];
      const bbox = validBoundingBox(face);

      if (bbox) {
        const { x, y, width, height } = bbox;

        // Forehead ROI: top 25% height, middle 40% width
        const fx = x + width * 0.3;
        const fy = y;
        const fw = width * 0.4;
        const fh = height * 0.25;

        const canvas = rppgCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setTimeout(processRppgLoop, 33);
          return;
        }

        if (fw <= 1 || fh <= 1) {
          console.warn("[rppg] sample skipped: forehead ROI is invalid");
          setTimeout(processRppgLoop, 33);
          return;
        }

        canvas.width = 1;
        canvas.height = 1;

        ctx.drawImage(
          videoRef.current,
          Math.max(0, fx),
          Math.max(0, fy),
          fw,
          fh,
          0,
          0,
          1,
          1
        );

        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const rgb = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
        };

        if (ENABLE_BACKEND) {
          if (
            rppgWsRef.current &&
            rppgWsRef.current.readyState === WebSocket.OPEN
          ) {
            rppgWsRef.current.send(
              JSON.stringify({
                session_id: sessionIdRef.current,
                timestamp: videoRef.current.currentTime,
                client_timestamp: new Date().toISOString(),
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
              })
            );
            rppgSentRef.current += 1;
            if (rppgSentRef.current % 30 === 0) {
              console.info("[rppg] RGB samples sent", { acceptedByClient: rppgSentRef.current });
            }
          } else if (rppgSentRef.current % 90 === 0) {
            // This is intentionally rate-limited: it explains missing data
            // without logging face pixels or flooding the console every frame.
            devLog("[rppg] sample not sent: socket is not open");
          }
        }
      } else {
        devLog("[rppg] sample skipped: invalid face bounding box");
      }
    }

    setTimeout(processRppgLoop, 33);
  };

  return (
    <>
      {/* Full-Screen Freeze Overlay if the camera drops */}
      {cameraError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 99999, // Way above the canvas!
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '40px', border: '5px solid #111827',
            boxShadow: '10px 10px 0px #111827', borderRadius: '12px', textAlign: 'center', maxWidth: '450px'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '2.2rem', color: '#111827' }}>📷 Camera Lost</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '24px', color: '#4b5563' }}>
              We lost access to your webcam. This learning activity requires an active camera feed to continue.
            </p>
            <button 
              className="neo-btn"
              onClick={startCamera}
              style={{ padding: '16px 32px', backgroundColor: '#3b82f6', color: '#ffffff', width: '100%' }}
            >
              Reconnect Camera
            </button>
          </div>
        </div>
      )}

      {analysisError && (
        <div role="alert" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 99999, maxWidth: 420, padding: 16, background: "#fff", border: "3px solid #b91c1c", color: "#111827" }}>
          {analysisError}
        </div>
      )}

      {/* Invisible wrapper for the active logic */}
      <div style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", overflow: "hidden" }}>
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} />
        <canvas ref={rppgCanvasRef} />
      </div>
    </>
  );
}
