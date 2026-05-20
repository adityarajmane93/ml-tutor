import DatasetNode from "./DatasetNode";
import PreprocessingNode from "./PreprocessingNode";
import ModelNode from "./ModelNode";
import EvaluationNode from "./EvaluationNode";

export const nodeTypes = {
  datasetNode: DatasetNode,

  preprocessingNode:
    PreprocessingNode,

  modelNode: ModelNode,

  evaluationNode:
    EvaluationNode,
};