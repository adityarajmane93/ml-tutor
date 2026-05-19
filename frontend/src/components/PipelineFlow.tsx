import {
  ReactFlow,

  Background,
  Controls,
  MiniMap,

  useNodesState,
  useEdgesState,

  addEdge,

  type Connection,
} from "reactflow";

import {
  useCallback,
  useRef,
} from "react";

import "reactflow/dist/style.css";

import { logEvent }
from "../services/logger";

import {
  initialNodes,
  initialEdges,
} from "../flow/initialElements";

import { createNode }
from "../flow/nodeFactory";

import NodeToolbar
from "./NodeToolbar";

export default function PipelineFlow() {

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

  const nodeId = useRef(3);

  const onConnect = useCallback(
    async (params: Connection) => {

      const edgeExists =
        edges.some(
          (edge) =>
            (
              edge.source ===
              params.source &&

              edge.target ===
              params.target
            ) ||

            (
              edge.source ===
              params.target &&

              edge.target ===
              params.source
            )
        );

      if (edgeExists) {

        alert(
          "These nodes are already connected."
        );

        return;
      }

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

    [edges, setEdges]
  );

  function addNewNode(
    nodeType: string
  ) {

    const id =
      String(nodeId.current);

    nodeId.current += 1;

    const offset =
      nodeId.current * 40;

    const newNode = createNode(
      id,
      nodeType,
      {
        x: 200 + offset,
        y: 200 + offset,
      }
    );

    setNodes((nds) => [
      ...nds,
      newNode,
    ]);

    logEvent(
      "PIPELINE_EVENT",
      "NODE_CREATED",
      {
        nodeId: id,
        nodeType,
      }
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid #ccc",
      }}
    >

      <NodeToolbar
        addNewNode={addNewNode}
      />

      <ReactFlow
        nodes={nodes}

        edges={edges}

        onNodesChange={onNodesChange}

        onNodeDragStop={(
          _,
          node
        ) => {

          logEvent(
            "PIPELINE_EVENT",
            "NODE_DRAGGED",
            {
              nodeId: node.id,

              finalPosition:
                node.position,
            }
          );
        }}

        onNodesDelete={(
          deletedNodes
        ) => {

          deletedNodes.forEach(
            (node) => {

              logEvent(
                "PIPELINE_EVENT",
                "NODE_DELETED",
                {
                  nodeId:
                    node.id,
                }
              );
            }
          );
        }}

        onEdgesChange={
          onEdgesChange
        }

        onConnect={onConnect}

        deleteKeyCode={[
          "Backspace",
          "Delete",
        ]}
      >

        <MiniMap />

        <Controls />

        <Background />

      </ReactFlow>

    </div>
  );
}