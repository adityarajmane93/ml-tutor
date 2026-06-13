import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { logEvent } from '../services/logger';
import { useSessionStore } from '../store/sessionStore';

// Interface with Phase 3 Indices
export interface SavedNote {
  id: number;
  node_type?: string;
  highlighted_text?: string;
  custom_note?: string;
  start_index?: number;
  end_index?: number;
  timestamp: string;
}

type HighlightableTextProps = {
  text: string;
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

// --- PHASE - ENGINE: Exact Index Slicing ---
const HighlightableText = ({
  text,
  notesList,
  activeReferencedNote,
}: HighlightableTextProps) => {
  const validNotes = notesList
    .filter((n) => n.start_index != null && n.end_index != null && n.highlighted_text)
    .sort((a, b) => a.start_index! - b.start_index!);

  if (validNotes.length === 0) return <span className="highlight-block">{text}</span>;

  const chunks: Array<
    | { isHighlight: true; text: string; id: string }
    | { isHighlight: false; text: string; id: string }
  > = [];

  let currentIndex = 0;

  validNotes.forEach((note) => {
    if (note.start_index! < currentIndex) return;

    if (note.start_index! > currentIndex) {
      chunks.push({
        isHighlight: false,
        text: text.substring(currentIndex, note.start_index!),
        id: `text-${currentIndex}-${note.start_index!}`,
      });
    }

    chunks.push({
      isHighlight: true,
      text: text.substring(note.start_index!, note.end_index!),
      id: String(note.id),
    });

    currentIndex = note.end_index!;
  });

  if (currentIndex < text.length) {
    chunks.push({
      isHighlight: false,
      text: text.substring(currentIndex),
      id: `text-end-${currentIndex}`,
    });
  }

  return (
    <span className="highlight-block">
      {chunks.map((chunk) =>
        chunk.isHighlight ? (
          <mark
            key={chunk.id}
            id={`highlight-${chunk.id}`}
            style={{
              backgroundColor:
                activeReferencedNote === Number(chunk.id) ? '#fb923c' : '#fef08a',
              padding: '2px 4px',
              borderRadius: '4px',
              color: '#111827',
              boxShadow: '1px 1px 0px #111827',
              transition: 'all 0.3s ease',
              transform:
                activeReferencedNote === Number(chunk.id) ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {chunk.text}
          </mark>
        ) : (
          <span key={chunk.id}>{chunk.text}</span>
        )
      )}
    </span>
  );
};

// --- CONTENT COMPONENTS ---
type ContentProps = {
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

const DatasetContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Dataset Node</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6', textAlign: 'justify' }}>
      <HighlightableText
        text="As we move ahead in the AI Project Cycle, we come across the second element which is: Data Acquisition. As the term clearly mentions, this stage is about acquiring data for the project. Let us first understand what is data. Data can be a piece of information or facts and statistics collected together for reference or analysis. Whenever we want an AI project to be able to predict an output, we need to train it first using data. For example, If you want to make an Artificially Intelligent system which can predict the salary of any employee based on his previous salaries, you would feed the data of his previous salaries into the machine. This is the data with which the machine can be trained. Now, once it is ready, it will predict his next salary efficiently. The previous salary data here is known as Training Data while the next salary prediction data set is known as the Testing Data. For better efficiency of an AI project, the Training data needs to be relevant and authentic. In the previous example, if the training data was not of the previous salaries but of his expenses, the machine would not have predicted his next salary correctly since the whole training went wrong. Similarly, if the previous salary data was not authentic, that is, it was not correct, then too the prediction could have gone wrong. Hence…. For any AI project to be efficient, the training data should be authentic and relevant to the problem statement scoped. Look at your problem statement once again and try to find the data features required to address this issue. Data features refer to the type of data you want to collect. In our previous example, data features would be salary amount, increment percentage, increment period, bonus, etc."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const PreprocessingContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Preprocessing Node</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="This block represents the raw data being pre-processed before entering your machine learning model. Use it to select which preprocessing Technique (like Filling Null Values or Removing Duplicates) you want the data to go through."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const ModelContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Model Node</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="This block is the actual 'Brain' of the pipeline. This actually learns patterns from the Data. Use it to select which ML model/algorithm (like KNN, Decision Trees, Logistic Regression) you want to use."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const EvaluationContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Evaluation Node</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="This block represents the output stage. Use it to know how well the model has learned from the data."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const EdgeContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Pipeline Connection</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="Edges represent the flow of information. The output data from the previous block travels along this line to become the input for the next block."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const PipelineContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Pipeline Info</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="The Data from the 'Dataset' node, optionally through 'Preprocessing' Node to the 'Model' node & finally the 'Evaluation' node."
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

const DefaultContent = ({ notesList, activeReferencedNote }: ContentProps) => (
  <div>
    <h2 style={{ marginTop: 0, fontSize: '2rem' }}>General Info</h2>
    <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>
      <HighlightableText
        text="This is a component of the machine learning pipeline. Select a specific node or connection to learn exactly how it works!"
        notesList={notesList}
        activeReferencedNote={activeReferencedNote}
      />
    </p>
  </div>
);

// Navigation Configuration Mapping
const TAB_CONFIG = [
  { id: 'allNotes', color: '#6f5c5c', title: 'All Notes' }, // White by default
  { id: 'datasetNode', color: 'var(--secondary)', title: 'Dataset'}, // Blue
  { id: 'preprocessingNode', color: 'var(--warning)', title: 'Preprocessing' }, // Orange
  { id: 'modelNode', color: 'var(--danger)', title: 'Model' }, // Red
  { id: 'evaluationNode', color: 'var(--success)', title: 'Evaluation' }, // Green
  { id: 'edge', color: 'var(--flow)', title: 'Edges' }, // Purple
  { id: 'runPipeline', color: 'var(--primary)', title: 'Pipeline' }, // Yellow
];

// The New "All Notes" Dedicated View
type AllNotesViewProps = {
  notesList: SavedNote[];
  onReference: (note: SavedNote) => void;
  onDelete: (e: React.MouseEvent, noteId: number, nodeType?: string) => void;
};

const AllNotesView = ({ notesList, onReference, onDelete }: AllNotesViewProps) => {
  if (notesList.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6b7280' }}>
        <h2>No notes saved yet. Start exploring nodes to build your Notes!</h2>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
      <h2 style={{ marginTop: 0, fontSize: '2rem', borderBottom: '2px solid #111827', paddingBottom: '12px' }}>
         All Notes
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {notesList.map((note) => {
          const config = TAB_CONFIG.find((t) => t.id === note.node_type) || TAB_CONFIG[0];

          return (
            <div
              key={note.id}
              onClick={() => {
                onReference(note);
              }}
              style={{
                padding: '16px',
                border: `3px solid ${config.color}`,
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                boxShadow: `4px 4px 0px ${config.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'left',
                cursor: note.highlighted_text ? 'pointer' : 'default', // Dynamic cursor
                color: 'inherit',
              }}
            >
              {/* Header with Title and Delete Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', color: config.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {config.title}  {/*{config.icon} */}
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => onDelete(e, note.id, note.node_type)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.2rem', padding: 0 }}
                  title="Delete Note"
                >
                  🗑
                </button>
              </div>

              {note.highlighted_text && (
                <div style={{ backgroundColor: '#fef08a', padding: '8px', borderRadius: '4px', color: '#111827', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  "{note.highlighted_text}"
                </div>
              )}

              {note.custom_note && (
                <div style={{ color: '#111827', wordBreak: 'break-word' }}>{note.custom_note}</div>
              )}

              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 'auto', textAlign: 'right' }}>
                {new Date(Number(note.timestamp) * 1000).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- THE MAIN MODAL COMPONENT ---
export default function LearnModal({
  selectedType,
  onClose,
}: {
  selectedType: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState(selectedType || 'allNotes');
  const [highlightData, setHighlightData] = useState<{ text: string; start: number; end: number } | null>(null);
  const [typedNote, setTypedNote] = useState('');
  const [notesList, setNotesList] = useState<SavedNote[]>([]);
  const [activeReferencedNote, setActiveReferencedNote] = useState<number | null>(null);

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const logAbandonedHighlight = async (highlightToLog: {text: string, start: number, end: number}) => {
    try {
      await logEvent('INTERACTION', 'HIGHLIGHT_ABANDONED', {
        node_type: activeTabRef.current,
        highlighted_text: highlightToLog.text,
        start_index: highlightToLog.start,
        end_index: highlightToLog.end
      });
    } catch (error) {
      console.error("Failed to log abandoned highlight:", error);
    }
  };

  // We use a ref to safely track the highlight state inside global event listeners
  const highlightDataRef = useRef(highlightData);
  useEffect(() => {
    highlightDataRef.current = highlightData;
  }, [highlightData]);

  const handleClearHighlight = () => {
    if (highlightDataRef.current) {
      logAbandonedHighlight(highlightDataRef.current);
    }
    setHighlightData(null);
    
    // This single line forcefully removes the browser's blue text selection!
    window.getSelection()?.removeAllRanges(); 
  };

  // Clean wrapper for the close buttons
  const handleModalClose = () => {
    handleClearHighlight();
    onClose();
  };

  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Global click listener for abandoned highlights
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const target = e.target as Element;

      // 1. Ignore the sidebar buttons
      if (target.closest('.sidebar-button')) return;
      
      // 2. Ignore the middle pane because handleTextSelection takes care of it!
      if (target.closest('#middle-reading-pane')) return;

      // 3. Smart Right Pane Check
      if (rightPaneRef.current?.contains(target)) {
        // Protect the highlight ONLY if they are clicking the text box to type, or a button to save/close
        if (target.tagName.toLowerCase() === 'textarea' || target.closest('button')) {
          return;
        }
        // If they just clicked empty space in the right pane, let the code continue so it clears and logs!
      }

      const selection = window.getSelection();
      const isSelectionEmpty = !selection || selection.isCollapsed || selection.toString().trim() === '';

      if (isSelectionEmpty && highlightDataRef.current) {
        handleClearHighlight();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Handle Deleting Notes from the UI and Logging
  const handleDeleteNote = async (e: React.MouseEvent, noteId: number, nodeType?: string) => {
    e.stopPropagation(); // Prevents the click from triggering the parent card's onReference
    
    // Remove from local React state
    setNotesList((prev) => prev.filter((n) => n.id !== noteId));
    
    // Log the deletion to the backend
    try {
      await logEvent('INTERACTION', 'NOTE_DELETED_IN_DB', { 
        note_id: noteId, 
        node_type: nodeType || activeTab 
      });
      // ACTUALLY delete it from the database
      await axios.delete(`${import.meta.env.VITE_API_URL}/notes/${noteId}`);
    } catch (error) {
      console.error('Failed to log deletion:', error);
    }
  };

  const sessionId = useSessionStore((state) => state.sessionId);

  const renderContent = () => {
    switch (activeTab) {
      case 'datasetNode':
        return <DatasetContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      case 'preprocessingNode':
        return <PreprocessingContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      case 'modelNode':
        return <ModelContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      case 'evaluationNode':
        return <EvaluationContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      case 'edge':
        return <EdgeContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      case 'runPipeline':
        return <PipelineContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
      default:
        return <DefaultContent notesList={notesList} activeReferencedNote={activeReferencedNote} />;
    }
  };

  useEffect(() => {
    // 1. A flag to prevent "Race Conditions" if you click tabs very quickly
    let ignore = false; 

    const fetchNotes = async () => {
      try {
        //2. Use the environment variables instead hardcoded localhost URLs
        const baseUrl = import.meta.env.VITE_API_URL; 
        const url =
          activeTab === 'allNotes'
            ? `${baseUrl}/notes?session_id=${sessionId}`
            : `${baseUrl}/notes?session_id=${sessionId}&node_type=${activeTab}`;

        const response = await axios.get(url);
        
        // 3. Only update the screen if the user hasn't already clicked away to another tab
        if (!ignore && response.data && Array.isArray(response.data)) {
          setNotesList(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch historical notes:', error);
      }
    };

    if (sessionId) {
      //4. Instantly delete old notes from the screen the millisecond user switches tabs!
      setNotesList([]); 
      fetchNotes();
    }
    
    setHighlightData(null);

    //5. Cleanup function that runs when user leave the tab
    return () => { ignore = true; }; 
  }, [activeTab, sessionId]);

  useEffect(() => {
    if (activeTab === 'allNotes' || activeReferencedNote === null) return;

    const element = document.getElementById(`highlight-${activeReferencedNote}`);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeTab, activeReferencedNote, notesList]);

  useEffect(() => {
    if (activeReferencedNote === null) return;

    const timer = window.setTimeout(() => {
      setActiveReferencedNote(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeReferencedNote]);

  const handleNoteReference = (note: SavedNote) => {
    // 1. Only trigger the orange flash if there is actual highlighted text
    if (note.highlighted_text && note.start_index != null && note.end_index != null) {
      setActiveReferencedNote(note.id);
    } else {
      setActiveReferencedNote(null); // Ensure no old flash stays active
    }

    // 2. Always redirect to the proper tab, even if it's just a typed note
    if (note.node_type && note.node_type !== activeTab) {
      setActiveTab(note.node_type);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || selection.toString().trim() === '') {
      handleClearHighlight();
      return;
    }

    let node = selection.anchorNode;
    let container = node?.nodeType === 3 ? node.parentNode : node;
    const highlightBlock = (container as HTMLElement)?.closest('.highlight-block');

    if (!highlightBlock) {
      setHighlightData(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(highlightBlock);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const start = preSelectionRange.toString().length;
    const selectedString = range.toString();
    const end = start + selectedString.length;

    if (selectedString.trim().length > 0) {
      setHighlightData({
        text: selectedString,
        start: start,
        end: end,
      });
    }
  };

  const handleSaveNote = async () => {
    if (!highlightData && !typedNote) return;

    const currentTimestamp = Math.floor(Date.now() / 1000).toString();

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/notes`, {
        session_id: sessionId,
        node_type: activeTab,
        highlighted_text: highlightData?.text || null,
        start_index: highlightData?.start ?? null,
        end_index: highlightData?.end ?? null,
        custom_note: typedNote || null,
        timestamp: currentTimestamp,
      });

      await logEvent('INTERACTION', 'NOTE_SAVED', { 
        node_type: activeTab,
        highlighted_text: highlightData?.text || null,
        custom_note: typedNote || null
      });

      
      const newNoteLocal: SavedNote = {
        id: response.data.note_id || Date.now(),
        node_type: activeTab,
        highlighted_text: highlightData?.text || undefined,
        start_index: highlightData?.start,
        end_index: highlightData?.end,
        custom_note: typedNote || undefined,
        timestamp: currentTimestamp,
      };

      setNotesList((prev) => [newNoteLocal, ...prev]);

      setHighlightData(null);
      setTypedNote('');
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '30px',
          border: '5px solid #111827',
          boxShadow: '16px 16px 0px #111827',
          borderRadius: '12px',
          width: '95vw',
          maxWidth: '1400px',
          height: '85vh',
          display: 'flex',
          gap: '30px',
          position: 'relative',
        }}
      >
        {/* LEFT PANE: NAVIGATION SIDEBAR */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.1px',  
            width: '140px', 
            borderRight: '5px solid #111827',
            paddingRight: '20px',
            paddingTop: '10px',
            overflowY: 'auto',
          }}
        >
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                className="counter"
                key={tab.id}
                type="button"
                onClick={() => {
                  handleClearHighlight();
                  setActiveReferencedNote(null);
                  setActiveTab(tab.id);
                }}
                style={{
                  width: '100%',
                  padding: '12px 8px',
                  borderRadius: '8px',
                  backgroundColor: tab.color,
                  border: `${isActive ? "4px solid" :"3px solid"}  '#111827'`,
                  
                  color: isActive ? '#ffffff' : '#ffffff', 
                  
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: isActive ? 'none' : '3px 3px 0px #111827',
                  transition: 'all 0.1s ease',
                  transform: isActive ? 'translate(3px, 3px)' : 'none',
                }}
              >
                {tab.title} {/* Render the name instead of the icon */}
              </button>
            );
          })}
        </div>

        {/* DYNAMIC CONTENT AREA */}
        {activeTab === 'allNotes' ? (
          <AllNotesView notesList={notesList} onReference={handleNoteReference} onDelete={handleDeleteNote}/>
        ) : (
          <>
            {/* MIDDLE PANE: READING CONTENT */}
            <div
              id="middle-reading-pane"
              style={{ flex: 2, overflowY: 'auto', paddingRight: '20px' }}
              onMouseUp={handleTextSelection}
            >
              {renderContent()}
            </div>

            {/* RIGHT PANE: STUDY NOTES DASHBOARD */}
            <div
              ref={rightPaneRef}
              style={{
                flex: 1.2,
                borderLeft: '4px solid #111827',
                paddingLeft: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>Study Notes</h2>
              </div>

              <hr style={{ width: '100%', borderTop: '4px solid #111827', margin: 0 }} />
              {/* History of notes for this specific node */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingRight: '10px',
                }}
              >
                {notesList.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic', marginTop: '20px' }}>
                    No notes saved for this topic yet.
                  </p>
                ) : (
                  [...notesList].sort((a, b) => {
                    // 1. If both are highlighted notes, sort by their position in the text
                    if (a.start_index != null && b.start_index != null) {
                      return a.start_index - b.start_index;
                    }
                    // 2. If only one is highlighted, push it above purely typed notes
                    if (a.start_index != null) return -1;
                    if (b.start_index != null) return 1;
                    // 3. If both are typed notes, keep their original timestamp order
                    return 0;
                  }).map((note, idx) => (
                    <div
                      key={note.id || idx}
                      onClick={() => {
                        //Only trigger reference if text is highlighted
                        if (note.highlighted_text) {
                          if (highlightData) logAbandonedHighlight(highlightData);
                          setHighlightData(null);
                          handleNoteReference(note);
                        }
                      }}
                      style={{
                        backgroundColor: '#ffffff', 
                        padding: '12px',
                        borderRadius: '8px',
                        border: '3px solid #111827', // Solid thick black border
                        boxShadow: '4px 4px 0px #111827', // Hard shadow
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: '8px' // Need space for the shadow to show
                      }}
                    >
                      {/* Header with Timestamp and Delete Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {new Date(Number(note.timestamp) * 1000).toLocaleString()}
                        </span>
                        
                        <button
                          onClick={(e) => handleDeleteNote(e, note.id, note.node_type)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem', padding: 0, lineHeight: 1 }}
                          title="Delete Note"
                        >
                          🗑
                        </button>
                      </div>

                      {note.highlighted_text && (
                        <p style={{ margin: '0 0 8px 0', backgroundColor: '#fef08a', padding: '4px', borderRadius: '4px', fontSize: '0.9rem', color: '#111827', fontStyle: 'italic' }}>
                          "{note.highlighted_text}"
                        </p>
                      )}
                      {note.custom_note && <p style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{note.custom_note}</p>}
                    </div>
                  ))
                )}
              </div>

              <hr style={{ width: '100%', borderTop: '4px solid #111827', margin: 0 }} />

              {/* The Active Highlight Box */}
              {highlightData && (
                <div
                  style={{
                    padding: '12px',
                    border: '#3b82f6',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleClearHighlight}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    X
                  </button>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#1d4ed8', paddingRight: '15px' }}>
                    <strong>Selected:</strong> "{highlightData.text}"
                  </p>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={typedNote}
                onChange={(e) => setTypedNote(e.target.value)}
                placeholder="Add your thoughts down here..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '3px solid #111827', // Thicker
                  boxShadow: '4px 4px 0px #111827', // Hard shadow!
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!highlightData && !typedNote}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: !highlightData && !typedNote ? '#9ca3af' : '#3b82f6',
                    color: '#ffffff',
                    border: '2px solid #111827',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: !highlightData && !typedNote ? 'not-allowed' : 'pointer',
                    boxShadow: !highlightData && !typedNote ? 'none' : '2px 2px 0px #111827',
                  }}
                >
                  Save Note
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e5e7eb',
                    color: '#111827',
                    border: '2px solid #111827',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0px #111827',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}

        {/* Absolute Close Button for Top Right */}
        <button
          type="button"
          onClick={handleModalClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '30px',
            background: 'none',
            border: 'none',
            fontSize: '2rem',
            cursor: 'pointer',
            color: '#111827',
          }}
        >
          ✖
        </button>
      </div>
    </div>
  );
}