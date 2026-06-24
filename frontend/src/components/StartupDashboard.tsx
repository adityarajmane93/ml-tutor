import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DashboardProps = {
  cameraReady: boolean;
  setCameraReady: (val: boolean) => void;
  instructionsViewed: boolean;
  problemViewed: boolean;
};

export default function StartupDashboard({
  cameraReady,
  setCameraReady,
  instructionsViewed,
  problemViewed,
}: DashboardProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // Starts the camera for the live preview box
  const requestCamera = async () => {
    try {
      setCameraError(null); // Clear previous errors
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      console.error("Camera access denied", err);
      // alert("Please allow camera access in your browser settings to continue.");
      setCameraError("Camera access was blocked. Please click the lock icon in your browser URL bar, allow the camera, and try again.");
    }
  };

  // Clean up the camera light if they navigate away from the dashboard
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const allTasksComplete = cameraReady && instructionsViewed && problemViewed;

  return (
    <div style={{ minHeight: "80vh", padding: "40px", boxSizing: "border-box" }}>
      <div className="neo-card" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        <h2 style={{ fontSize: "2.5rem", margin: "0 0 30px 0", textAlign: "center", borderBottom: "4px solid #111827", paddingBottom: "20px" }}>
          Welcome Setup
        </h2>

        {/* THE 3 BOXES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", marginBottom: "40px" }}>
          
          {/* BOX 1: Camera Setup */}
          <div style={{ border: "4px solid #111827", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px", backgroundColor: cameraReady ? "#f0fdf4" : "#fff" }}>
            <h3 style={{ margin: 0 }}>1. Camera Setup</h3>
            {/* If there's an error, show a red warning box! */}
              {cameraError && (
                <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}>
                  ⚠️ {cameraError}
                </div>
              )}
            <p style={{ margin: 0, color: "#4b5563", fontSize: "0.95rem" }}>
              We use AI to read your expressions. Please allow camera access.
            </p>
            
            <div style={{ flex: 1, backgroundColor: "#000", borderRadius: "8px", overflow: "hidden", minHeight: "150px", display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              
              {/* THE FIX: Always render the video so the 'ref' exists when the camera turns on! */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                  width: "100%", height: "100%", objectFit: "cover", 
                  display: cameraReady ? "block" : "none" // Hide it until the camera is ready
                }} 
              />

              {/* Show the button layered on top if not ready */}
              {!cameraReady && (
                <button 
                  className="neo-btn"
                  onClick={requestCamera} 
                  style={{ position: 'absolute', padding: "10px 20px" }}
                >
                  Enable Camera
                </button>
              )}
            </div>
            {cameraReady && <div style={{ color: "#16a34a", fontWeight: "bold", textAlign: "center" }}>✓ Camera Ready</div>}
          </div>

          {/* BOX 2: Instructions */}
          <div style={{ border: "4px solid #111827", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px", backgroundColor: instructionsViewed ? "#f0fdf4" : "#fff" }}>
            <h3 style={{ margin: 0 }}>2. App Instructions</h3>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "0.95rem", flex: 1 }}>
              Learn how to connect blocks, run the pipeline, and use the smart notebook.
            </p>
            <button 
              onClick={() => navigate('/instructions')}
              style={{ padding: "12px", border: "3px solid #111827", backgroundColor: "#fbbf24", fontWeight: "bold", cursor: "pointer", borderRadius: "6px" }}
            >
              {instructionsViewed ? "Review Instructions" : "Read Instructions"}
            </button>
            {instructionsViewed && <div style={{ color: "#16a34a", fontWeight: "bold", textAlign: "center" }}>✓ Completed</div>}
          </div>

          {/* BOX 3: Problem Statement */}
          <div style={{ border: "4px solid #111827", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px", backgroundColor: problemViewed ? "#f0fdf4" : "#fff" }}>
            <h3 style={{ margin: 0 }}>3. Problem Statement</h3>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "0.95rem", flex: 1 }}>
              Read the scenario to understand what you are trying to predict with your AI model.
            </p>
            <button 
              onClick={() => navigate('/problem')}
              style={{ padding: "12px", border: "3px solid #111827", backgroundColor: "#fbbf24", fontWeight: "bold", cursor: "pointer", borderRadius: "6px" }}
            >
              {problemViewed ? "Review Problem" : "Read Problem"}
            </button>
            {problemViewed && <div style={{ color: "#16a34a", fontWeight: "bold", textAlign: "center" }}>✓ Completed</div>}
          </div>

        </div>

        {/* BOTTOM CHECKBOX & SUBMIT */}
        <div style={{ borderTop: "4px solid #111827", paddingTop: "30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem", fontWeight: "bold", cursor: allTasksComplete ? "pointer" : "not-allowed", opacity: allTasksComplete ? 1 : 0.5 }}>
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
              disabled={!allTasksComplete}
              style={{ width: "20px", height: "20px" }}
            />
            I have completed all steps and am ready to begin.
          </label>

          <button
            className="neo-btn"
            onClick={() => navigate('/sandbox')}
            disabled={!agreed}
            style={{ fontSize: "1.5rem", textTransform: "uppercase" }}
          >
            Enter Sandbox
          </button>
        </div>

      </div>
    </div>
  );
}