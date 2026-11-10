import { useState, type CSSProperties } from 'react';
const card: CSSProperties = { border: '2px solid #111827', borderRadius: 8, padding: 14, margin: '16px 0', background: '#fff', boxShadow: '3px 3px 0 #111827' };

export function MissingValueWidget() {
  const [method, setMethod] = useState<'mean' | 'drop'>('mean'); const mean = 80;
  return <section data-learn-widget-root="missing-values" style={card}><strong>Worked example: one missing score</strong><div><button onClick={() => setMethod('mean')} aria-pressed={method === 'mean'}>Use mean</button> <button onClick={() => setMethod('drop')} aria-pressed={method === 'drop'}>Drop row</button></div><p>{method === 'mean' ? `Keep all 3 rows: replace the blank with ${mean}, the mean of 72 and 88.` : 'Keep 2 complete rows: remove the observation with the blank score.'}</p><small>This is an illustration; ML-Tutor applies its selected strategy to split data.</small></section>;
}
export function OutlierWidget() {
  const [includeOutlier, setIncludeOutlier] = useState(false); const values = includeOutlier ? [10, 12, 13, 100] : [10, 12, 13]; const mean = values.reduce((a, b) => a + b, 0) / values.length; const median = values.length === 4 ? 12.5 : 12;
  return <section data-learn-widget-root="outlier" style={card}><strong>Mean sensitivity explorer</strong><label style={{ display: 'block' }}><input type="checkbox" checked={includeOutlier} onChange={(e) => setIncludeOutlier(e.target.checked)} /> Include an outlier (100)</label><p>Values: {values.join(', ')} · Mean: {mean.toFixed(1)} · Median: {median}</p><small>The current node offers mean filling, not median filling. Median is a conceptual alternative that can be less affected by an extreme value.</small></section>;
}
export function DuplicateWidget() {
  const [remove, setRemove] = useState(false); const rows = remove ? ['A: 3 hours, Pass', 'B: 5 hours, Fail'] : ['A: 3 hours, Pass', 'A: 3 hours, Pass', 'B: 5 hours, Fail'];
  return <section data-learn-widget-root="duplicates" style={card}><strong>Exact duplicate check</strong><button onClick={() => setRemove(!remove)}>{remove ? 'Restore example' : 'Remove exact duplicate'}</button><ul>{rows.map((row, index) => <li key={`${row}-${index}`}>{row}</li>)}</ul><small>ML-Tutor removes duplicate training rows using the features and target together; it does not deduplicate the held-out test partition.</small></section>;
}
