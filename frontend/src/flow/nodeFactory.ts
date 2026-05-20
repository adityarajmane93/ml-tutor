import type { Node }
from "reactflow";

export function createNode(
  id: string,
  type: string,
  position: {
    x: number;
    y: number;
  }
): Node {

  const labels: Record<
    string,
    string
  > = {

    datasetNode: "Dataset",

    preprocessingNode:
      "Preprocessing",

    modelNode: "Model",

    evaluationNode:
      "Evaluation",
  };

  const defaultData: Record<
    string,
    any
  > = {

    datasetNode: {
      label: "Dataset",
    },

    preprocessingNode: {
      label: "Preprocessing",
      method:
        "standardScaler",
    },

    modelNode: {
      label: "Model",
      algorithm: "knn",
      k: 5,
    },

    evaluationNode: {
      label: "Evaluation",
    },
  };

  return {
    id,
    type,
    position,

    data:
      defaultData[type],
  };
}