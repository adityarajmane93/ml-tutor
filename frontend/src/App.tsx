import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

import logo from './images/logo.png'; 
import laLogo from './images/la_logo.png'; 
import etLogo from './images/et_logo.png'; 

import PipelineCanvas from './components/PipelineCanvas'; 
import ConsentFlow from './components/ConsentFlow'; 
import InstructionsPage from './components/InstructionsPage';
import LiveAnalyticsDashboard from './components/AnalyticsDashboard'; 
import StartupDashboard from './components/StartupDashboard'; 
import ProblemStatement from './components/ProblemStatement'; 
import "./App.css";

function AppContent() {
  const navigate = useNavigate();

  // State to track dashboard completion!
  const [hasConsented, setHasConsented] = useState(false); //useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [instructionsViewed, setInstructionsViewed] = useState(false);
  const [problemViewed, setProblemViewed] = useState(false);

  return (
    <div style={{ width: '98%',padding: "0.5rem", textAlign: "center", margin: "0 auto" }}>
      
      { (
        <div style={{ padding: "18px 180px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px", gap: "1px" }}>
            <img src={logo} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
          
          <div style={{ padding: "0px 0px 0px 80px",textAlign: "center", flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "2.4rem", lineHeight: 1, fontWeight: 900, color: "#111827", letterSpacing: "-0.03em"}}>
              ML-TUTOR
            </h1>
            <div style={{ marginTop: 4, fontSize: "1rem", color: "#111827", opacity: 0.85, fontStyle: "italic" }}>
              Visual Machine Learning Sandbox
            </div>
          </div>
          
          <div style={{ width: 200, display: "flex",  gap: "10px"}}> {/*justifyContent: "flex-end",*/}
            <img src={etLogo} alt="CET logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
            <img src={laLogo} alt="LA Lab logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
          </div>
        </div>
      )}

      <Routes>
        {/* The Root Route now checks for Consent first! */}
        <Route path="/" element={
          !hasConsented ? (
            <ConsentFlow onComplete={() => setHasConsented(true)} />
          ) : (
            <StartupDashboard 
              cameraReady={cameraReady}
              setCameraReady={setCameraReady}
              instructionsViewed={instructionsViewed}
              problemViewed={problemViewed}
            />
          )
        } />
        
        {/* The Spoke Routes */}
        <Route path="/problem" element={
          <ProblemStatement onComplete={() => setProblemViewed(true)} />
        } />

        <Route path="/instructions" element={
          <InstructionsPage onComplete={() => {
            setInstructionsViewed(true);
            navigate('/'); // Send them back to the dashboard!
          }} />
        } />

        {/* The Final Destination */}
        <Route path="/sandbox" element={<PipelineCanvas />} />
        
        <Route path="/analytics" element={<LiveAnalyticsDashboard />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}