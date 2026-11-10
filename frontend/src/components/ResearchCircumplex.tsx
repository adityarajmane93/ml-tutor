import { useMemo, useState } from "react";
import { AFFECT_CENTROIDS, euclideanDistance } from "../services/researchTimeline";

type Observation = { valence: number; arousal: number } | null;

type HoveredPoint = {
  source: "Reference" | "HSEmotion" | "SAMM";
  name?: string;
  valence: number;
  arousal: number;
};

const SIZE = 520;
const CENTER = SIZE / 2;
const RADIUS = 190;

function coordinate(value: number): number {
  return CENTER + value * RADIUS;
}

function coordinateY(value: number): number {
  return CENTER - value * RADIUS;
}

function nearestReference(point: { valence: number; arousal: number }) {
  return AFFECT_CENTROIDS
    .map((centroid) => ({ ...centroid, distance: euclideanDistance(point.valence, point.arousal, centroid) }))
    .sort((left, right) => left.distance - right.distance)[0];
}

export default function ResearchCircumplex({
  hseObservation,
  sammObservation,
  radius,
  onRadiusChange,
}: {
  hseObservation: Observation;
  sammObservation: Observation;
  radius: number;
  onRadiusChange: (radius: number) => void;
}) {
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);
  const withinRadius = useMemo(() => {
    const observation = hseObservation ?? sammObservation;
    if (!observation) return [];
    return AFFECT_CENTROIDS
      .map((centroid) => ({ ...centroid, distance: euclideanDistance(observation.valence, observation.arousal, centroid) }))
      .filter((centroid) => centroid.distance <= radius);
  }, [hseObservation, radius, sammObservation]);
  const nearest = hovered && hovered.source !== "Reference" ? nearestReference(hovered) : null;

  const pointHandlers = (point: HoveredPoint) => ({
    onMouseEnter: () => setHovered(point),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(point),
    onBlur: () => setHovered(null),
  });

  return <section style={{ border: "2px solid var(--text)", background: "#fff", padding: 16 }}>
    <h2>Learning-centered affect circumplex</h2>
    <p>Reference centroids are exploratory conceptual placements, not emotion classifications or confidence estimates.</p>
    <label>Conceptual proximity radius <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}>{[0.05, 0.1, 0.15].map((value) => <option value={value} key={value}>{value.toFixed(2)}</option>)}</select></label>
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Valence and arousal circumplex" style={{ display: "block", width: "min(100%, 540px)", height: "auto", margin: "12px auto" }}>
      <rect x="0" y="0" width={SIZE} height={SIZE} fill="#fff" />
      {[-1, -0.5, 0, 0.5, 1].map((value) => <g key={`grid-${value}`}>
        <line x1={coordinate(value)} x2={coordinate(value)} y1={CENTER - RADIUS} y2={CENTER + RADIUS} stroke={value === 0 ? "#111827" : "#e5e7eb"} strokeWidth={value === 0 ? 2.5 : 1} />
        <line y1={coordinateY(value)} y2={coordinateY(value)} x1={CENTER - RADIUS} x2={CENTER + RADIUS} stroke={value === 0 ? "#111827" : "#e5e7eb"} strokeWidth={value === 0 ? 2.5 : 1} />
        <text x={coordinate(value)} y={CENTER + RADIUS + 20} textAnchor="middle" fontSize="12">{value}</text>
        <text x={CENTER - RADIUS - 12} y={coordinateY(value) + 4} textAnchor="end" fontSize="12">{value}</text>
      </g>)}
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#111827" strokeWidth="2" />
      <text x={CENTER} y={SIZE - 10} textAnchor="middle" fontSize="14" fontWeight="600">Valence</text>
      <text x="16" y={CENTER} textAnchor="middle" fontSize="14" fontWeight="600" transform={`rotate(-90 16 ${CENTER})`}>Arousal</text>
      {AFFECT_CENTROIDS.map((centroid) => <circle key={centroid.name} cx={coordinate(centroid.valence)} cy={coordinateY(centroid.arousal)} r="5" fill="#6b7280" tabIndex={0} aria-label={`${centroid.name}: valence ${centroid.valence}, arousal ${centroid.arousal}`} {...pointHandlers({ source: "Reference", name: centroid.name, valence: centroid.valence, arousal: centroid.arousal })} />)}
      {hseObservation && <circle cx={coordinate(hseObservation.valence)} cy={coordinateY(hseObservation.arousal)} r="7" fill="#dc2626" tabIndex={0} aria-label={`HSEmotion: valence ${hseObservation.valence}, arousal ${hseObservation.arousal}`} {...pointHandlers({ source: "HSEmotion", ...hseObservation })} />}
      {sammObservation && <rect x={coordinate(sammObservation.valence) - 6} y={coordinateY(sammObservation.arousal) - 6} width="12" height="12" fill="#0891b2" transform={`rotate(45 ${coordinate(sammObservation.valence)} ${coordinateY(sammObservation.arousal)})`} tabIndex={0} aria-label={`SAMM: valence ${sammObservation.valence}, arousal ${sammObservation.arousal}`} {...pointHandlers({ source: "SAMM", ...sammObservation })} />}
    </svg>
    {hovered ? <p role="status"><strong>{hovered.source === "Reference" ? `Reference: ${hovered.name}` : hovered.source}</strong> · Valence {hovered.valence.toFixed(2)}, Arousal {hovered.arousal.toFixed(2)}{nearest ? <> · Nearest conceptual reference: {nearest.name} ({nearest.distance.toFixed(3)})</> : null}</p> : <p>Hover or focus a point to inspect its recorded coordinates.</p>}
    <p>Within selected radius: {withinRadius.length ? withinRadius.map((item) => `${item.name} (${item.distance.toFixed(3)})`).join(", ") : "none"}</p>
    <details><summary>Reference centroid coordinates</summary><ul>{AFFECT_CENTROIDS.map((item) => <li key={item.name}>{item.name}: ({item.valence.toFixed(2)}, {item.arousal.toFixed(2)})</li>)}</ul></details>
  </section>;
}
