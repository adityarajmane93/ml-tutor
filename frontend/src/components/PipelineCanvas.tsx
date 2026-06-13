import {
  ReactFlowProvider,
} from "reactflow";

import PipelineFlow
from "./PipelineFlow";

import SessionTimer
from "./SessionTimer";

export default function PipelineCanvas() {
  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* The timer is safely isolated! */}
        <SessionTimer />
      </div>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>

        <ReactFlowProvider>
          <PipelineFlow />
        </ReactFlowProvider>
        
      </div>
    </div>
  );
}