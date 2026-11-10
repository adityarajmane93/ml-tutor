import { describe, expect, it } from 'vitest';
import { anchorsOverlap, rangesForBlock, splitTextIntoHighlightSegments, type HighlightAnchor } from './learnTextHighlighting';
const anchor = (start: string, startOffset: number, end: string, endOffset: number): HighlightAnchor => ({ version: 1, start: { blockId: start, offset: startOffset }, end: { blockId: end, offset: endOffset }, selectedText: 'fixture' });
describe('resource-level Learn highlights', () => {
  it('renders one saved highlight across heading, paragraphs, and list items', () => { const note = { id: 1, highlight_anchor: anchor('block-0', 2, 'block-3', 3) }; expect(rangesForBlock('block-0', '1. Intuition', [note])).toEqual([{ id: 1, start: 2, end: 12 }]); expect(rangesForBlock('block-1', 'Before training', [note])).toEqual([{ id: 1, start: 0, end: 15 }]); expect(rangesForBlock('block-2', 'First item', [note])).toEqual([{ id: 1, start: 0, end: 10 }]); expect(rangesForBlock('block-3', 'Second item', [note])).toEqual([{ id: 1, start: 0, end: 3 }]); });
  it('keeps inline leaves separate without nested marks', () => expect(splitTextIntoHighlightSegments('dataset', [{ id: 2, start: 0, end: 7 }])).toEqual([{ text: 'dataset', highlightId: 2 }]));
  it('allows independent passages but rejects overlap deterministically', () => { expect(anchorsOverlap(anchor('block-0', 0, 'block-1', 2), anchor('block-1', 2, 'block-2', 1))).toBe(false); expect(anchorsOverlap(anchor('block-0', 0, 'block-2', 2), anchor('block-1', 1, 'block-3', 1))).toBe(true); });
  it('restores the same block segments after rerendering', () => { const note = { id: 3, highlight_anchor: anchor('block-1', 1, 'block-2', 2) }; expect(rangesForBlock('block-1', 'alpha', [note])).toEqual(rangesForBlock('block-1', 'alpha', [note])); });
});
