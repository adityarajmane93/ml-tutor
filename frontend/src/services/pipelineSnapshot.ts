import { logEvent }
from "./logger";

import {
  sanitizeNodes,
  sanitizeEdges,
} from "../flow/snapshotUtils";

export async function logPipelineSnapshot(
  nodes: any[],
  edges: any[]
) {

  await logEvent(
    "PIPELINE_EVENT",
    "PIPELINE_STATE_UPDATED",
    {
      nodes: sanitizeNodes(nodes),
      edges: sanitizeEdges(edges),
    }
  );
}