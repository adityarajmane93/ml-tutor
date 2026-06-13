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
      className: 'custom-edge', // class name we can target in CSS
      style: {
        strokeWidth: 3,   
        stroke: '#080808', // Force the base line to be black
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,        
        height: 15,       
        color: '#080808',
      },
    },
    edges
  );
}