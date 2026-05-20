import DatasetNode
from "./DatasetNode";

import PreprocessingNode
from "./PreprocessingNode";

import ModelNode
from "./ModelNode";

import EvaluationNode
from "./EvaluationNode";

export function createNodeTypes(
  updateNodeData: any
) {

  return {

    datasetNode: (
      props: any
    ) => (
      <DatasetNode
        {...props}
        updateNodeData={
          updateNodeData
        }
      />
    ),

    preprocessingNode: (
      props: any
    ) => (
      <PreprocessingNode
        {...props}
        updateNodeData={
          updateNodeData
        }
      />
    ),

    modelNode: (
      props: any
    ) => (
      <ModelNode
        {...props}
        updateNodeData={
          updateNodeData
        }
      />
    ),

    evaluationNode: (
      props: any
    ) => (
      <EvaluationNode
        {...props}
        updateNodeData={
          updateNodeData
        }
      />
    ),
  };
}