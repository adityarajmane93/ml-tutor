import React, { useEffect, useRef } from 'react';
import type { SavedNote } from '../flow/useNotesLogic';
import SAMMbar
  from "./SAMMbar"

type HighlightPayload = { text: string; start: number; end: number };

type NotesPanelProps = {
  rightPaneRef: React.RefObject<HTMLDivElement | null>;
  notesList: SavedNote[];
  highlightData: { text: string; start: number; end: number } | null;
  typedNote: string;
  setTypedNote: (val: string) => void;
  handleClearHighlight: () => void;
  handleDeleteNote: (e: React.MouseEvent, noteId: number, nodeType?: string) => void;
  handleNoteReference: (note: SavedNote) => void;
  handleSaveNote: () => void;
  setHighlightData: (val: HighlightPayload | null) => void;
  logAbandonedHighlight: (val: HighlightPayload) => void;
};

export default function NotesPanel({
  rightPaneRef,
  notesList,
  highlightData,
  typedNote,
  setTypedNote,
  handleClearHighlight,
  handleDeleteNote,
  handleNoteReference,
  handleSaveNote,
  setHighlightData,
  logAbandonedHighlight
}: NotesPanelProps) {

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // The Gemini-style auto-expand text box
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Briefly collapse the height to 0 to measure the true scroll height of the text inside
      textarea.style.height = '0px';
      const scrollHeight = textarea.scrollHeight;
      
      // Set the new height, but cap it at 150px (the threshold)
      textarea.style.height = `${Math.min(scrollHeight, 150)}px`;

      //Hide the scrollbar entirely until the text actually hits the 150px threshold!
      textarea.style.overflowY = scrollHeight >= 150 ? 'auto' : 'hidden';
    }
  }, [typedNote]); // This runs every single time the user presses a key!

  // State to force a re-render when the reading pane finishes loading HTML
  // const [domUpdate, setDomUpdate] = useState(0);

  // useEffect(() => {
  //   const pane = document.getElementById('middle-reading-pane');
  //   if (!pane) return;

  //   // Watch the reading pane for arriving text
  //   const observer = new MutationObserver(() => {
  //     setDomUpdate(prev => prev + 1);
  //   });

  //   observer.observe(pane, { childList: true, subtree: true, characterData: true });
  //   return () => observer.disconnect();
  // }, []);

  // Helper to find the absolute global position of the text
  const getGlobalOccurrence = (text: string) => {
    const pane = document.getElementById('middle-reading-pane');
    if (!pane) return -1;
    // Grab all raw text from the entire document at once
    const fullText = pane.textContent || ''; 
    return fullText.indexOf(text);
  };

  // Pre-sort the notes using the global occurrence
  const sortedNotes = [...notesList].sort((a, b) => {
    if (a.highlighted_text && b.highlighted_text) {
      const indexA = getGlobalOccurrence(a.highlighted_text);
      const indexB = getGlobalOccurrence(b.highlighted_text);

      // If both were found, sort perfectly by their visual appearance on screen!
      if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
        return indexA - indexB; 
      }
      // Fallback if text is identical
      if (a.start_index != null && b.start_index != null) {
        return a.start_index - b.start_index;
      }
    }

    // Push highlighted notes above purely typed notes
    if (a.highlighted_text) return -1;
    if (b.highlighted_text) return 1;

    // Keep original timestamp order for typed notes
    return Number(a.timestamp) - Number(b.timestamp);
  });
  return (
    <div
      ref={rightPaneRef}
      style={{
        flex: 1.2,
        borderLeft: '4px solid #111827',
        paddingLeft: '20px',
        paddingRight: '5px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* SAMM Bar*/}
      <div style={{ 
        border: "4px solid #111827", 
        borderRadius: "0", 
        overflow: "hidden",
        boxShadow: "2px 2px 0px #111827",
        padding: "0 0 0 0", //
        
        width: '90%',
        margin: '0 auto', // Centers the 80% width div inside its parent
        display: 'flex', // Centers the inner SAMMbar horizontally
        justifyContent: 'center', 
        
        flexShrink: 0, // Prevents the SAMM bar from getting squished by the columns
      }}>
        <SAMMbar direction="column"/>
    </div>
        
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', maxHeight: '15px'}}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#111827' }}>Study Notes</h2>
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
        {sortedNotes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic', marginTop: '20px' }}>
            No notes saved for this topic yet.
          </p>
        ) : (
          sortedNotes.map((note, idx) => (
            <div
              key={note.id || idx}
              className="neo-list-item"
              onClick={() => {
                //Only trigger reference if text is highlighted
                if (note.highlighted_text) {
                  if (highlightData) logAbandonedHighlight(highlightData);
                  setHighlightData(null);
                  handleNoteReference(note);
                }
              }}
              style={{
                textAlign: 'left',
                marginBottom: '8px' 
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
            maxHeight: '100px',
            overflowY: 'auto',
            flexShrink: 0,
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

      
      {/* Wrapper - Keeps the layout from breaking */}
        <div style={{ position: 'relative', width: '100%', minHeight: '45px', flexShrink: 0 }}>
          
          {/* The Expanding Overlay Container */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end', // Keeps the Save button anchored to the bottom!
            gap: '12px',
            backgroundColor: '#ffffff',
            padding: '8px',
            boxShadow: textareaRef.current && textareaRef.current.scrollHeight > 50 
              ? '0px -10px 20px rgba(0, 0, 0, 0.1)' // Stronger shadow so it pops over the notes
              : '4px 4px 0px #111827',
            transition: 'box-shadow 0.2s ease'
          }}>
            
            <textarea
              ref={textareaRef}
              value={typedNote}
              onChange={(e) => setTypedNote(e.target.value)}
              placeholder="Add your thoughts down here..."
              style={{
                flex: 1,
                minHeight: '45px',
                maxHeight: '150px',
                overflowY: 'hidden',
                resize: 'none',
                boxSizing: 'border-box',
                padding: '10px 12px',
                border: '3px solid #111827', 
                borderRadius: '8px',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '1rem',
                backgroundColor: '#ffffff',
                boxShadow: textareaRef.current && textareaRef.current.scrollHeight > 50 
                  ? '0px -10px 20px rgba(0, 0, 0, 0.1)' 
                  : '4px 4px 0px #111827',
                transition: 'box-shadow 0.2s ease'
              }}
            />

          {/* Save Button now has its own Neobrutalist shadow and styling! */}
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={!highlightData && !typedNote}
            style={{
              padding: '0 20px',
              backgroundColor: !highlightData && !typedNote ? '#9ca3af' : '#3b82f6',
              color: '#ffffff',
              border: '3px solid #111827',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: !highlightData && !typedNote ? 'not-allowed' : 'pointer',
              height: '45px', // Matches the starting minHeight of the text area perfectly
              flexShrink: 0,
              boxShadow: !highlightData && !typedNote ? 'none' : '4px 4px 0px #111827'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}