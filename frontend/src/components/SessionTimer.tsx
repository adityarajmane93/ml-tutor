// components/SessionTimer.tsx
import { useState, useEffect } from 'react';
import { logEvent } from '../services/logger';



export default function SessionTimer() {
  const [timeElapsed, settimeElapsed] = useState(0); 
  const [showTime, setShowTime] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // Tracks if the 1-hour popup should show 

  // 1. Timer Logic (1 Hour Limit)
  useEffect(() => {
    // 3600 seconds = 1 hour. Stop counting and show the popup. ---
    // if (timeElapsed >= 3600) {
    //     setShowPopup(true);
    //     return;
    // }

    const timerId = setInterval(() => {
      settimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeElapsed]);

  // 2. Auto-Close Logic (5 Seconds)
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
          position: 'fixed',
          top: '20px',
          right: '100px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#ffffff', 
          border: '3px solid #111827', 
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '4px 4px 0px #111827', 
          cursor: 'pointer',
          zIndex: 1000, 
          userSelect: 'none'
        }}
        onClick={handleClockClick} // <-- Change this line!
      >
        <span style={{ fontSize: '1.5rem', lineHeight: '1' }}> ⏰ </span>
        
        {showTime && (
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formattedTime}
          </span>
        )}
      </div>

      {/* --- THE "TIME UP" POPUP MODAL --- */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark semi-transparent background
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          zIndex: 9999 // Ensures it sits above absolutely everything
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '40px',
            border: '4px solid #111827',
            boxShadow: '8px 8px 0px #111827', // Matches your brutalist styling!
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '2rem' }}>⏳ Timer Alert!</h2>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '24px' }}>
              1 Hour has elapsed.
            </p>
            <button 
              onClick={() => setShowPopup(false)}
              style={{
                padding: '10px 24px',
                backgroundColor: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}