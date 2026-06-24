import axios from 'axios';
import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import signature from '../images/Signature.png';  


type ConsentFlowProps = {
  onComplete: () => void;
};

export default function ConsentFlow({ onComplete }: ConsentFlowProps) {

  const [currentStep, setCurrentStep] = useState(1);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // --- PAGE 1 STATE (Informed Consent Form) ---
  // const [p1VideoConsent, setP1VideoConsent] = useState<string | null>(null);
  const [p1ParticipantName, setP1ParticipantName] = useState('');
  const [p1ParticipantSign, setP1ParticipantSign] = useState('');
  // const [date, setDate] = useState(getTodayDate);

  // --- PAGE 2 STATE (Guardian's Consent Form) ---
  const [p2ChildName, setP2ChildName] = useState('');
  const [p2AudioConsent, setP2AudioConsent] = useState<string | null>(null);
  const [p2VideoConsent, setP2VideoConsent] = useState<string | null>(null);
  const [p2InterviewConsent, setP2InterviewConsent] = useState<string | null>(null);
  const [p2GuardianSignature, setP2GuardianSignature] = useState('');
  // const [p2Date, setP2Date] = useState(getTodayDate);

  // --- PAGE 3 STATE (Child/Student Assent Form) ---
  const [p3ChildName, setP3ChildName] = useState('');
  const [p3GuardianName, setP3GuardianName] = useState('');
  const [p3ChildSignature, setP3ChildSignature] = useState('');
  const [p3GuardianSignature, setP3GuardianSignature] = useState('');
  // const [p3Date, setP3Date] = useState(getTodayDate);

  const sessionId = useSessionStore((state) => state.sessionId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation Engine
  const isStep1Valid = hasAcknowledged && p1ParticipantName.trim() !== ''; // && p1Date !== '';
  const isStep2Valid = hasAcknowledged && p2ChildName.trim() !== '' && p2AudioConsent !== null && p2VideoConsent !== null && p2InterviewConsent !== null && p2GuardianSignature.trim() !== ''; // && p2Date !== '';
  const isStep3Valid = hasAcknowledged && p3ChildSignature.trim() !== '' && p3GuardianSignature.trim() !== ''; // && p3Date !== '';

  const isCurrentStepValid = currentStep === 1 ? isStep1Valid : currentStep === 2 ? isStep2Valid : isStep3Valid;

  // Helper function to get today's date as YYYY-MM-DD
  
  // Get today's date formatted nicely for your region
  const today_date = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setHasAcknowledged(false); 
      window.scrollTo(0, 0);
    } else {
      setIsSubmitting(true);
      
      try {
        const payload = {
          session_id: sessionId,
          page_1: { participant_name: p1ParticipantName, date: today_date },
          page_2: { child_name: p2ChildName, audio_consent: p2AudioConsent, video_consent: p2VideoConsent, interview_consent: p2InterviewConsent, guardian_signature: p2GuardianSignature, date: today_date },
          page_3: { child_name_optional: p3ChildName || null, guardian_name_optional: p3GuardianName || null, child_signature: p3ChildSignature, guardian_signature: p3GuardianSignature, date: today_date }
        };

        await axios.post(`${import.meta.env.VITE_API_URL}/consent-forms`, payload);
        onComplete(); 

      } catch (error) {
        console.error("Failed to save consent form data:", error);
        alert("Failed to save your consent form. Please check your connection and try again.");
        setIsSubmitting(false); 
      }
    }
  };

  // Helper component for Yes/No Questions
  const YesNoQuestion = ({ label, name, value, onChange }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '2px solid #111827', borderRadius: '6px', backgroundColor: '#ffffff' }}>
      <span style={{ fontWeight: '500' }}>{label}</span>
      <div style={{ display: 'flex', gap: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" name={name} value="yes" checked={value === 'yes'} onChange={(e) => onChange(e.target.value)} style={{ width: '18px', height: '18px' }} /> Yes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="radio" name={name} value="no" checked={value === 'no'} onChange={(e) => onChange(e.target.value)} style={{ width: '18px', height: '18px' }} /> No
        </label>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '1.1rem', lineHeight: '1.6', textAlign: 'left'}}>
            <h1 style={{ margin: 0, fontSize: '2rem', borderBottom: '3px solid #111827', paddingBottom: '10px', textAlign: 'center'  }}>Informed Consent Form</h1>
            <p style={{margin: '1px 0 1px 0'}}>
              You are invited to participate in a study titled "Investigating the Affect, Cognition and Metacognition among K-12 students working in a computer-based learning environment".
            </p>
            {/* <div style={{ display: 'flex', gap: '20px', fontSize: '2rem', color: '#4b5563' }}> */}
              <p style={{margin: '1px 0 1px 0' }}><strong>PI Name:</strong> Prof. Ramkumar Rajendran</p>
              <p style={{margin: '1px 0 1px 0'}}><strong>Organization:</strong> IIT Bombay</p>
              <p style={{margin: '1px 0 1px 0'}}><strong>Doc No:</strong> IRB-2025-094_RR_ET</p>
            {/* </div> */}

            <h3 style={{margin: '1px 0 1px 0'}}>Part I: Information sheet</h3>
            {/* Scrollable Information Sheet */}
            <div style={{ backgroundColor: '#f9fafb', padding: '20px', border: '3px solid #111827', borderRadius: '8px', maxHeight: '350px', overflowY: 'auto' }}>
              <p><strong>1)</strong> You are invited to allow your child to participate in a research study conducted by researchers from the <strong> Centre for Educational Technology, IIT Bombay </strong>. The research team studies how students think, feel, and learn while working on classroom learning activities. Your child's participation is completely voluntary.</p>
              <p><strong>2)</strong> The purpose of the research study is to better understand how school students learn foundational Artificial Intelligence (AI) ideas, and how their thinking processes, attention, and emotions change while solving learning tasks.</p> 
              <p style={{margin: '1px 0 1px 0'}}> This research aims to:</p>
              <ul style={{margin: '1px 0 1px 0'}} >
                <li>Improve the design of future classroom learning activities</li>
                <li>Help teachers better support student learning</li>
                <li>Contribute to educational research that benefits schools and learners</li>
              </ul>
              <p><strong>3)</strong> Your child has been invited because they are a school student participating in a regular classroom learning activity related to basic AI concepts. The study does not select students based on academic performance, ability level, or personal characteristics.</p>
              <p><strong>4) Details of the study protocol being undertaken:</strong></p>
              <ul>
                <li>One session only 
                  <p style={{margin: '1px 0 10px 0'}}> (Duration: approx. 60-90 minutes, including setup and breaks)</p></li>
                <li style={{margin: '1px 0 3px 0'}}>General Information Collected: Age, Grade level, Gender (optional). 
                  <p style={{margin: '1px 0 2px 0'}}> No information about income, address, or family background will be collected. </p> </li>
                <li style={{margin: '1px 0 3px 0'}}>No physical measurements such as height or weight will be taken.</li>
                <li style={{margin: '1px 0 3px 0'}}>During the learning activity, the following data may be collected: 
                  <ul>
                    <li>Questionnaires can be collected before, during and after the activity</li>
                    <li style={{margin: '0 0 0 0'}}>Webcam will be used to sense affective & physiological state.
                      <p style={{margin: '1px 0 1px 0'}}> No video or image will be stored</p>
                    </li>
                  </ul>
                </li>
              </ul>
              
              {/* Internal Checkbox for Video Recording from the Doc */}
              
              <ul>
                <li style={{margin: '1px 0 3px 0'}}>Sample qualitative questions that may be asked:
                  <ul>
                    <li>“How did you decide which option was more similar?”</li>
                    <li>“What part of the activity was confusing or easy?”</li>
                    <li>Short rating-scale questions such as “I felt confident while doing this activity”</li>
                  </ul>
                  {/* <p style={{margin: '1px 0 3px 0'}}>All devices are <strong>non-invasive, safe, and commonly used</strong> in educational research.</p> */}
                </li>
                <li style={{margin: '1px 0 3px 0'}}>Your child may skip any question or stop participation at any time without giving a reason. </li>
              </ul>
              <p style={{margin: '1px 0 1px 0'}}><strong>5)</strong> To <strong>minimize</strong> discomfort:</p>
                  <ul>
                    <li>The activity is conducted in a familiar classroom setting</li>
                    <li>Breaks are allowed</li>
                    <li>Data collection will stop immediately if your child appears uncomfortable</li>
                 </ul>
              <p><strong>6) Voluntary Participation:</strong> Your participation is completely voluntary and you are free to discontinue at any point. There will be no consequences to your discontinuing the study.</p>
                <ul>
                    <li>Your child’s data will be anonymized using a unique study ID</li>
                    <li>Names and identifying information will not appear in any reports</li>
                    <li>Data will be stored on password-protected and encrypted systems</li>
                    <li>Only the PI and authorized research team members will have access</li>
                 </ul>
                 <p style={{margin: '1px 0 3px 0'}}> The results of this study may be published in academic journals or presented at conferences. Only aggregated or de-identified data will be shared. No individual student will be identifiable.</p>
              
              <p style={{margin: '10px 0 1px 0'}}>In case of any queries related to this study, please contact the Principal Investigator at:  </p>
              <p style={{margin: '0.1px 0 0.1px 0'}}>Prof. Ramkumar Rajendran</p>
              <p style={{margin: '0.1px 0 0.1px 0'}}>Phone: 8939383123</p>
              <p style={{margin: '0.1px 0 10px 0'}}>Email: ramkumar.rajendran@iitb.ac.in</p>
              <p>This proposal has been reviewed and approved by the IIT Bombay Institute Review Board (IRB), which is a committee whose task it is to ensure that research is conducted ethically. If you have any questions at a later date you may write to irb@ircc.iitb.ac.in.</p>
            </div>

            {/* Part II: Certificate of Consent */}
            <h3 style={{margin: '1px 0 1px 0'}}>PART II: Certificate of Consent</h3>
            <p style={{ margin: '1px 0 1px 0', fontSize: '0.95rem' }}>I have read the foregoing information, or it has been read to me. I have had the opportunity to ask questions about it and any questions that I have asked have been answered to my satisfaction. I consent voluntarily to participate as a participant in this research.</p>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Print Name of Participant" value={p1ParticipantName} onChange={(e) => setP1ParticipantName(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
              
            </div>
             <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Signature of Participant" value={p1ParticipantSign} onChange={(e) => setP1ParticipantSign(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
              <p style={{ padding: '10px'}}> Date: <strong>{today_date}</strong></p> 
            </div>
            
            {/* Part III: Statement by the Researcher */}
            <h3 style={{margin: '1px 0 1px 0'}}>PART III: Statement by the Researcher</h3>
            <p style={{ margin: '1px 0 1px 0', fontSize: '0.95rem' }}>I have accurately read out the information sheet to the potential participant, and to the best of my ability made sure that the participant understands the requirements of the study as outlined in the Information Sheet.</p>
            <p style={{ margin: '1px 0 1px 0', fontSize: '0.95rem' }}>I confirm that the participant was given an opportunity to ask questions about the study, and all the questions asked by the participant have been answered correctly and to the best of my ability. I confirm that the individual has not been coerced into giving consent, and the consent has been given freely and voluntarily.</p>
            
            <div style={{ display: 'flex', gap: '19px' }}>
              <p> <strong>Name of the Researcher: </strong> Aditya Rajmane</p>
              <p> <strong>Signature: </strong></p>
              <img 
                src={signature} 
                alt="Researcher Signature" 
                style={{ 
                  height: '60px', // Matches the height of the old box
                  width: 'auto',  // Keeps the logo's original proportions
                  objectFit: 'contain' 
                }} 
              />
              <p style={{ padding: '10px'}}> Date: <strong>{today_date}</strong></p> 
              {/* <p style={{ padding: '10px', border: '2px solid #111827', borderRadius: '4px' }}> Date: <strong>{today_date}</strong></p>  */}
            </div>
             
          </div>
        );
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '1.1rem', lineHeight: '1.6', textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', borderBottom: '3px solid #111827', paddingBottom: '10px', textAlign: 'center'  }}>GUARDIAN’S CONSENT FORM</h1>
            
            <p style={{ lineHeight: '2' }}>
              Your child 
              <input 
                type="text" 
                value={p2ChildName}
                onChange={(e) => setP2ChildName(e.target.value)}
                placeholder="[Child's Name]" 
                style={{ margin: '0 10px', padding: '4px 8px', border: '2px solid #111827', borderRadius: '4px', fontSize: '1rem', width: '200px' }}
              />
              is invited to participate in a research study conducted by Centre for Educational Technology, IIT Bombay. In this study we will study how school students think, feel, and pay attention while working on a classroom learning activity related to basic Artificial Intelligence (AI) concepts, with the goal of improving future teaching and learning practices.
            </p>

            <p style={{margin: '1px 0 1px 0'}}>
              Your child was selected as a possible participant in this study because they are a school student participating in a regular classroom learning activity. Your child will work on a structured learning task, may be observed by researchers and may complete short questionnaires before, during and after the learning activity. Your child's work during the study may be observed, recorded, or copied for research purposes.
            </p>
            
            <p style={{margin: '1px 0 1px 0'}}>
              This study will happen at the Mumbai, India. The study duration is one session of approximately 60-90 minutes, to be conducted between January 2026 and December 2029.
            </p>

            <p style={{margin: '1px 0 1px 0'}}>
              Your child's participation is voluntary. If you decide to allow your child to participate, you and/or your child are free to withdraw your consent and discontinue participation at any time before or during the study without penalty. We will anonymize the data collected from your child (e.g., blur the face from video recordings, remove references to child’s name, etc.). Any information obtained in connection with this study that can be identified with your child will remain confidential and will be disclosed only with your permission.
            </p>

            <p style={{margin: '1px 0 1px 0', color: '#000000' }}>
              If you have any questions about the study, please feel free to contact Prof. Ramkumar Rajendran, Centre for Educational Technology, IIT Bombay. Phone: 8939383123, Email: ramkumar.rajendran@iitb.ac.in.
            </p>

            {/* Interactive Permissions Box */}
            <div style={{ backgroundColor: '#eff6ff', padding: '20px', border: '3px solid #3b82f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <YesNoQuestion label="I give permission for recording my child’s audio during the study" name="p2audio" value={p2AudioConsent} onChange={setP2AudioConsent} />
              <YesNoQuestion label="I give permission for recording my child’s video during the study" name="p2video" value={p2VideoConsent} onChange={setP2VideoConsent} />
              <YesNoQuestion label="I give permission for my child to be interviewed by researchers" name="p2interview" value={p2InterviewConsent} onChange={setP2InterviewConsent} />
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px' }}>
              <input type="text" placeholder="Guardian's Signature (NAME IN CAPITALS)" value={p2GuardianSignature} onChange={(e) => setP2GuardianSignature(e.target.value)} style={{ flex: 1, minWidth: '250px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
              <p style={{ padding: '10px'}}> Date: <strong>{today_date}</strong></p> 
            </div>
            
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '1.1rem', lineHeight: '1.6', textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', borderBottom: '3px solid #111827', paddingBottom: '10px', textAlign: 'center'  }}>Student Assent Form</h1>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '20px', border: '3px solid #111827', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0 }}><strong>I am willing to take part in the study called Investigating the Affect, Cognition and Metacognition among K-12 Students Working in a Computer-Based Learning Environment.</strong></p>
              
              <p style={{ margin: 0 }}>I understand that the researchers from Centre for Educational Technology, IIT Bombay are hoping to learn from me how students think, feel, and pay attention while learning new ideas related to Artificial Intelligence (AI).</p>
              
              <ul style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>I understand that I will get to work on a learning activity and answer a few questions while learning.</li>
                <li>I also understand that I might be observed, during the study.</li>
                <li>I understand that my name and any other information in the collected data that can be used to identify me, will be removed by the researchers.</li>
              </ul>

              <p style={{ margin: 0, color: '#1e3a8a', fontWeight: 'bold' }}>
                I am taking part because I want to. I have been told that I can stop at any time, and if I do not like a question, I do not have to answer it. There are no negative consequences to discontinuing participation at any time.
              </p>

              <p style={{ margin: 0, fontSize: '0.95rem' }}>You may ask for a break or stop at any time, during the study. These data will remain completely confidential and will be used only for research purposes.</p>

              <p style={{ margin: 0, fontSize: '0.95rem' }}>If you have any questions about the study, please feel free to contact Prof. Ramkumar Rajendran, Centre for Educational Technology, IIT Bombay. Phone: 8939383123, Email: ramkumar.rajendran@iitb.ac.in</p>
            </div>

            {/* Inputs & Signatures */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Name (OPTIONAL)" value={p3ChildName} onChange={(e) => setP3ChildName(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
                <input type="text" placeholder="Guardian Name (OPTIONAL)" value={p3GuardianName} onChange={(e) => setP3GuardianName(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Signature or Initials" value={p3ChildSignature} onChange={(e) => setP3ChildSignature(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
                <input type="text" placeholder="Signature or Initials (Guardian)" value={p3GuardianSignature} onChange={(e) => setP3GuardianSignature(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '2px solid #111827', borderRadius: '4px' }} />
                <p style={{ padding: '10px'}}> Date: <strong>{today_date}</strong></p> 
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const formFilledBy = () => {
    if(currentStep!=3) 
      return ("To be filled by the Parent/Gaurdian");
    else  
      return ("To be filled by the Student");
  };
  return (
    <div style={{ minHeight: '100vh', width: '80%', margin: "0 auto", backgroundColor: '#f3f4f6', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px', border: '5px solid #111827', boxShadow: '12px 12px 0px #111827', borderRadius: '12px', width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* --- HEADER --- */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '4px solid #111827', paddingBottom: '20px',justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#111827a5', textAlign: 'left' }}>
            {formFilledBy()}
          </h2>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#111827a5', textAlign: 'right' }}>
            Onboarding Step {currentStep} of 3
          </h2>          
        </div>

        {/* --- DYNAMIC CONTENT --- */}
        {renderStepContent()}

        <hr style={{ borderTop: '4px solid #111827', margin: '10px 0' }} />

        {/* --- CONSENT CHECKBOX & NEXT BUTTON --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', backgroundColor: '#f9fafb', padding: '16px', border: '2px solid #111827', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              style={{ width: '24px', height: '24px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '1.1rem', color: '#111827' }}>
              {currentStep === 1 && "I have read and acknowledge the Information Sheet provided on this page."}
              {currentStep === 2 && "Your signature indicates that you have read and understand the information provided above, that you willingly agree to allow your child to participate, that you and/or your child may withdraw your consent at any time and discontinue participation without penalty, that you will receive a copy of this form, and that you are not waiving any legal claims."}
              {currentStep === 3 && "I have read this form, understand what I will do, and agree to participate in the study."}
            </span>
          </label>

          <button
            onClick={handleNext}
            disabled={!isCurrentStepValid || isSubmitting}
            style={{
              padding: '16px',
              backgroundColor: isCurrentStepValid && !isSubmitting ? '#3b82f6' : '#9ca3af',
              color: '#ffffff',
              border: '4px solid #111827',
              borderRadius: '8px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: isCurrentStepValid && !isSubmitting ? 'pointer' : 'not-allowed',
              boxShadow: isCurrentStepValid && !isSubmitting ? '4px 4px 0px #111827' : 'none',
              transition: 'all 0.1s ease',
              transform: isCurrentStepValid && !isSubmitting ? 'none' : 'translate(4px, 4px)',
            }}
          >
            {isSubmitting 
              ? 'Saving...' 
              : (currentStep < 3 ? 'Acknowledge & Continue' : 'Accept & Enter ML-Tutor')}
          </button>
        </div>

      </div>
    </div>
  );
}