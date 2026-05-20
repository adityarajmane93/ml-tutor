export function createNode(
  id: string,
  nodeType: string,
  position: {
    x: number;
    y: number;
  }
) {

  const nodeConfig = {

    Dataset: {
      label: "Dataset",
      reactFlowType:
        "datasetNode",
    },

    Preprocessing: {
      label: "Preprocessing",
      reactFlowType:
        "preprocessingNode",
    },

    Model: {
      label: "Model",
      reactFlowType:
        "modelNode",
    },

    Evaluation: {
      label: "Evaluation",
      reactFlowType:
        "evaluationNode",
    },
  };

  const config =
    nodeConfig[
      nodeType as keyof typeof nodeConfig
    ];

  return {
    id,

    type:
      config.reactFlowType,

    position,

    data: {
      label: config.label,
    },
  };
}