// components/SessionTimer.tsx
import { useState, useEffect } from 'react';
import { logEvent } from '../services/logger';



export default function SessionTimer() {
  const [timeElapsed, settimeElapsed] = useState(0); 
  const [showTime, setShowTime] = useState(false);

  // Timer Logic
  useEffect(() => {

    const timerId = setInterval(() => {
      settimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeElapsed]);

  // Auto-Close Logic (5 Seconds)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Whenever showTime becomes true, start a 5-second countdown to hide it
    if (showTime) {
      timeoutId = setTimeout(() => {
        setShowTime(false);
      }, 5000);
    }

    // Cleanup: If the user manually closes it before 5s, cancel the timeout
    return () => {
      if (timeoutId){ 
            clearTimeout(timeoutId);
        }
    };
  }, [showTime]);
  
  const handleClockClick = async () => {
    if (!showTime) {
      // If it's currently hidden, the user is opening it
      await logEvent("CLICK_EVENT", "CLOCK_OPENED", {
        time_elapsed_seconds: timeElapsed
      });
    } else {
      // If it's currently visible, the user is closing it manually
      await logEvent("CLICK_EVENT", "CLOCK_CLOSED_MANUALLY", {
        time_elapsed_seconds: timeElapsed
      });
    }
    
    // Toggle the UI state
    setShowTime(!showTime);
  };

  // Format the elapsed seconds into MM:SS
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <>
      {/* --- THE CLOCK WIDGET --- */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: '#ffffff', 
          border: '4px solid #111827', 
          padding: '10px 10px',
          height: '50px', // Fixed height to match the notebook button
          boxSizing: 'border-box',
          boxShadow: '2.5px 2.5px 0px #111827', 
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: "transform 0.1s ease",
        }}
        onClick={handleClockClick}
        onMouseDown={(e) => e.currentTarget.style.transform = "translate(2px, 2px)"}
        onMouseUp={(e) => e.currentTarget.style.transform = "none"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: '1' }}> ⏰ </span>
        
        {showTime && (
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formattedTime}
          </span>
        )}
      </div>

    </>
  );
}