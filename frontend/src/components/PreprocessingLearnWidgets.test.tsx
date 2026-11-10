// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { DuplicateWidget, MissingValueWidget, OutlierWidget } from './PreprocessingLearnWidgets';

describe('Preprocessing Learn widgets', () => {
  it('renders the three isolated preprocessing illustrations', () => {
    const host = document.createElement('div');
    act(() => createRoot(host).render(<><MissingValueWidget /><OutlierWidget /><DuplicateWidget /></>));
    expect(host.textContent).toContain('replace the blank with 80');
    expect(host.textContent).toContain('Mean sensitivity explorer');
    expect(host.textContent).toContain('Exact duplicate check');
    expect(host.querySelectorAll('[data-learn-widget-root]')).toHaveLength(3);
  });
});
