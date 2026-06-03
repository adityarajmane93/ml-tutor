import {
  addEdge,
  MarkerType,
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
    {
      ...params,
      style: {
        strokeWidth: 2,   
        stroke: '#080808',   
      },
      // 2. Style the Arrowhead
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,        // Makes the arrow head wider
        height: 15,       // Makes the arrow head taller
        color: '#080808',    
      },
    },
    edges
  );
}