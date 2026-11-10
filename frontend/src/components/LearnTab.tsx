import React, { useState, useEffect, useRef, memo } from 'react';
import parse, { Element, type DOMNode } from 'html-react-parser';
import { useNotesLogic } from '../flow/useNotesLogic';
import type { SavedNote } from '../flow/useNotesLogic';
import NotesPanel from './NotesPanel';
import { logEvent } from '../services/logger';
import { getDomTextContent } from './learnTextHighlighting';
import { HighlightableInlineContent } from './HighlightableInlineContent';
import { DatasetFeatureTargetWidget, DatasetSplitWidget } from './DatasetLearnWidgets';
import { DuplicateWidget, MissingValueWidget, OutlierWidget } from './PreprocessingLearnWidgets';
import { KNNWidget, LogisticWidget, TreeWidget, ZeroRWidget } from './ModelLearnWidgets';
import { ArrangeWidget, ConnectWidget, DataflowWidget, DebugWidget } from './EdgesLearnWidgets';
import { AveragingWidget, ConfusionWidget, ImbalanceWidget, ThresholdWidget } from './EvaluationLearnWidgets';

import { HighlightPractice, AnnotationPractice, OrganizationWidget } from './NotesInfoLearnWidgets';

// --- DYNAMIC HTML ENGINE ---
type ContentProps = {
  nodeType: string;
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

const DynamicHtmlContent = memo(({ nodeType, notesList, activeReferencedNote }: ContentProps) => {
  const [htmlString, setHtmlString] = useState<string>("<p>Loading content...</p>");
  let blockCounter = 0;
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

        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'feature-target') return <DatasetFeatureTargetWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'train-test-split') return <DatasetSplitWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'missing-values') return <MissingValueWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'outlier') return <OutlierWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'duplicates') return <DuplicateWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'knn') return <KNNWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'tree') return <TreeWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'logistic') return <LogisticWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'zeror') return <ZeroRWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'dataflow') return <DataflowWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'arrange') return <ArrangeWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'connect') return <ConnectWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'debug') return <DebugWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'confusion') return <ConfusionWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'imbalance') return <ImbalanceWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'threshold') return <ThresholdWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'averaging') return <AveragingWidget />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'highlight-practice') return <HighlightPractice />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'annotation-practice') return <AnnotationPractice />;
        if (tagName === 'div' && domNode.attribs['data-learn-widget'] === 'organization') return <OrganizationWidget />;

        // --- RULE 2: IMAGES (Keep original HTML styles) ---
        if (tagName === 'img') {
          // Render the image exactly as it is written and styled in the .html file!"
          return undefined; 
        }

        // --- RULE 3: TEXT & LISTS (Justified, WITH Highlighting) ---
        if (['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const Tag = tagName as React.ElementType;
          const children = domNode.children as DOMNode[];
          // This is the same flattened inline text used by browser Ranges, so
          // legacy offsets remain valid even when a child is nested deeply.
          const text = getDomTextContent(children);
          return (
            <Tag data-text-block-id={`block-${blockCounter++}`} style={{ lineHeight: '1.6', marginBottom: '16px', textAlign: ['h1', 'h2'].includes(tagName) ? 'center' : 'left' }}>
              <HighlightableInlineContent
                nodes={children}
                text={text}
                blockId={`block-${blockCounter - 1}`}
                notesList={notesList}
                activeReferencedNote={activeReferencedNote}
              />
            </Tag>
          );
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
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
};

const AllNotesView = ({ notesList, onReference, onDelete, logTabSwitch, onScroll }: AllNotesViewProps) => {
  if (notesList.length === 0) {
    return (
      <div data-aoi-type="learn_notes" data-aoi-id="allNotes" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6b7280',  }}>
        <h2>No notes saved yet.<br />Start exploring nodes to build your Notes!</h2>
      </div>
    );
  }

  return (
    <div data-aoi-type="learn_notes" data-aoi-id="allNotes" onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
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
  const resourceVisitRef = useRef(0);
  const completedMilestonesRef = useRef(new Set<string>());

  useEffect(() => {
    resourceVisitRef.current += 1;
  }, [logic.activeTab]);

  const handleResourceScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const scrollableHeight = scrollHeight - clientHeight;
    if (scrollableHeight <= 0) return;
    const depth = Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
    for (const milestone of [25, 50, 75, 100]) {
      const key = `${logic.activeTab}:${resourceVisitRef.current}:${milestone}`;
      if (depth >= milestone && !completedMilestonesRef.current.has(key)) {
        completedMilestonesRef.current.add(key);
        void logEvent('LEARN_TAB', 'RESOURCE_SCROLL_MILESTONE', {
          resource_id: logic.activeTab,
          scroll_depth_percent: milestone,
        });
      }
    }
  };

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
      data-aoi-type="learn_controls"
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
          flex: 1,
          minWidth: 0,
          minHeight: 0, // CRITICAL: This allows the panes inside to scroll properly!
          gap: '20px',
          overflow: 'hidden',
        }}>
          
          {/* LEFT PANE: NAVIGATION SIDEBAR */}
          <div
            data-aoi-type="learn_navigation"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px', 
              flex: '0 0 155px',
              width: '155px', 
              minWidth: 0,
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
              onScroll={handleResourceScroll}
            />
          ) : (
            <>
              {/* MIDDLE PANE: READING CONTENT */}
              <div
                id="middle-reading-pane"
                data-aoi-type="learn_content"
                data-aoi-id={logic.activeTab}
                tabIndex={0}
                style={{ flex: '2 1 0', minWidth: 0, overflowY: 'auto', paddingRight: '20px', textAlign: 'left' }}
                onMouseUp={logic.handleTextSelection}
                onKeyUp={logic.handleTextSelection}
                onScroll={handleResourceScroll}
              >
                {renderContent()}
              </div>

              {/* RIGHT PANE: STUDY NOTES DASHBOARD */}
              <div data-aoi-type="learn_notes" data-aoi-id={logic.activeTab} style={{ flex: '1.2 1 0', minWidth: 0, minHeight: 0, display: 'flex' }}>
                <NotesPanel {...logic} />
              </div>
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
