export function sanitizeNodes(
  nodes: any[]
) {

  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

export function sanitizeEdges(
  edges: any[]
) {

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}