import {
  addEdge,
  type Connection,
  type Edge,
} from "reactflow";

export function edgeAlreadyExists(
  edges: Edge[],
  params: Connection
) {

  return edges.some(
    (edge) =>
      (
        edge.source === params.source &&
        edge.target === params.target
      ) ||

      (
        edge.source === params.target &&
        edge.target === params.source
      )
  );
}

export function createUpdatedEdges(
  edges: Edge[],
  params: Connection
) {

  return addEdge(
    params,
    edges
  );
}