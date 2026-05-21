import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
} from "reactflow";

import {
  useCallback,
  useRef,
  useMemo,
} from "react";

import "reactflow/dist/style.css";

import {
  initialNodes,
  initialEdges,
} from "../flow/initialElements";

import { createNode }
from "../flow/nodeFactory";

import {
  handleConnect,
  handleNodeDragStop,
  handleNodesDelete,
  handleEdgesDelete,
} from "../flow/flowHandlers";

import { serializePipeline }
from "../flow/pipelineSerializer";

import NodeToolbar
from "./NodeToolbar";

import DatasetNode
from "../nodes/DatasetNode";

import PreprocessingNode
from "../nodes/PreprocessingNode";

import ModelNode
from "../nodes/ModelNode";

import EvaluationNode
from "../nodes/EvaluationNode";

import { logEvent }
from "../services/logger";

import { logPipelineSnapshot }
from "../services/pipelineSnapshot";

import { executePipeline }
from "../services/pipelineExecutor";

import { createNodeTypes }
from "../nodes/customNodeTypes";

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

      await handleConnect(
        params,
        edges,
        nodes,
        setEdges
      );
    },

    [edges, nodes, setEdges]
  );

  async function addNewNode(
    nodeType: string
  ) {

    const id =
      String(nodeId.current);

    nodeId.current += 1;

const lastNode =
  nodes[
    nodes.length - 1
  ];

const newPosition =
  lastNode
    ? {
        x:
          lastNode.position.x
          + 250,

        y:
          lastNode.position.y
          + 50,
      }

    : {
        x: 200,
        y: 200,
      };

const newNode =
  createNode(
    id,
    nodeType,
    newPosition
  );
    const updatedNodes = [
      ...nodes,
      newNode,
    ];

    setNodes(updatedNodes);

    await logEvent(
      "PIPELINE_EVENT",
      "NODE_CREATED",
      {
        nodeId: id,
        nodeType,
      }
    );

    await logPipelineSnapshot(
      updatedNodes,
      edges
    );
  }

  function testSerialization() {

    console.log(
      serializePipeline(
        nodes,
        edges
      )
    );
  }

  // const updateNodeData =
  //   useCallback((
  //     nodeId: string,
  //     newData: any
  //   ) => {

  //     setNodes((nds) =>
  //       nds.map((node) => {

  //         if (
  //           node.id === nodeId
  //         ) {

  //           return {
  //             ...node,

  //             data: {
  //               ...node.data,
  //               ...newData,
  //             },
  //           };
  //         }

  //         return node;
  //       })
  //     );

  //   }, [setNodes]);

const updateNodeData =
  useCallback((
    nodeId: string,
    newData: any
  ) => {

    setNodes((nds) => {

      const updatedNodes =
        nds.map((node) => {

          if (
            node.id === nodeId
          ) {

            return {
              ...node,

              data: {
                ...node.data,
                ...newData,
              },
            };
          }

          return node;
        });

      logPipelineSnapshot(
        updatedNodes,
        edges
      );

      return updatedNodes;
    });

  }, [edges, setNodes]);

const customNodeTypes =
  useMemo(
    () =>
      createNodeTypes(
        updateNodeData
      ),

    [updateNodeData]
  );

  async function runPipeline() {

    const serialized =
      serializePipeline(
        nodes,
        edges
      );

    console.log(
      "SERIALIZED:",
      serialized
    );

    const result =
      await executePipeline(
        serialized
      );

    console.log(
      "BACKEND RESPONSE:",
      result
    );

    setNodes((nds) =>
  nds.map((node) => {

    if (
      node.type ===
      "evaluationNode"
    ) {

      return {
        ...node,

        data: {
          ...node.data,

          accuracy:
            result.accuracy,
        },
      };
    }

    return node;
  })
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

      <button
        onClick={testSerialization}
      >
        Test Serializer
      </button>

      <button
        onClick={runPipeline}
      >
        Run Pipeline
      </button>

      <ReactFlow
        nodes={nodes}

        edges={edges}

        nodeTypes={
          customNodeTypes
        }

        onNodesChange={
          onNodesChange
        }

        onEdgesChange={
          onEdgesChange
        }

        onConnect={onConnect}

        deleteKeyCode={[
          "Backspace",
          "Delete",
        ]}

        onNodeDragStop={(
          _,
          node
        ) =>
          handleNodeDragStop(node)
        }

        onNodesDelete={(
          deletedNodes
        ) =>
          handleNodesDelete(
            deletedNodes,
            nodes,
            edges
          )
        }

        onEdgesDelete={(
          deletedEdges
        ) =>
          handleEdgesDelete(
            deletedEdges,
            nodes,
            edges
          )
        }
      >

        <MiniMap />

        <Controls />

        <Background />

      </ReactFlow>

    </div>
  );
}