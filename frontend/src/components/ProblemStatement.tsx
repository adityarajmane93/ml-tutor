import { useNavigate } from 'react-router-dom';

export default function ProblemStatement({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();

  const handleFinish = () => {
    onComplete(); 
    navigate('/'); 
  };

  return (
    <div style={{ minHeight: "100vh", padding: "15px 20px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      
      {/* Main Neobrutalist Wrapper */}
      <div className="neo-card" style={{ maxWidth: '850px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '4px solid var(--text)', paddingBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '-1px' }}>
            Mission Briefing
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '1.2rem', fontWeight: 'bold', color: '#4b5563' }}>
            Your Role: Chief Data Scientist @ City Central Hospital
          </p>
        </div>

        {/* The Story */}
        <div style={{ backgroundColor: '#f8fef2', border: '3px solid var(--text)', borderRadius: '8px', padding: '24px', boxShadow: '4px 4px 0px var(--text)' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            The Crisis
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0,textAlign: 'left' }}>
            City Central Hospital is overflowing with patients. The doctors are overwhelmed and cannot examine everyone immediately. They need an Artificial Intelligence assistant that can act as a triage nurse. 
            <br/><br/>
            Your job is to build a Machine Learning pipeline that can instantly predict a patient's <strong>Severity Condition</strong> the moment they walk through the door, so doctors know who needs urgent care first!
          </p>
        </div>

        {/* The Dataset Introduction */}
        <div style={{ backgroundColor: '#eff6ff', border: '3px solid #3b82f6', borderRadius: '8px', padding: '24px', boxShadow: '4px 4px 0px #3b82f6' }}>
          <h2 style={{ marginTop: 0, color: '#1d4ed8', display: 'flex', alignItems: 'left', gap: '10px' }}>
            The "health_data" Dataset
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '16px',textAlign: 'left' }}>
            To teach your AI, the nurses have provided you with a historical dataset of past patients. The machine will learn by looking at these <strong>Features</strong> (clues):
          </p>
          
          <ul style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0, paddingLeft: '24px', color: '#1e3a8a',textAlign: 'left' }}>
            <li><strong>Temperature:</strong> Patient's body heat.</li>
            <li><strong>Heart Rate:</strong> Beats per minute.</li>
            <li><strong>Fatigue Score:</strong> How tired they feel on a scale of 1 to 5.</li>
          </ul>

          <div style={{ marginTop: '20px', backgroundColor: '#dbeafe', padding: '16px', borderRadius: '6px', borderLeft: '4px solid #2563eb' }}>
            <strong>⚠️ Data Warning:</strong> The nurses were rushed, and sometimes they forgot to ask the patients for their Fatigue Score or record their Temperature, Heart_Beat!. You will need to use a <strong>Preprocessing Node</strong> to fix this messy data before the AI can learn from it!
          </div>
          {/* DATASET DOWNLOAD BUTTON */}
          <div style={{ marginTop: '24px' }}>
            <a 
              href="../health_data.csv" 
              download="health_data.csv"
              className="neo-btn"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '10px', 
                textDecoration: 'none', 
                backgroundColor: '#ffffff', 
                color: '#1d4ed8',
                borderColor: '#1d4ed8',
                boxShadow: '4px 4px 0px #1d4ed8'
              }}
            >
              Download Datatset
            </a>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#3b82f6', fontStyle: 'italic' }}>
              * Download this file so you can upload it to your Dataset Node!
            </p>
          </div>
        </div>

        {/* The Target */}
        <div style={{ backgroundColor: '#fef2f2', border: '3px solid #ef4444', borderRadius: '8px', padding: '24px', boxShadow: '4px 4px 0px #ef4444' }}>
          <h2 style={{ marginTop: 0, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Your Objective
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0, color: '#991b1b',textAlign: 'left' }}>
            Connect the blocks, clean the missing values, and experiment with different algorithms (like KNN, Logistic Regression or Decision Trees) to predict the <strong>Condition</strong> (0 = Mild, 1 = Medium, 2 = Serious). Can you build a pipeline with over 85% accuracy?
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <button
            className="neo-btn"
            onClick={handleFinish}
            style={{
              padding: '16px 40px',
              backgroundColor: 'var(--success)',
              color: '#ffffff',
              fontSize: '1.4rem',
              width: '100%',
              maxWidth: '400px',
              textTransform: 'uppercase'
            }}
          >
            Accept Mission
          </button>
        </div>

      </div>
    </div>
  );
}