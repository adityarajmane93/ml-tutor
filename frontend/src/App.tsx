import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PipelineCanvas from './components/PipelineCanvas'; 
import LiveAnalyticsDashboard from './components/analytics_dashboard'; 
import "./App.css";

export default function App() {
  return (
    <Router>
      {/*  original wrapper and headings act as a global header */}
      <div
        style={{
          padding: "0.5rem",
          fontFamily: "Arial",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "4px", marginTop: 0 }}>ML-Tutor</h1>
        <p style={{ marginTop: 0 }}>Visual ML Sandbox</p>

        {/* The Routes block determines what loads BELOW your headings */}
        <Routes>
          {/* Webpage 1: The Main Pipeline Editor */}
          <Route path="/" element={<PipelineCanvas />} />
          
          {/* Webpage 2: Analytics Page */}
          <Route path="/analytics" element={<LiveAnalyticsDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}