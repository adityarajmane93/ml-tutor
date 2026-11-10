import React from 'react';
import { domToReact, type DOMNode } from 'html-react-parser';
import type { SavedNote } from '../flow/useNotesLogic';
import { rangesForBlock, splitTextIntoHighlightSegments } from './learnTextHighlighting';

export function HighlightableInlineContent({ nodes, text, blockId, notesList, activeReferencedNote }: { nodes: DOMNode[]; text: string; blockId: string; notesList: SavedNote[]; activeReferencedNote: number | null }) {
  const ranges = rangesForBlock(blockId, text, notesList); const offset = { current: 0 };
  return <span className="highlight-block" data-highlightable-content="true">{domToReact(nodes, { replace: (node) => {
    if (node.type !== 'text') return undefined;
    const start = offset.current; offset.current += node.data.length;
    const local = ranges.flatMap((range) => { const from = Math.max(range.start, start); const to = Math.min(range.end, start + node.data.length); return from < to ? [{ id: range.id, start: from - start, end: to - start }] : []; });
    return <React.Fragment>{splitTextIntoHighlightSegments(node.data, local).map((segment, index) => segment.highlightId == null ? segment.text : <mark key={`${segment.highlightId}-${start}-${index}`} data-highlight-id={segment.highlightId} className={activeReferencedNote === segment.highlightId ? 'active-highlight' : 'standard-highlight'} style={{ backgroundColor: activeReferencedNote === segment.highlightId ? '#fb923c' : '#fef08a', padding: '2px 4px', borderRadius: '4px', color: '#111827', boxShadow: '1px 1px 0px #111827' }}>{segment.text}</mark>)}</React.Fragment>;
  }})}</span>;
}
