import {
  type Connection,
  type Edge,
  type Node,
} from "reactflow";

import { logEvent }
from "../services/logger";

import { logPipelineSnapshot }
from "../services/pipelineSnapshot";

import {
  edgeAlreadyExists,
  createUpdatedEdges,
} from "./edgeUtils";

export async function handleConnect(
  params: Connection,
  edges: Edge[],
  nodes: Node[],
  setEdges: any
) {

  const exists =
    edgeAlreadyExists(
      edges,
      params
    );

  if (exists) {
    return;
  }

  const updatedEdges =
    createUpdatedEdges(
      edges,
      params
    );

  setEdges(updatedEdges);

  await logEvent(
    "PIPELINE_EVENT",
    "EDGE_CREATED",
    {
      source: params.source,
      target: params.target,
    }
  );

  await logPipelineSnapshot(
    nodes,
    updatedEdges
  );
}

export async function handleNodeDragStop(
  node: Node
) {

  await logEvent(
    "PIPELINE_EVENT",
    "NODE_DRAGGED",
    {
      nodeId: node.id,
      finalPosition:
        node.position,
    }
  );
}

export async function handleNodesDelete(
  deletedNodes: Node[],
  nodes: Node[],
  edges: Edge[]
) {

  deletedNodes.forEach(
    (node) => {

      logEvent(
        "PIPELINE_EVENT",
        "NODE_DELETED",
        {
          nodeId: node.id,
        }
      );
    }
  );

  const remainingNodes =
    nodes.filter(
      (n) =>
        !deletedNodes.some(
          (d) => d.id === n.id
        )
    );

  const remainingEdges =
    edges.filter(
      (edge) =>
        !deletedNodes.some(
          (node) =>
            edge.source === node.id ||
            edge.target === node.id
        )
    );

  await logPipelineSnapshot(
    remainingNodes,
    remainingEdges
  );
}

export async function handleEdgesDelete(
  deletedEdges: Edge[],
  nodes: Node[],
  edges: Edge[]
) {

  deletedEdges.forEach(
    (edge) => {

      logEvent(
        "PIPELINE_EVENT",
        "EDGE_DELETED",
        {
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
        }
      );
    }
  );

  const remainingEdges =
    edges.filter(
      (e) =>
        !deletedEdges.some(
          (d) => d.id === e.id
        )
    );

  await logPipelineSnapshot(
    nodes,
    remainingEdges
  );
}