export const initialNodes = [
  {
    id: "1",
    type: "datasetNode",
    position: {
      x: 100,
      y: 100,
    },
    data: {
      label: "Dataset",
    },
  },
  {
    id: "2",
    type: "modelNode",
    position: {
      x: 400,
      y: 100,
    },
    data: {
      label: "Model",
      algorithm: "knn", // FIXED: Syncs the initial visual state
      k: 3,             // FIXED: Provides the default K value
    },
  },
];

export const initialEdges = [];