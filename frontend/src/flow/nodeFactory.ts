import type { Node } from "reactflow";

export function createNode(
  id: string,
  type: string,
  position: {
    x: number;
    y: number;
  }
): Node {

  // We store all default data payloads based on the incoming React Flow node type
  const defaultData: Record<string, any> = {
    datasetNode: {
      label: "Dataset",
      testSize: "30",
    },
    preprocessingNode: {
      label: "Preprocessing",
      method: "fillMissingValues", // Matches the first visible option in your HTML <select>
      strategy: "average",         // The "strategy" dropdown renders immediately
    },
    modelNode: {
      label: "Model",
      algorithm: "knn",
      k: 3,                      
    },
    evaluationNode: {
      label: "Evaluation",
    },
  };

  return {
    id,
    type,
    position,
    // Safely assign the data, with a generic fallback if an unknown type is passed
    data: defaultData[type] || { label: "Unknown Node" },
  };
}