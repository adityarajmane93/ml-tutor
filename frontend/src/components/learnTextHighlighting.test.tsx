import { renderToStaticMarkup } from 'react-dom/server';
import parse, { Element, type DOMNode } from 'html-react-parser';
import { describe, expect, it } from 'vitest';
import { HighlightableInlineContent } from './HighlightableInlineContent';
import { getValidHighlightRanges, splitTextIntoHighlightSegments } from './learnTextHighlighting';

const note = (id: number, start_index: number, end_index: number, highlighted_text: string) => ({
  id,
  start_index,
  end_index,
  highlighted_text,
  timestamp: '1',
});

function renderInline(html: string, notes = [note(1, 2, 9, 'feature')]) {
  let children: DOMNode[] = [];
  parse(`<p>${html}</p>`, {
    replace: (node) => {
      if (node instanceof Element && node.name === 'p') children = node.children as DOMNode[];
    },
  });
  const text = html.replace(/<[^>]+>/g, '');
  return renderToStaticMarkup(
    <HighlightableInlineContent nodes={children} text={text} notesList={notes} activeReferencedNote={null} />,
  );
}

describe('learn rich-text highlighting', () => {
  it('keeps a plain-text paragraph compatible with legacy offsets', () => {
    const text = 'Plain text paragraph';
    expect(getValidHighlightRanges(text, [note(1, 6, 10, 'text')])).toEqual([{ id: 1, start: 6, end: 10 }]);
    expect(splitTextIntoHighlightSegments(text, 0, [{ id: 1, start: 6, end: 10 }])).toEqual([
      { text: 'Plain ' }, { text: 'text', highlightId: 1 }, { text: ' paragraph' },
    ]);
  });

  it('preserves strong and em elements while highlighting inside them', () => {
    const markup = renderInline('A <strong>feature</strong> is <em>useful</em>.');
    expect(markup).toContain('<strong><mark');
    expect(markup).toContain('>feature</mark></strong>');
    expect(markup).toContain('<em>useful</em>');
  });

  it('splits a selection that spans formatted and unformatted text by its flattened offsets', () => {
    const text = 'A feature is useful.';
    const ranges = getValidHighlightRanges(text, [note(2, 2, 12, 'feature is')]);
    expect(splitTextIntoHighlightSegments('A ', 0, ranges)).toEqual([{ text: 'A ' }]);
    expect(splitTextIntoHighlightSegments('feature', 2, ranges)).toEqual([{ text: 'feature', highlightId: 2 }]);
    expect(splitTextIntoHighlightSegments(' is ', 9, ranges)).toEqual([
      { text: ' is', highlightId: 2 }, { text: ' ' },
    ]);
  });

  it('restores two distinct highlights after rendering again', () => {
    const notes = [note(3, 0, 5, 'First'), note(4, 13, 19, 'second')];
    const once = renderInline('First value, second value.', notes);
    const afterRemount = renderInline('First value, second value.', notes);
    expect(once).toBe(afterRemount);
    expect(afterRemount.match(/data-highlight-id=/g)).toHaveLength(2);
  });
});
