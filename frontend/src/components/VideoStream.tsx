import  { useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
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
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // 1. Initialize AI Model on Mount
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

  // 2. AUTO-START CAMERA when the detector is ready
  useEffect(() => {
    if (detector && !isRecording.current) {
      startCamera();
    }
  }, [detector]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadeddata = () => {
          videoRef.current?.play();
          isRecording.current = true;
          processVideoLoop();
        };
        
      }
    } catch (err) {
      console.error("Camera permission denied. User must allow access.", err);
    }
  };

  // 3. THE ENGAGEMENT HEURISTIC
  const checkEngagement = (face: any): boolean => {
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

  // 4. Detect, Filter, Crop, and Send Loop
const processVideoLoop = async () => {
    if (!videoRef.current || !detector || videoRef.current.videoWidth === 0) {
      setTimeout(processVideoLoop, 100); 
      return;
    }

    let startTimeMs = performance.now();
    const result = detector.detectForVideo(videoRef.current, startTimeMs);

    // 2. Safely check for result.detections instead of faces
    if (result.detections && result.detections.length > 0) {
      // 3. Grab the first detection
      const face = result.detections[0]; 
      
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
    }

    setTimeout(processVideoLoop, 500);
  };

  return (
    // Invisible wrapper. The component asks for permissions, logs the data, and stays hidden.
    <div style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", overflow: "hidden" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted // Muted is STRICTLY required for auto-play to work on load
      />
      <canvas ref={canvasRef} />
    </div>
  );
}