const NON_SEMANTIC_NODE_DATA_KEYS = new Set([
  "dataset",
  "columns",
  "filename",
  "datasetSummary",
]);

export type NodeConfigChange = {
  parameter: string;
  previous_value: unknown;
  new_value: unknown;
};

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

/**
 * Produces one compact, grouped configuration delta for a node update. Raw
 * dataset payloads and derived file metadata remain in pipeline snapshots,
 * not semantic interaction events.
 */
export function getNodeConfigChanges(
  previousData: Record<string, unknown>,
  nextData: Record<string, unknown>,
): NodeConfigChange[] {
  return Object.entries(nextData)
    .filter(([parameter]) => !NON_SEMANTIC_NODE_DATA_KEYS.has(parameter))
    .filter(([parameter, nextValue]) => !valuesEqual(previousData[parameter], nextValue))
    .map(([parameter, nextValue]) => ({
      parameter,
      previous_value: previousData[parameter] ?? null,
      new_value: nextValue ?? null,
    }));
}
