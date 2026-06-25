import React, { useState, useEffect, memo } from 'react';
import parse, { Element, domToReact, type DOMNode } from 'html-react-parser';
import { useNotesLogic } from '../flow/useNotesLogic';
import type { SavedNote } from '../flow/useNotesLogic';
import NotesPanel from './NotesPanel';

// --- SHARED TYPES ---
type HighlightableTextProps = {
  text: string;
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

// --- PHASE - THE ENGINE: Exact Index Slicing ---
const HighlightableText = ({
  text,
  notesList,
  activeReferencedNote,
}: HighlightableTextProps) => {
  const validNotes = notesList
    .filter((n) => {
      // Ensure the note has the required data
      if (n.start_index == null || n.end_index == null || !n.highlighted_text) {
        return false;
      }
      
      // Extract the text from THIS specific paragraph at the note's indices
      const chunkInThisParagraph = text.substring(n.start_index, n.end_index);
      
      // Only apply the highlight if the text perfectly matches the saved note!
      return chunkInThisParagraph === n.highlighted_text;
    })
    .sort((a, b) => (a.start_index || 0) - (b.start_index || 0));

  if (validNotes.length === 0) return <span className="highlight-block">{text}</span>;

  // chunking and mapping logic
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
            // --- THE FIX: Add this dynamic class name! ---
            className={activeReferencedNote === Number(chunk.id) ? 'active-highlight' : 'standard-highlight'}
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

// --- DYNAMIC HTML ENGINE ---
type ContentProps = {
  nodeType: string;
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

const DynamicHtmlContent = memo(({ nodeType, notesList, activeReferencedNote }: ContentProps) => {
  const [htmlString, setHtmlString] = useState<string>("<p>Loading content...</p>");
  // Fetch the HTML file matching the active tab
  useEffect(() => {
    fetch(`/content/${nodeType}.html`)
      .then((res) => {
        if (!res.ok) throw new Error("Content not found");
        return res.text();
      })
      .then((data) => setHtmlString(data))
      .catch(() => setHtmlString("<p style='color: #6b7280; font-style: italic;'>No HTML content file found for this node. Create it in public/content/</p>"));
  }, [nodeType]);

  const parseOptions = {
    replace: (domNode: DOMNode) => {
      if (domNode instanceof Element) {
        const tagName = domNode.name;

        // --- RULE 1: HEADINGS (Centered, NO Highlighting) ---
        if (['h1', 'h2'].includes(tagName)) {
          //This tells TypeScript "I promise tagName is a valid HTML tag like 'h1'"
          const Tag = tagName as React.ElementType;
          return (
            <Tag style={{ textAlign: 'center', marginTop: '0px', marginBottom: '20px' }}>
              {/* Passes the text through normally without the HighlightableText engine */}
              {domToReact(domNode.children as DOMNode[])}
            </Tag>
          );
        }

        // --- RULE 2: IMAGES (Keep original HTML styles) ---
        if (tagName === 'img') {
          // Render the image exactly as it is written and styled in the .html file!"
          return undefined; 
        }

        // --- RULE 3: TEXT & LISTS (Justified, WITH Highlighting) ---
        if (['p', 'li', 'ul','h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const rawText = domToReact(domNode.children as DOMNode[]);
          
          if (typeof rawText === 'string') {
            const Tag = tagName as React.ElementType;
            return (
              <Tag style={{ lineHeight: '1.6', marginBottom: '16px', textAlign: 'left' }}>
                <HighlightableText 
                  text={rawText} 
                  notesList={notesList} 
                  activeReferencedNote={activeReferencedNote} 
                />
              </Tag>
            );
          }
        }
      }
    }
  };

  return (
    <div className="dynamic-html-container">
      {parse(htmlString, parseOptions)}
    </div>
  );
});


// Navigation Configuration Mapping
const TAB_CONFIG = [
  { id: 'allNotes', color: '#6f5c5c', title: 'All Notes' }, 
  { id: 'datasetNode', color: 'var(--secondary)', title: 'Dataset'}, 
  { id: 'preprocessingNode', color: 'var(--warning)', title: 'Preprocessing' }, 
  { id: 'modelNode', color: 'var(--danger)', title: 'Model' }, 
  { id: 'evaluationNode', color: 'var(--success)', title: 'Evaluation' }, 
  { id: 'edge', color: 'var(--flow)', title: 'Edges' }, 
  { id: 'notesInfo', color: 'var(--primary)', title: 'Notes Info' }, 
];

// The "All Notes" Dedicated View
type AllNotesViewProps = {
  notesList: SavedNote[];
  onReference: (note: SavedNote) => void;
  onDelete: (e: React.MouseEvent, noteId: number, nodeType?: string) => void;
  logTabSwitch : (tabName: string) => void;
};

const AllNotesView = ({ notesList, onReference, onDelete, logTabSwitch  }: AllNotesViewProps) => {
  if (notesList.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6b7280',  }}>
        <h2>No notes saved yet.<br />Start exploring nodes to build your Notes!</h2>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
      <h2 style={{ marginTop: 0, fontSize: '2rem', borderBottom: '2px solid #271711', paddingBottom: '12px' }}>
         All Notes
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {notesList.map((note) => {
          const config = TAB_CONFIG.find((t) => t.id === note.node_type) || TAB_CONFIG[0];

          return (
            <div
              key={note.id}
              onClick={() => {
                if (note.node_type) {
                  logTabSwitch(note.node_type);
                }
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
                cursor: note.highlighted_text ? 'pointer' : 'default', 
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', color: config.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {config.title}  
                </div>
                
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
  
  // Connect to the extracted logic!
  const logic = useNotesLogic(selectedType, onClose);

  const renderContent = () => {
    // Dynamically load the HTML file matching the activeTab name!
    return (
      <DynamicHtmlContent 
        nodeType={logic.activeTab} 
        notesList={logic.notesList} 
        activeReferencedNote={logic.activeReferencedNote} 
      />
    );
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
        justifyContent: 'center', // Centers the single white box
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      
      {/* --- MAIN MODAL (The White Box) --- */}
      <div
        className="neo-card"
        style={{
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh', 
          display: 'flex',
          flexDirection: 'column', 
          gap: '20px',
          position: 'relative',
          padding: '30px', // We keep padding inline here because the modal needs slightly more padding than a standard card
        }}
      >
        
        {/* Absolute Close Button for Top Right */}
        <button
          type="button"
          onClick={logic.handleModalClose}
          style={{
            position: 'absolute',
            top: '0px',
            right: '5px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#111827',
            zIndex: 10,
          }}
        >
          ✖
        </button>

        {/* --- BOTTOM ROW: THE 3 COLUMNS --- */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          // flex: 1, // Takes up all remaining vertical space below the SAMM bar
          minHeight: 0, // CRITICAL: This allows the panes inside to scroll properly!
          gap: '20px',
        }}>
          
          {/* LEFT PANE: NAVIGATION SIDEBAR */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px', 
              width: '155px', 
              borderRight: '5px solid #111827',
              paddingRight: '20px',
              paddingTop: '10px',
              overflowY: 'auto',
            }}
          >
            {TAB_CONFIG.map((tab) => {
              const isActive = logic.activeTab === tab.id;

              return (
                <button
                  // className="sidebar-button counter"
                  key={tab.id}
                  type="button"
                  onClick={() => {
                      logic.handleTabSwitch(tab.id); 
                    }}
                  className="counter"
                  style={{
                    width: '100%',
                    padding: '12px 8px',
                    borderRadius: '8px',
                    backgroundColor: tab.color,
                    border: `${isActive ? "4px solid" :"3px solid"} #111827`,
                    color: '#ffffff', 
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
                  {tab.title} 
                </button>
              );
            })}
          </div>

          {/* DYNAMIC CONTENT AREA */}
          {logic.activeTab === 'allNotes' ? (
            <AllNotesView 
              notesList={logic.notesList} 
              onReference={logic.handleNoteReference} 
              onDelete={logic.handleDeleteNote}
              logTabSwitch={logic.handleTabSwitch}
            />
          ) : (
            <>
              {/* MIDDLE PANE: READING CONTENT */}
              <div
                id="middle-reading-pane"
                style={{ flex: 2, overflowY: 'auto', paddingRight: '20px', textAlign: 'left' }}
                onMouseUp={logic.handleTextSelection}
              >
                {renderContent()}
              </div>

              {/* RIGHT PANE: STUDY NOTES DASHBOARD */}
              <NotesPanel {...logic} />
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}

export const AllNotesButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      className="neo-btn"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#ffffff",
        height: '50px', // Matches the timer height perfectly
        padding: '10px 9px',
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = "translate(4px, 4px)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "none"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
      title="Open All Notes"
    >
       <span style={{ fontSize: '1.5rem', lineHeight: '1' }} role="img">📒</span>
    </button>
  );
};