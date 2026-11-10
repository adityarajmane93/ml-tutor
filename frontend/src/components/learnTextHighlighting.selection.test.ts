// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getRangeOffsetsWithinBlock } from './learnTextHighlighting';

function fixture() {
  document.body.innerHTML = '<span id="block" data-highlightable-content="true">A <strong>feature</strong> is <em>useful</em>.</span>';
  const block = document.getElementById('block') as HTMLElement;
  return {
    block,
    before: block.firstChild as Text,
    strong: block.querySelector('strong')!.firstChild as Text,
    emphasis: block.querySelector('em')!.firstChild as Text,
  };
}

describe('Range offsets in formatted Learn content', () => {
  it('calculates a selection that ends inside a strong element', () => {
    const { block, before, strong } = fixture();
    const range = document.createRange();
    range.setStart(before, 2);
    range.setEnd(strong, 4);

    expect(getRangeOffsetsWithinBlock(range, block)).toEqual({ text: 'feat', start: 2, end: 6 });
  });

  it('calculates a selection that begins inside strong and ends in em', () => {
    const { block, strong, emphasis } = fixture();
    const range = document.createRange();
    range.setStart(strong, 3);
    range.setEnd(emphasis, 2);

    expect(getRangeOffsetsWithinBlock(range, block)).toEqual({ text: 'ture is us', start: 5, end: 15 });
  });

  it('calculates a selection across multiple inline elements', () => {
    const { block, before, emphasis } = fixture();
    const range = document.createRange();
    range.setStart(before, 2);
    range.setEnd(emphasis, 6);

    expect(getRangeOffsetsWithinBlock(range, block)).toEqual({ text: 'feature is useful', start: 2, end: 19 });
  });
});
