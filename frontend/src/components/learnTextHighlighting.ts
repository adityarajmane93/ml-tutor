import type { DOMNode } from 'html-react-parser';
import type { SavedNote } from '../flow/useNotesLogic';

export type HighlightRange = {
  id: number;
  start: number;
  end: number;
};

export type TextSegment = {
  text: string;
  highlightId?: number;
};

export function getDomTextContent(nodes: DOMNode[]): string {
  return nodes.map((node) => {
    if (node.type === 'text') return node.data;
    return 'children' in node ? getDomTextContent(node.children as DOMNode[]) : '';
  }).join('');
}

/**
 * Notes have historically stored offsets relative to the textContent of one
 * content block. Keep accepting that representation, but never paint a note
 * unless it still identifies the exact saved text. This prevents an old note
 * from being shown at an incorrect location when curriculum content changes.
 */
export function getValidHighlightRanges(text: string, notes: SavedNote[]): HighlightRange[] {
  const ranges = notes
    .flatMap((note): HighlightRange[] => {
      const { id, start_index: start, end_index: end, highlighted_text: highlightedText } = note;
      if (
        !Number.isInteger(id)
        || typeof start !== 'number'
        || typeof end !== 'number'
        || !Number.isInteger(start)
        || !Number.isInteger(end)
        || typeof highlightedText !== 'string'
        || start < 0
        || end <= start
        || end > text.length
        || text.slice(start, end) !== highlightedText
      ) {
        return [];
      }
      return [{ id, start, end }];
    })
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id - b.id);

  // Existing notes never intentionally overlap. Retaining only the first
  // verified interval keeps an ambiguous/corrupt record from changing another
  // note's visual location.
  return ranges.filter((range, index) => index === 0 || range.start >= ranges[index - 1].end);
}

export function splitTextIntoHighlightSegments(
  text: string,
  textStart: number,
  ranges: HighlightRange[],
): TextSegment[] {
  const textEnd = textStart + text.length;
  const segments: TextSegment[] = [];
  let cursor = textStart;

  for (const range of ranges) {
    const overlapStart = Math.max(range.start, textStart);
    const overlapEnd = Math.min(range.end, textEnd);
    if (overlapStart >= overlapEnd) continue;

    if (cursor < overlapStart) {
      segments.push({ text: text.slice(cursor - textStart, overlapStart - textStart) });
    }
    segments.push({
      text: text.slice(overlapStart - textStart, overlapEnd - textStart),
      highlightId: range.id,
    });
    cursor = overlapEnd;
  }

  if (cursor < textEnd) {
    segments.push({ text: text.slice(cursor - textStart) });
  }

  return segments;
}

export function getRangeOffsetsWithinBlock(range: Range, block: HTMLElement) {
  if (!block.contains(range.startContainer) || !block.contains(range.endContainer)) {
    return null;
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(block);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const start = beforeRange.toString().length;
  const text = range.toString();

  return { text, start, end: start + text.length };
}
