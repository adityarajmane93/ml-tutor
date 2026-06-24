import { ReactFlowProvider } from "reactflow";
import PipelineFlow from "./PipelineFlow";

export default function PipelineCanvas() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <PipelineFlow />
      </ReactFlowProvider>
    </div>
  );
}