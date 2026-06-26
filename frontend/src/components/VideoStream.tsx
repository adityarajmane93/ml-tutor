import  { useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver, type Detection } from "@mediapipe/tasks-vision";
import { useSessionStore } from '../store/sessionStore';
import { devLog }
  from "../flow/logger"

export default function VideoStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null); 
  const canvasRef = useRef<HTMLCanvasElement | null>(null); 
  const [detector, setDetector] = useState<FaceDetector | null>(null);
  const isRecording = useRef<boolean>(false); // Using a ref to prevent stale state in loops
  const sessionId = useSessionStore((state) => state.sessionId);
  const sessionIdRef = useRef(sessionId);
  const rppgWsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRppgRef = useRef(true);
  const reconnectTimerRef = useRef<number | null>(null);
  const rppgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestFaceRef = useRef<Detection | null>(null);
  const [cameraError, setCameraError] = useState(false);
  

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize AI Model on Mount
  useEffect(() => {
    let active = true;
    const initializeMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
      });
      if (active) setDetector(faceDetector);
    };
    initializeMediaPipe();

    return () => { active = false; };
  }, []);

  const baseUrl = import.meta.env.VITE_API_URL; // || "http://localhost:8000"
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws/rppg";

    const connectRppgSocket = () => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        devLog("rPPG Connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.bpm !== undefined) {
            devLog("Live BPM:", data.bpm);
          }
        } catch {
          // no per-frame spam
        }
      };

      ws.onclose = () => {
        devLog("rPPG Closed");

        if (!shouldReconnectRppgRef.current) return;

        reconnectTimerRef.current = window.setTimeout(() => {
          connectRppgSocket();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      rppgWsRef.current = ws;
    };

  useEffect(() => {
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
    if (detector && !isRecording.current) {
      startCamera();
    }
  }, [detector]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      shouldReconnectRppgRef.current = true;
      setCameraError(false);

      if (!rppgWsRef.current || rppgWsRef.current.readyState === WebSocket.CLOSED || rppgWsRef.current.readyState === WebSocket.CLOSING) {
        connectRppgSocket();
      }

      const track = stream.getVideoTracks()[0];

        track.onended = () => {
          console.warn("Camera stopped");
          setCameraError(true);
          shouldReconnectRppgRef.current = false;
          isRecording.current = false;

          if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
          }

          if (rppgWsRef.current) {
            rppgWsRef.current.close();
          }

          stream.getTracks().forEach((t) => t.stop());
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadeddata = () => {
          videoRef.current?.play();
          isRecording.current = true;
          processVideoLoop();
          processRppgLoop();
        };
        
      }
    } catch (err) {
      console.error("Camera permission denied. User must allow access.", err);
      setCameraError(true);
    }
  };

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
    const ratio = Math.min(distRight, distLeft) / Math.max(distRight, distLeft);

    // If the ratio is above 0.4, they are looking generally toward the screen
    return ratio > 0.4;
  };


const processVideoLoop = async () => {
    //If the camera was turned off, permanently kill this loop instance
    if (!isRecording.current) return;

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

      if (isEngaged && canvasRef.current && face.boundingBox) {
        const { originX, originY, width, height } = face.boundingBox;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const padX = width * 0.1;
        const padY = height * 0.1;

        canvas.width = width + (padX * 2);
        canvas.height = height + (padY * 2);

        ctx.drawImage(
          videoRef.current,
          Math.max(0, originX - padX), 
          Math.max(0, originY - padY),
          width + (padX * 2),
          height + (padY * 2),
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.warn("Canvas is empty or failed to create blob.");
            return;
          }
          const formData = new FormData();
          const timestamp = Math.floor(Date.now() / 1000); 
          formData.append("file", blob, `${timestamp}_face.jpg`); 
          formData.append("session_id", sessionIdRef.current);

          try {
            fetch(`${import.meta.env.VITE_API_URL}/predict_valenceArousal`, {
              method: "POST",
              body: formData,
            });
            devLog("Face detected, sent to backend.");
          } catch (error) {
            console.error("Failed to send engaged face to backend", error);
          }
        }, "image/jpeg", 0.9);
      } else {
        devLog("Face detected, but user is looking away. Dropped frame.");
      }

    setTimeout(processVideoLoop, 1000);
  };

  const processRppgLoop = async () => {
    //If the camera was turned off, permanently kill this loop instance
    if (!isRecording.current) return;

    if (!videoRef.current || !detector || videoRef.current.videoWidth === 0) {
      setTimeout(processRppgLoop, 33);
      return;
    }

    const startTimeMs = performance.now();
    const result = detector.detectForVideo(videoRef.current, startTimeMs);
    if (result.detections?.length) {
        latestFaceRef.current = result.detections[0];
    }

    if (result.detections && result.detections.length > 0 && rppgCanvasRef.current) {
      const face = result.detections[0];
      const bbox = face.boundingBox;

      if (bbox) {
        const { originX, originY, width, height } = bbox;

        // Forehead ROI: top 25% height, middle 40% width
        const fx = originX + width * 0.3;
        const fy = originY;
        const fw = width * 0.4;
        const fh = height * 0.25;

        const canvas = rppgCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
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

        if (
          rppgWsRef.current &&
          rppgWsRef.current.readyState === WebSocket.OPEN
        ) {
          rppgWsRef.current.send(
            JSON.stringify({
              session_id: sessionIdRef.current,
              timestamp: Date.now() / 1000,
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            })
          );
        }
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

      {/* Invisible wrapper for the active logic */}
      <div style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", overflow: "hidden" }}>
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} />
        <canvas ref={rppgCanvasRef} />
      </div>
    </>
  );
}