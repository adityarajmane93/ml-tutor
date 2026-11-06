export type Aoi = { type: string; id: string | null };

/** Uses current DOM hit testing, so moved/zoomed React Flow nodes need no static map. */
export function classifyAoi(x: number, y: number): Aoi {
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return { type: "outside", id: null };
  const target = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!target) return { type: "unknown", id: null };
  const explicit = target.closest<HTMLElement>("[data-aoi-type]");
  if (explicit) return { type: explicit.dataset.aoiType ?? "unknown", id: explicit.dataset.aoiId ?? null };
  const node = target.closest<HTMLElement>(".react-flow__node");
  if (node) {
    const className = node.className;
    const type = className.includes("datasetNode") ? "dataset_node" : className.includes("preprocessingNode") ? "preprocessing_node" : className.includes("modelNode") ? "model_node" : className.includes("evaluationNode") ? "evaluation_node" : "workflow_node";
    return { type, id: node.dataset.id ?? null };
  }
  if (target.closest(".react-flow")) return { type: "workspace_background", id: null };
  return { type: "unknown", id: null };
}

export function summarizeErrors(errors: number[]): { median: number | null; mean: number | null } {
  if (!errors.length) return { median: null, mean: null };
  const sorted = [...errors].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, mean: errors.reduce((sum, error) => sum + error, 0) / errors.length };
}
