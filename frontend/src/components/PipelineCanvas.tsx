import {
  ReactFlowProvider,
} from "reactflow";

import PipelineFlow
from "./PipelineFlow";

export default function PipelineCanvas() {

  return (
    <ReactFlowProvider>

      <PipelineFlow />

    </ReactFlowProvider>
  );
}