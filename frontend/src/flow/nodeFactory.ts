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
      color: "#60a5fa",
    },

    Preprocessing: {
      label: "Preprocessing",
      color: "#34d399",
    },

    Model: {
      label: "Model",
      color: "#f59e0b",
    },

    Evaluation: {
      label: "Evaluation",
      color: "#f87171",
    },
  };

  const config =
    nodeConfig[
      nodeType as keyof typeof nodeConfig
    ];

  return {
    id,

    position,

    data: {
      label: config.label,
    },

    style: {
      background: config.color,
      color: "white",
      padding: 10,
      borderRadius: 8,
    },
  };
}