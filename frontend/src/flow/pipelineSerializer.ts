import {
  type Edge,
  type Node,
} from "reactflow";

export function serializePipeline(
  nodes: Node[],
  edges: Edge[]
) {

  const adjacency: Record<
    string,
    string[]
  > = {};

  edges.forEach((edge) => {

    if (!adjacency[edge.source]) {
      adjacency[edge.source] = [];
    }

    adjacency[edge.source].push(
      edge.target
    );
  });

  const incomingCount: Record<
    string,
    number
  > = {};

  nodes.forEach((node) => {
    incomingCount[node.id] = 0;
  });

  edges.forEach((edge) => {
    incomingCount[edge.target] += 1;
  });

  const queue =
    nodes
      .filter(
        (node) =>
          incomingCount[node.id] === 0
      )
      .map((node) => node.id);

  const executionOrder: string[] = [];

  while (queue.length > 0) {

    const current =
      queue.shift()!;

    executionOrder.push(current);

    const neighbors =
      adjacency[current] || [];

    neighbors.forEach((neighbor) => {

      incomingCount[neighbor] -= 1;

      if (
        incomingCount[neighbor] === 0
      ) {
        queue.push(neighbor);
      }
    });
  }

  const orderedPipeline =
    executionOrder.map((id) =>
      nodes.find(
        (node) => node.id === id
      )
    );

  return {
    adjacency,
    executionOrder,
    orderedPipeline,
  };
}