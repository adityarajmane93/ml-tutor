import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { logEvent } from '../services/logger';
import { useSessionStore } from '../store/sessionStore';
import { devLog } from "./logger"

export interface SavedNote {
  id: number;
  node_type?: string;
  highlighted_text?: string;
  custom_note?: string;
  start_index?: number;
  end_index?: number;
  timestamp: string;
}

export function useNotesLogic(selectedType: string, onClose: () => void) {
  const [activeTab, setActiveTab] = useState(selectedType || 'allNotes');
  const [highlightData, setHighlightData] = useState<{ text: string; start: number; end: number } | null>(null);
  const [typedNote, setTypedNote] = useState('');
  const [notesList, setNotesList] = useState<SavedNote[]>([]);
  const [activeReferencedNote, setActiveReferencedNote] = useState<number | null>(null);

  const sessionId = useSessionStore((state) => state.sessionId);

  // --- REFS ---
  const activeTabRef = useRef(activeTab);
  const highlightDataRef = useRef(highlightData);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  
  // Tracking Refs for Logging
  const typedNoteRef = useRef(typedNote);
  const prevNoteRef = useRef(typedNote);
  const isDeletingRef = useRef(false);
  const textBeforeDeleteRef = useRef('');
  const deletionTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);

  // Sync basic refs
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { highlightDataRef.current = highlightData; }, [highlightData]);

  // --- LOGGING FUNCTIONS ---
  const logAbandonedHighlight = async (highlightToLog: {text: string, start: number, end: number}) => {
    try {
      await logEvent('LEARN_TAB', 'HIGHLIGHT_ABANDONED', {
        node_type: activeTabRef.current,
        highlighted_text: highlightToLog.text,
        start_index: highlightToLog.start,
        end_index: highlightToLog.end
      });
    } catch (error) {
      console.error("Failed to log abandoned highlight:", error);
    }
  };

  const logAbandonedNote = async (noteToLog: string) => {
    if (!noteToLog.trim()) return;
    try {
      await logEvent('LEARN_TAB', 'NOTE_ABANDONED', {
        node_type: activeTabRef.current,
        abandoned_text: noteToLog
      });
    } catch (error) {
      console.error("Failed to log abandoned note:", error);
    }
  };

  // --- DELETION SESSION LOGIC ---
  const extractDeletedText = (oldStr: string, newStr: string) => {
    let start = 0;
    while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) { 
      start++; 
    }
    let oldEnd = oldStr.length - 1;
    let newEnd = newStr.length - 1;
    while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[newEnd]) {
      oldEnd--; 
      newEnd--;
    }
    return oldStr.substring(start, oldEnd + 1).trim();
  };

  const processDeletionSession = () => {
    if (!isDeletingRef.current) return;
    
    const deletedText = extractDeletedText(textBeforeDeleteRef.current, typedNote);
    
    if (deletedText.length > 1) { 
      logEvent('LEARN_TAB', 'TEXT_ABANDONED', {
        node_type: activeTabRef.current,
        abandoned_text: deletedText,
        remaining_context: typedNote
      });
    }
    
    isDeletingRef.current = false;
  };

  // The Main Keystroke Engine
  useEffect(() => {
    typedNoteRef.current = typedNote; // Sync for tab switches and closing

    const prev = prevNoteRef.current;
    const curr = typedNote;

    if (isSavingRef.current) {
      prevNoteRef.current = curr;
      return;
    }

    if (curr.length < prev.length) {
      if (!isDeletingRef.current) {
        isDeletingRef.current = true;
        textBeforeDeleteRef.current = prev; 
      }

      if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
      
      deletionTimerRef.current = window.setTimeout(() => {
        processDeletionSession();
      }, 1500); 

    } else if (curr.length > prev.length) {
      if (isDeletingRef.current) {
        if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
        processDeletionSession();
      }
    }

    prevNoteRef.current = curr;

    return () => {
      if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
    };
  }, [typedNote]);
  

  // --- HEATMAP: RAW CLICK TRACKING ---
  useEffect(() => {
    const trackRawClicks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // The Bouncer: Check if the click is on an element we ALREADY track or care about
      const isTrackedElement = 
        target.closest('button') ||              // Ignores all buttons (sidebar, save, close, delete)
        target.tagName.toLowerCase() === 'textarea' || // Ignores typing
        target.closest('mark');                  // Ignores clicking on yellow highlights

      // If it is a tracked element, stop here! Do not log coordinates.
      if (isTrackedElement) return;

      // The Logger: If it's "dead space" or raw text, log the exact X/Y coordinates
      logEvent('INTERACTION', 'RAW_PAGE_CLICK', {
        node_type: activeTabRef.current,
        x_coord: e.clientX, // Exact X pixel on their screen
        y_coord: e.clientY, // Exact Y pixel on their screen
        clicked_tag: target.tagName.toLowerCase() // Tells if they clicked a <div>, <p>, <h2>, etc.
      }).catch(err => devLog("Failed to log raw click:", err));
    };

    // Attach the listener to the whole document
    document.addEventListener('click', trackRawClicks);
    
    // Clean it up when the modal closes
    return () => document.removeEventListener('click', trackRawClicks);
  }, []);
  
  // --- EVENT HANDLERS ---
  const handleClearHighlight = () => {
    if (highlightDataRef.current) {
      logAbandonedHighlight(highlightDataRef.current);
    }
    setHighlightData(null);
    window.getSelection()?.removeAllRanges(); 
  };

  const handleModalClose = () => {
    handleClearHighlight();
    // Catch entire notes left behind when clicking 'X'
    if (typedNoteRef.current.trim() !== '') {
      logAbandonedNote(typedNoteRef.current);
    }
    onClose();
  };

  const handleTabSwitch = (newTabId: string) => {
    logEvent('LEARN_TAB', 'TAB_CHANGED', {
      from_node: activeTabRef.current,
      to_node: newTabId
    }).catch(err => console.error("Failed to log tab switch:", err));

    // Catch entire notes left behind when switching tabs
    if (typedNoteRef.current.trim() !== '') {
      logAbandonedNote(typedNoteRef.current);
      
      isSavingRef.current = true; 
      setTypedNote('');
      setTimeout(() => { isSavingRef.current = false; }, 100);
    }

    handleClearHighlight();
    setActiveReferencedNote(null);
    setActiveTab(newTabId);
  };

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const target = e.target as Element;

      if (target.closest('.sidebar-button')) return;
      if (target.closest('#middle-reading-pane')) return;

      if (rightPaneRef.current?.contains(target)) {
        if (target.tagName.toLowerCase() === 'textarea' || target.closest('button')) {
          return;
        }
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

  const handleDeleteNote = async (e: React.MouseEvent, noteId: number, nodeType?: string) => {
    e.stopPropagation(); 
    setNotesList((prev) => prev.filter((n) => n.id !== noteId));
    
    try {
      await logEvent('LEARN_TAB', 'NOTE_DELETED_IN_DB', { 
        note_id: noteId, 
        node_type: nodeType || activeTab 
      });
      await axios.delete(`${import.meta.env.VITE_API_URL}/notes/${noteId}`);
    } catch (error) {
      console.error('Failed to log deletion:', error);
    }
  };

  useEffect(() => {
    let ignore = false; 

    const fetchNotes = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL; 
        const url = activeTab === 'allNotes'
            ? `${baseUrl}/notes?session_id=${sessionId}`
            : `${baseUrl}/notes?session_id=${sessionId}&node_type=${activeTab}`;

        const response = await axios.get(url);
        
        if (!ignore && response.data && Array.isArray(response.data)) {
          setNotesList(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch previous notes:', error);
      }
    };

    if (sessionId) {
      setNotesList([]); 
      fetchNotes();
    }
    
    setHighlightData(null);
    return () => { ignore = true; }; 
  }, [activeTab, sessionId]);

  useEffect(() => {
    if (activeTab === 'allNotes' || activeReferencedNote === null) return;
    const element = document.getElementById(`highlight-${activeReferencedNote}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTab, activeReferencedNote, notesList]);

  useEffect(() => {
    if (activeReferencedNote === null) return;
    const timer = window.setTimeout(() => { setActiveReferencedNote(null); }, 4000);
    return () => window.clearTimeout(timer);
  }, [activeReferencedNote]);

  const handleNoteReference = (note: SavedNote) => {
    //  If the note belongs to a different tab, switch the tab FIRST
    if (note.node_type && note.node_type !== activeTab) {
      setActiveTab(note.node_type);
    }

    // Use a tiny delay to wait for the new HTML page to fully render on the screen,
    //    and to bypass any effects that clear highlights when tabs change!
    setTimeout(() => {
      if (note.highlighted_text && note.start_index != null && note.end_index != null) {
        setActiveReferencedNote(note.id);
        
        // page automatically scrolls down to the active text!
        setTimeout(() => {
          // Instantly finds the exact active note, no matter what color it is!
          const activeElement = document.querySelector('.active-highlight');
          
          if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);

      } else {
        setActiveReferencedNote(null); 
      }
    }, 150); // 150ms is fast enough the user won't notice, but slow enough for React to finish rendering!
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
      setHighlightData({ text: selectedString, start, end });
    }
  };

  const handleSaveNote = async () => {
    if (!highlightData && !typedNote) return;

    isSavingRef.current = true; 

    const currentTimestamp = Math.floor(Date.now() / 1000).toString();

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/notes/`, {
        session_id: sessionId,
        node_type: activeTab,
        highlighted_text: highlightData?.text || null,
        start_index: highlightData?.start ?? null,
        end_index: highlightData?.end ?? null,
        custom_note: typedNote || null,
        timestamp: currentTimestamp,
      });

      await logEvent('LEARN_TAB', 'NOTE_SAVED', { 
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

      setTimeout(() => { isSavingRef.current = false; }, 100); 

      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to save note:', error);
      isSavingRef.current = false; 
    }
  };

  return {
    activeTab, setActiveTab,
    highlightData, setHighlightData,
    typedNote, setTypedNote,
    notesList, setNotesList,
    activeReferencedNote, setActiveReferencedNote,
    rightPaneRef,
    handleClearHighlight, handleModalClose,
    handleDeleteNote, handleNoteReference,
    handleTextSelection, handleSaveNote,
    logAbandonedHighlight,
    handleTabSwitch
  };
}