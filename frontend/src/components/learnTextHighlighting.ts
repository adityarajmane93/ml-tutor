import type { DOMNode } from 'html-react-parser';

export type TextAnchor = { blockId: string; offset: number };
export type HighlightAnchor = { version: 1; start: TextAnchor; end: TextAnchor; selectedText: string };
export type HighlightSegment = { text: string; highlightId?: number };
type AnchoredNote = { id: number; highlight_anchor?: HighlightAnchor | null };

export function getDomTextContent(nodes: DOMNode[]): string {
  return nodes.map((node) => node.type === 'text' ? node.data : 'children' in node ? getDomTextContent(node.children as DOMNode[]) : '').join('');
}
export function blockIndex(blockId: string) { const match = /^block-(\d+)$/.exec(blockId); return match ? Number(match[1]) : -1; }
export function splitTextIntoHighlightSegments(text: string, ranges: Array<{ id: number; start: number; end: number }>): HighlightSegment[] {
  const segments: HighlightSegment[] = []; let cursor = 0;
  for (const range of ranges) { if (range.start < cursor || range.end <= range.start || range.end > text.length) continue; if (cursor < range.start) segments.push({ text: text.slice(cursor, range.start) }); segments.push({ text: text.slice(range.start, range.end), highlightId: range.id }); cursor = range.end; }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) }); return segments;
}
export function rangesForBlock(blockId: string, text: string, notes: AnchoredNote[]) {
  const index = blockIndex(blockId);
  return notes.flatMap((note) => { const anchor = note.highlight_anchor; if (!anchor || anchor.version !== 1) return []; const first = blockIndex(anchor.start.blockId); const last = blockIndex(anchor.end.blockId); if (first < 0 || last < first || index < first || index > last) return []; const start = index === first ? anchor.start.offset : 0; const end = index === last ? anchor.end.offset : text.length; return start >= 0 && end <= text.length && end > start ? [{ id: note.id, start, end }] : []; }).sort((a, b) => a.start - b.start || a.end - b.end || a.id - b.id);
}
function closestBlock(node: Node) { const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement; return element?.closest<HTMLElement>('[data-text-block-id]') ?? null; }
function offsetWithinBlock(container: Node, offset: number, block: HTMLElement) { const content = block.querySelector<HTMLElement>('[data-highlightable-content="true"]'); if (!content || !content.contains(container)) return null; const before = document.createRange(); before.selectNodeContents(content); before.setEnd(container, offset); return before.toString().length; }
export function getHighlightAnchorFromRange(range: Range, readingPane: HTMLElement): HighlightAnchor | null {
  if (!readingPane.contains(range.startContainer) || !readingPane.contains(range.endContainer)) return null;
  const startBlock = closestBlock(range.startContainer); const endBlock = closestBlock(range.endContainer); if (!startBlock || !endBlock) return null;
  const start = offsetWithinBlock(range.startContainer, range.startOffset, startBlock); const end = offsetWithinBlock(range.endContainer, range.endOffset, endBlock); const selectedText = range.toString();
  if (start == null || end == null || !selectedText.trim()) return null;
  return { version: 1, start: { blockId: startBlock.dataset.textBlockId!, offset: start }, end: { blockId: endBlock.dataset.textBlockId!, offset: end }, selectedText };
}
export function anchorsOverlap(a: HighlightAnchor, b: HighlightAnchor) { const as = blockIndex(a.start.blockId); const ae = blockIndex(a.end.blockId); const bs = blockIndex(b.start.blockId); const be = blockIndex(b.end.blockId); if (ae < bs || be < as) return false; if (as === be && a.start.offset >= b.end.offset) return false; if (bs === ae && b.start.offset >= a.end.offset) return false; return true; }
