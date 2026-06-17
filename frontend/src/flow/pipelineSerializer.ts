import { type Edge, type Node } from "reactflow";

export function serializePipeline(nodes: Node[], edges: Edge[]) {
  // --- VALIDATION 1: Empty Sandbox ---
  if (nodes.length === 0) {
    throw new Error("No nodes present in the workspace.");
  }

  const adjacency: Record<string, string[]> = {};
  edges.forEach((edge) => {
    if (!adjacency[edge.source]) {
      adjacency[edge.source] = [];
    }
    adjacency[edge.source].push(edge.target);
  });

  const incomingCount: Record<string, number> = {};
  nodes.forEach((node) => {
    incomingCount[node.id] = 0;
  });

  edges.forEach((edge) => {
    // Safety check for malformed edges
    if (incomingCount[edge.target] !== undefined) {
      incomingCount[edge.target] += 1;
    }
  });

  // --- VALIDATION 2: Floating/Disconnected Blocks ---
  // If you have multiple blocks, ensure every single block is attached to at least one edge.
  if (nodes.length > 1) {
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    if (connectedNodeIds.size < nodes.length) {
      throw new Error("Invalid flow: One or more blocks are floating unconnected.");
    }
  }

  const queue = nodes
    .filter((node) => incomingCount[node.id] === 0)
    .map((node) => node.id);

  const executionOrder: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    executionOrder.push(current);

    const neighbors = adjacency[current] || [];
    neighbors.forEach((neighbor) => {
      incomingCount[neighbor] -= 1;
      if (incomingCount[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // --- VALIDATION 3: Cycle/Loop Detection ---
  // If there's a loop (e.g., A -> B -> A), Kahn's algorithm cannot visit every node.
  if (executionOrder.length < nodes.length) {
    throw new Error("Invalid flow: Feedback loop detected in the pipeline.");
  }

  const orderedPipeline = executionOrder.map((id) =>
    nodes.find((node) => node.id === id)
  );

  return {
    adjacency,
    executionOrder,
    orderedPipeline,
  };
}