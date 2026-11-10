// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { DatasetFeatureTargetWidget, DatasetSplitWidget } from './DatasetLearnWidgets';

describe('Dataset Learn widgets', () => {
  it('renders the feature-to-label explanation', () => {
    const host = document.createElement('div');
    act(() => createRoot(host).render(<DatasetFeatureTargetWidget />));
    expect(host.textContent).toContain('Trained classifier');
    expect(host.textContent).toContain('Predicted label');
  });
  it('calculates slider proportions only for the illustrative split', () => {
    const host = document.createElement('div'); const root = createRoot(host);
    act(() => root.render(<DatasetSplitWidget />));
    expect(host.textContent).toContain('70 train');
    expect((host.querySelector('input') as HTMLInputElement).value).toBe('30');
  });
});
