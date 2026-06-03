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
  useState,
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

// import DatasetNode
// from "../nodes/DatasetNode";

// import PreprocessingNode
// from "../nodes/PreprocessingNode";

// import ModelNode
// from "../nodes/ModelNode";

// import EvaluationNode
// from "../nodes/EvaluationNode";

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

  const [reflection, setReflection] = useState("Move blocks to begin analysis.");

  const runMLPipeline = async () => {
    try {
      // 1. Serialize layout (instantly throws an error if there are loops or floating blocks)
      const layout = serializePipeline(nodes, edges);

      // 2. Call your backend pipeline endpoint
      const response = await fetch("http://127.0.0.1:8000/pipeline/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(layout),
      });

      // 3. If backend triggers your global exception handler, response.ok becomes false
      if (!response.ok) {
        throw new Error("Backend pipeline error");
      }

      const data = await response.json();
      setReflection(data.reflection); // Success path: updates with actual string message

    } catch (error) {
      // Catch-all: turning the feedback bar text to exactly "Error"
      console.error("Pipeline run caught error:", error);
      setReflection("Error");
    }
  };

  const [
    reflectionMessage,
    setReflectionMessage,
  ] = useState("");

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
    try {
      // 1. Serialize layout (Will throw error if floating blocks or loops exist)
      const serialized = serializePipeline(nodes, edges);
      console.log("SERIALIZED:", serialized);

      // 2. Call your existing execution service
      // Ensure executePipeline in pipelineExecutor.ts throws an error if response.ok is false
      const result = await executePipeline(serialized);
      console.log("BACKEND RESPONSE:", result);

      // 3. Update the reflection message based on accuracy
      if (result.accuracy >= 0.9) {
        setReflectionMessage("The model performed very well.");
      } else if (result.accuracy >= 0.7) {
        setReflectionMessage("The model performed moderately well.");
      } else {
        setReflectionMessage("The model struggled to learn patterns.");
      }

      // 4. Update the Evaluation Node
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === "evaluationNode") {
            return {
              ...node,
              data: {
                ...node.data,
                accuracy: result.accuracy,
              },
            };
          }
          return node;
        })
      );
    } catch (error) {
      // Catch-all: turning the feedback bar text to exactly "Error"
      console.error("Pipeline run caught error:", error);
      setReflectionMessage("Error");
    }
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

      <div
        style={{
          borderTop:
            "1px solid #ccc",

          padding: "12px",

          background: "#f8f8f8",

          minHeight: "80px",
        }}
      >

        <strong>
          Reflection
        </strong>

        <p style={{
          color: reflectionMessage === "Error" ? "red" : "black",
          fontWeight: reflectionMessage === "Error" ? "bold" : "normal"
        }}>
          {reflectionMessage}
        </p>

      </div>

    </div>
  );
}