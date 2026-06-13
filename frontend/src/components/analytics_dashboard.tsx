import { useEffect, useState } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 1. Register the Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// ADDED: Helper to format the timestamp into a readable clock time
const formatTime = (rawTime: string) => {
  if (!rawTime) return "";

  const isNumeric = /^\d+$/.test(rawTime);

  if (!isNumeric) {
    // If it is already a Unix timestamp (from your webcam), pass it straight through
    // If it is an ISO string (from SAMM), convert it precisely to Unix time (seconds)
    rawTime=Math.floor(new Date(rawTime).getTime() / 1000).toString();
  }
  const date = new Date(Number(rawTime) * 1000) ;
  const istString = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
  return istString; 
};

export default function LiveAnalyticsDashboard() {
  const [liveAffectData, setLiveAffectData] = useState<any[]>([]);
  const [liveSammData, setLiveSammData] = useState<any[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/dashboard`);
    
    ws.onmessage = (event) => {
      const newLog = JSON.parse(event.data);
      
      if (newLog.event_type === "SAMM_ADJUSTMENT") {
        // 1. Update SAMM Chart State
        setLiveSammData((prevData) => {
          const newPoint = {
            name: formatTime(newLog.timestamp),
            valence: newLog.metadata.valence,
            arousal: newLog.metadata.arousal,
            dominance: newLog.metadata.dominance
          };
          // Keep only the latest 20 points so the chart doesn't get overcrowded
          return [...prevData, newPoint].slice(-20);
        });

      } else if (newLog.event_type === "AFFECT_STATE") { 
        // 2. Update Webcam Affect Chart State (Assuming you name the event this)
        setLiveAffectData((prevData) => {
          const newPoint = {
            name: formatTime(newLog.timestamp),
            valence: newLog.metadata.valence,
            arousal: newLog.metadata.arousal
          };
          return [...prevData, newPoint].slice(-30); // Maybe keep 30 for webcam since it's faster
        });
      }
    };

    return () => ws.close();
  }, []);

  // --- CHART CONFIGURATIONS ---
  // 1. Webcam Options (-1 to 1 Scale)
  const affectChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      y: { min: -1, max: 1, grid: { color: '#e5e7eb' } },
      // CHANGED: Turned ticks to display: true and angled them
      x: { grid: { display: false }, ticks: { display: true, maxRotation: 45, minRotation: 45, font: { size: 10 } } } 
    },
    plugins: { legend: { position: 'top' as const } }
  };

  // 2. SAMM Options (0 to 5 Scale)
  const sammChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }, 
    scales: {
      y: { min: -1, max: 1, grid: { color: '#e5e7eb' } }, 
      // CHANGED: Turned ticks to display: true and angled them
      x: { grid: { display: false }, ticks: { display: true, maxRotation: 45, minRotation: 45, font: { size: 10 } } } 
    },
    plugins: { legend: { position: 'top' as const } }
  };

  const affectChartData = {
    labels: liveAffectData.map(d => d.name),
    datasets: [
      { label: 'Valence', data: liveAffectData.map(d => d.valence), borderColor: '#3b82f6', tension: 0.3, pointRadius: 0 },
      { label: 'Arousal', data: liveAffectData.map(d => d.arousal), borderColor: '#ef4444', tension: 0.3, pointRadius: 0 }
    ]
  };

  const sammChartData = {
    labels: liveSammData.map(d => d.name),
    datasets: [
      { label: 'Valence', data: liveSammData.map(d => d.valence), borderColor: '#3b82f6', tension: 0.3, pointRadius: 4 },
      { label: 'Arousal', data: liveSammData.map(d => d.arousal), borderColor: '#ef4444', tension: 0.3, pointRadius: 4 },
      { label: 'Dominance', data: liveSammData.map(d => d.dominance), borderColor: '#10b981', tension: 0.3, pointRadius: 4 }
    ]
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'var(--surface)', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      overflowY: 'auto' 
    }}>
      
      <h2 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem', textAlign: 'center' }}>
        System Analytics Dashboard
      </h2>

      {/* CHART 1: Webcam Affect */}
      <div style={{ flex: 1, minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '8px' }}>Webcam Affect Logs (Live)</h3>
        {liveAffectData.length === 0 ? (
          <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Waiting for webcam data...</p>
        ) : (
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <Line data={affectChartData} options={affectChartOptions} />
          </div>
        )}
      </div>

      {/* CHART 2: SAMM Records */}
      <div style={{ flex: 1, minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '8px' }}>SAMM Inputs (Live)</h3>
        {liveSammData.length === 0 ? (
          <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Waiting for SAMM slider data...</p>
        ) : (
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <Line data={sammChartData} options={sammChartOptions} />
          </div>
        )}
      </div>

    </div>  
  );
}