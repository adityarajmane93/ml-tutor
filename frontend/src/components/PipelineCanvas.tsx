import {
  ReactFlow,

  Background,
  Controls,
  MiniMap,

  useNodesState,
  useEdgesState,

  addEdge,

  ReactFlowProvider,

  type Connection,
} from "reactflow";

import { useCallback } from "react";

import "reactflow/dist/style.css";

import { logEvent } from "../services/logger";

const initialNodes = [
  {
    id: "1",

    position: {
      x: 100,
      y: 100,
    },

    data: {
      label: "Dataset Loader",
    },
  },

  {
    id: "2",

    position: {
      x: 400,
      y: 100,
    },

    data: {
      label: "KNN Classifier",
    },
  },
];

const initialEdges = [];

export default function PipelineCanvas() {

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState(initialNodes);

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState(initialEdges);

const onConnect = useCallback(
  async (params: Connection) => {

    setEdges((eds) =>
      addEdge(params, eds)
    );

    await logEvent(
      "PIPELINE_EVENT",
      "EDGE_CREATED",
      {
        source: params.source,
        target: params.target,
      }
    );
  },

  [setEdges]
);
  return (
    <ReactFlowProvider>

      <div
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid #ccc",
        }}
      >

        <ReactFlow
          nodes={nodes}

          edges={edges}

          onNodesChange={(changes) => {

  onNodesChange(changes);

  logEvent(
    "PIPELINE_EVENT",
    "NODE_CHANGED",
    {
      changes,
    }
  );
}}

          onEdgesChange={onEdgesChange}

          onConnect={onConnect}

          fitView
        >

          <MiniMap />

          <Controls />

          <Background />

        </ReactFlow>

      </div>

    </ReactFlowProvider>
  );
}