import React from 'react';
import { domToReact, type DOMNode } from 'html-react-parser';
import type { SavedNote } from '../flow/useNotesLogic';
import { getValidHighlightRanges, splitTextIntoHighlightSegments } from './learnTextHighlighting';

type HighlightableInlineContentProps = {
  nodes: DOMNode[];
  text: string;
  notesList: SavedNote[];
  activeReferencedNote: number | null;
};

/**
 * Replaces text leaves, rather than the containing inline elements. As a
 * result, <strong>, <em>, links, and nested inline markup remain in the DOM
 * while saved offsets still refer to the block's flattened textContent.
 */
export function HighlightableInlineContent({
  nodes,
  text,
  notesList,
  activeReferencedNote,
}: HighlightableInlineContentProps) {
  const ranges = getValidHighlightRanges(text, notesList);
  const offset = { current: 0 };

  return (
    <span className="highlight-block" data-highlightable-content="true">
      {domToReact(nodes, {
        replace: (node) => {
          if (node.type !== 'text') return undefined;

          const nodeText = node.data;
          const nodeStart = offset.current;
          offset.current += nodeText.length;
          const segments = splitTextIntoHighlightSegments(nodeText, nodeStart, ranges);

          return (
            <React.Fragment>
              {segments.map((segment, index) => (
                segment.highlightId == null ? segment.text : (
                  <mark
                    key={`${segment.highlightId}-${nodeStart + index}`}
                    data-highlight-id={segment.highlightId}
                    className={activeReferencedNote === segment.highlightId ? 'active-highlight' : 'standard-highlight'}
                    style={{
                      backgroundColor: activeReferencedNote === segment.highlightId ? '#fb923c' : '#fef08a',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      color: '#111827',
                      boxShadow: '1px 1px 0px #111827',
                      transition: 'all 0.3s ease',
                      transform: activeReferencedNote === segment.highlightId ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {segment.text}
                  </mark>
                )
              ))}
            </React.Fragment>
          );
        },
      })}
    </span>
  );
}
