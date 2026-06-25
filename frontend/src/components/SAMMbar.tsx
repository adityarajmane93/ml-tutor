import { useState, useEffect, type MouseEvent } from 'react';
import { useSessionStore } from '../store/sessionStore';

import { devLog }
  from "../flow/logger"

// ─── IMPORT SAMM IMAGES ───
import h1 from '../images/1.png';
import e1 from '../images/2.png';
import c1 from '../images/3.png';

type SammBarProps = {
  leftLabel: string;
  rightLabel: string;
  bgImage: string; // Imported images resolve to strings (URLs/paths)
  selectedValue: number | null; // It starts as null, then becomes a number
  onSelect: (val: number) => void; // A function that takes the new number
  borderColor: string;
  borderTransition: string;
};

type ResponsesState = {
  valence: number | null;
  arousal: number | null;
  dominance: number | null;
};

// Reusable component for a single feedback bar
const SammBar = ({ leftLabel, rightLabel, bgImage, selectedValue, onSelect, borderColor, borderTransition }:SammBarProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const [hoverValue, setHoverValue] = useState<number | null>(null);

    // Calculates percentage based on mouse position
    const handleMouse = (e: MouseEvent<HTMLDivElement>, isClick: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Calculate the raw -1 to 1 value
    const rawValue = ((x / rect.width) * 2) - 1;
    
    // Clamp it between -1 and 1 and round to the nearest 0.1 step
    const steppedValue = Math.round(Math.max(-1, Math.min(1, rawValue)) * 10) / 10;
    
    // Allow 0 as a valid selection.
    if (isClick) {
      onSelect(steppedValue);
    } else {
      setHoverValue(steppedValue);
    }
  };

  // Decide whether to show the active hover width, the saved click width, or 0
  const currentFill = hoverValue !== null ? hoverValue : (selectedValue !== null ? selectedValue : -1);

  // Track if this specific bar has been answered
  const isAnswered = selectedValue !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right', fontSize: '0.85rem' }}>{leftLabel}</span>
        
        <div 
          className="neo-slider-track"
          style={{ 
            display: 'flex', flex: 1, 
            minWidth: '200px',
            height: '50px',
            alignItems: 'center', 
            padding: '1 5px', 
            position: 'relative', 
            
            // ─── DYNAMIC STYLES STAY INLINE ───
            border: `4px solid ${borderColor}`,
            transition: borderTransition,
            backgroundImage: `url(${bgImage})`,
            backgroundColor: isHovered || isAnswered ? 'rgba(241, 207, 83,0.1)' : 'transparent', 
          }}
          onMouseMove={(e) => { setIsHovered(true); handleMouse(e, false); }}
          onClick={(e) => handleMouse(e, true)}
          onMouseLeave={() => { setIsHovered(false); setHoverValue(null); }}
        >
        
        <div 
          className="neo-slider-fill" 
          style={{
            // Scales -1 (0%) to 1 (100%)
            width: `${((currentFill + 1) / 2) * 100}%`, 
            transition: hoverValue !== null ? 'none' : 'width 0.3s ease', 
          }} 
        />
        </div>

        <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'left', fontSize: '0.85rem' }}>{rightLabel}</span>
      </div>
    </div>
  );
};

export default function SAMMTracker({  }: { } = {}) {
  const sessionId = useSessionStore((state) => state.sessionId);
  const [timePassed, setTimePassed] = useState(0);
  const [isFlashYellow, setIsFlashYellow] = useState(true);
  
  // Responses start as null. The backend will now receive an integer from 0 to 100.
  const [responses, setResponses] = useState<ResponsesState>({
    valence: null,
    arousal: null,
    dominance: null
  });

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimePassed(prev => {
        if (prev >= 90) return 90;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flashing Logic
  useEffect(() => {
    let flashTimer: ReturnType<typeof setInterval> | undefined;;
    if (timePassed >= 90) {
      flashTimer = setInterval(() => setIsFlashYellow(prev => !prev), 500);
    }
    return () => clearInterval(flashTimer);
  }, [timePassed]);

  // Submission Logic (Triggers automatically when all 3 sliders have been moved)
  useEffect(() => {
    if (responses.valence !== null && responses.arousal !== null && responses.dominance !== null) {
      submitFeedback();
    }
  }, [responses]);

  const submitFeedback = async () => {
    const payload = {
      session_id: sessionId,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      timeTakenToAnswer: timePassed,
      data: responses
    };

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/samm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      devLog("SAMM data submitted:", payload);
    } catch (error) {
      console.error("Failed to save SAMM data", error);
    }

    // Reset everything for the next round
    setResponses({ valence: null, arousal: null, dominance: null });
    setTimePassed(0);
  };

  // Border Color Logic 
  const getDynamicBorderColor = () => {
    if (timePassed >= 90) {
      return isFlashYellow ? 'var(--primary)' : '#b7bdbc';
    } else if (timePassed >= 70) {
      return 'var(--primary)';
    } else {
      const progress = timePassed / 70;
      const r = Math.round(255 - (14 * progress));  // 255 drops to 241
      const g = Math.round(255 - (48 * progress));  // 255 drops to 207
      const b = Math.round(255 - (172 * progress)); // 255 drops to 83
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const currentBorderColor = getDynamicBorderColor();
  const currentTransition = timePassed >= 90 ? 'border-color 0.1s' : 'border-color 1s linear';

  return (
    <div style={{ padding: '12px 20px', borderRadius: '12px' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
        
        <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '1.2rem', whiteSpace: 'nowrap', width: '100%' }}>
          How are you feeling?
        </h2>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: "column", // <-- Now it listens to the prop!
          gap: '5px', // Adjusts gap automatically
          justifyContent: 'center' 
        }}>
          
          <SammBar 
            leftLabel="Unhappy" 
            rightLabel="Happy" 
            bgImage={h1} 
            selectedValue={responses.valence}
            onSelect={(val) => setResponses({ ...responses, valence: val })}
            borderColor={currentBorderColor}
            borderTransition={currentTransition}
          />

          <SammBar 
            leftLabel="Calm" 
            rightLabel="Excited" 
            bgImage={e1}
            selectedValue={responses.arousal}
            onSelect={(val) => setResponses({ ...responses, arousal: val })}
            borderColor={currentBorderColor}
            borderTransition={currentTransition}
          />

          <SammBar 
            leftLabel="In Control" 
            rightLabel="Controlled" 
            bgImage={c1} 
            selectedValue={responses.dominance}
            onSelect={(val) => setResponses({ ...responses, dominance: val })}
            borderColor={currentBorderColor}
            borderTransition={currentTransition}
          />
          
        </div>
      </div>
    </div>
  );
}