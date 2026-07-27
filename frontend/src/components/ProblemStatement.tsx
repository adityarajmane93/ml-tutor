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
            Your Role: Class Teacher
          </p>
        </div>

        {/* The Story */}
        <div style={{ backgroundColor: '#f8fef2', border: '3px solid var(--text)', borderRadius: '8px', padding: '24px', boxShadow: '4px 4px 0px var(--text)' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            The Crisis
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0, textAlign: 'left' }}>
  Your class has over 200 students, and final examinations are just around the corner. Unfortunately, it is impossible to personally monitor every student's progress and identify who might be struggling.
  <br /><br />
  Your task is to build a Machine Learning model that can predict whether a student is likely to <strong>Pass</strong> or <strong>Fail</strong>. This will help you identify at-risk students early and provide them with the support they need before the final examination.
</p>
        </div>

        {/* The Dataset Introduction */}
        <div style={{ backgroundColor: '#eff6ff', border: '3px solid #3b82f6', borderRadius: '8px', padding: '24px', boxShadow: '4px 4px 0px #3b82f6' }}>
          <h2 style={{ marginTop: 0, color: '#1d4ed8', display: 'flex', alignItems: 'left', gap: '10px' }}>
            The "student_data" Dataset
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '16px', textAlign: 'left' }}>
  You have access to records from students in previous years. Your AI model will learn from the following <strong>Features</strong>:
</p>
          
          <ul
  style={{
    fontSize: '1.1rem',
    lineHeight: '1.6',
    margin: 0,
    paddingLeft: '24px',
    color: '#1e3a8a',
    textAlign: 'left'
  }}
>
  <li><strong>Attendance:</strong> Percentage of classes attended.</li>
  <li><strong>Midsem Score:</strong> Marks obtained in the mid-semester examination.</li>
  <li><strong>Class Participation:</strong> Level of participation during lectures.</li>
  <li><strong>Assignment Scores</strong> Overall performance in assignments.</li>
  <li><strong>Result</strong> Indicates whether the student passed or failed the course.</li>
</ul>

          <div
  style={{
    marginTop: '20px',
    backgroundColor: '#dbeafe',
    padding: '16px',
    borderRadius: '6px',
    borderLeft: '4px solid #2563eb'
  }}
>
  <strong>⚠️ Data Warning:</strong> Some student records are incomplete because attendance, assignment scores, or participation were not recorded. Use a <strong>Preprocessing Node</strong> to clean the missing values before training your Machine Learning model.
</div>
          {/* DATASET DOWNLOAD BUTTON */}
          <div style={{ marginTop: '24px' }}>
            <a 
              href="/student_data.csv"
              download="student_data.csv"
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