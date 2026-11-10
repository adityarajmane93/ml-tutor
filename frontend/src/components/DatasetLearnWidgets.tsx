import { useState, type CSSProperties } from 'react';

const card: CSSProperties = { border: '2px solid #111827', borderRadius: 8, padding: 16, margin: '16px 0', background: '#fff', boxShadow: '3px 3px 0 #111827' };
const getIllustrativeSplit = (testSize: number) => ({ trainSize: 100 - testSize, testSize });

export function DatasetFeatureTargetWidget() {
  return <div data-learn-widget-root="feature-target" style={card} aria-label="Features to prediction diagram">
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap', textAlign: 'center' }}>
      <div style={{ flex: 1, minWidth: 150, padding: 10, background: '#e0f2fe' }}><strong>Features</strong><br /><small>Study hours · Attendance · Previous score</small></div>
      <div style={{ alignSelf: 'center', fontWeight: 800 }} aria-hidden="true">→</div>
      <div style={{ flex: 1, minWidth: 130, padding: 10, background: '#fef3c7' }}><strong>Trained classifier</strong><br /><small>Learns from labeled examples</small></div>
      <div style={{ alignSelf: 'center', fontWeight: 800 }} aria-hidden="true">→</div>
      <div style={{ flex: 1, minWidth: 120, padding: 10, background: '#dcfce7' }}><strong>Predicted label</strong><br /><small>Pass or Fail</small></div>
    </div>
  </div>;
}

export function DatasetSplitWidget() {
  const [testSize, setTestSize] = useState(30); const { trainSize } = getIllustrativeSplit(testSize);
  return <section data-learn-widget-root="train-test-split" style={card} aria-label="Illustrative train-test split explorer">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}><strong>Illustrative split: 100 hypothetical observations</strong><span>{testSize}% test</span></div>
    <input aria-label="Illustrative test size" type="range" min="10" max="50" value={testSize} onChange={(event) => setTestSize(Number(event.target.value))} style={{ width: '100%', accentColor: '#2563eb' }} />
    <div aria-label={`${trainSize} training observations and ${testSize} test observations`} style={{ height: 30, display: 'flex', border: '2px solid #111827', overflow: 'hidden' }}><div style={{ width: `${trainSize}%`, background: '#60a5fa', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{trainSize} train</div><div style={{ width: `${testSize}%`, background: '#fbbf24', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{testSize} test</div></div>
    <small>More training examples can help a model learn; more test examples can make an evaluation less uncertain. This simulation does not change your Dataset node.</small>
  </section>;
}
