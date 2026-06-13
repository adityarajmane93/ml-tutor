import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useOnSelectionChange,
  type Node,
  type Edge,
  type Connection,
} from "reactflow";

import {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect,
} from "react";

import "reactflow/dist/style.css";

import {
  initialNodes,
  initialEdges,
} from "../flow/initialElements";

import { createNode }
  from "../flow/nodeFactory";

import { devLog }
  from "../flow/logger"

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

import SAMMbar
  from "./SAMMbar"

import VideoStream
  from "./VideoStream";

import LearnModal
  from "./LearnTab";

import { logEvent }
  from "../services/logger";

import { logPipelineSnapshot }
  from "../services/pipelineSnapshot";

import { createNodeTypes }
  from "../nodes/customNodeTypes";

export default function PipelineFlow() {
  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState<any>(initialNodes);

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState(initialEdges);

  const [
    reflectionMessage,
    setReflectionMessage,
  ] = useState("");

  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

  const [showLearnModal, setShowLearnModal] = useState(false);
  const [learnModalType, setLearnModalType] = useState("");
  const [learnModalOpenTime, setLearnModalOpenTime] = useState<number | null>(null); // NEW STATE
  
  const handleSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
  }, []);
  
  useOnSelectionChange({
    onChange: handleSelectionChange,
  });
  const nodeId = useRef(3);

  // Prevent accidental data loss on refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Standard way to trigger the browser's native confirmation dialog
      event.preventDefault();
      
      // Included for older browser compatibility
      event.returnValue = "Your progress/content will be lost."; 
      return "Your progress/content will be lost.";
    };

    // Listen for the refresh/close action
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup the listener if the component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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

  async function Learn() { 
    const currentTime = Date.now(); 
    let typeToView = "runPipeline"; // Default fallback

    // 1. Determine what is selected
    if (selectedNodes.length > 0 && selectedNodes[0].type) {
      typeToView = selectedNodes[0].type;
    } else if (selectedEdges.length > 0) {
      typeToView = "edge";
    }

    // 2. Set the UI states to open the modal
    setLearnModalType(typeToView);
    setLearnModalOpenTime(currentTime); 
    setShowLearnModal(true);

    // 3. Log the "OPEN" event!
    await logEvent("CLICK_EVENT", "LEARN_MODAL_OPENED", {
      type_viewed: typeToView
    });
  }

  async function openAllNotes() {
    const currentTime = Date.now(); 
    
    setLearnModalType("allNotes");
    setLearnModalOpenTime(currentTime); 
    setShowLearnModal(true);

    await logEvent("CLICK_EVENT", "LEARN_MODAL_OPENED", {
      type_viewed: "allNotes"
    });
  }

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
      // 1. Serialize layout
      const serialized = serializePipeline(nodes, edges);
      devLog("SERIALIZED:", serialized);

      // 2. Open the WebSocket connection
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/run`);
      devLog("Web Socket Opened");
      
      // 3. Send the data when the socket opens
      ws.onopen = () => {
        const payload = typeof serialized === "string" ? serialized : JSON.stringify(serialized);
        ws.send(payload);
        setReflectionMessage("Executing pipeline...");
      };

      // 4. Catch network-level socket errors (e.g., server offline)
      ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setReflectionMessage("Error: Cannot connect to backend.");
      };

      // 5. Handle connection closures
      ws.onclose = (event) => {
        if (!event.wasClean) {
          console.warn("WebSocket disconnected unexpectedly.");
          setReflectionMessage("Connection lost.");
        }
      };

      // 6. When the backend replies
      ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        devLog("BACKEND WS RESPONSE:", result);

        if (result.error) {
          setReflectionMessage("Error");
          ws.close();
          return;
        }

        if (result.accuracy !== undefined) {
          if (result.accuracy >= 0.9) {
            setReflectionMessage("The model performed very well.");
          } else if (result.accuracy >= 0.7) {
            setReflectionMessage("The model performed moderately well.");
          } else {
            setReflectionMessage("The model struggled to learn patterns.");
          }

          setNodes((nds) =>
            nds.map((node) => {
              if (node.type === "evaluationNode") {
                return { ...node, data: { ...node.data, accuracy: result.accuracy } };
              }
              return node;
            })
          );
        } else {
          setReflectionMessage("Execution finished, but no accuracy returned.");
        }
        
        ws.close();
      };

    } catch (error) {
      console.error("Pipeline run caught error:", error);
      setReflectionMessage("Error preparing pipeline.");
    }
  }

  const handleCloseLearnModal = async () => {
    // 1. Calculate duration
    let durationSeconds = 0;
    if (learnModalOpenTime) {
       // (Current Time - Start Time) / 1000 gives us seconds
       durationSeconds = (Date.now() - learnModalOpenTime) / 1000;
    }

    // 2. Log the event to your backend
    await logEvent("CLICK_EVENT", "LEARN_MODAL_CLOSED", {
      type_viewed: learnModalType,
      time_open_seconds: durationSeconds // Store the duration in metadata!
    });
    
    // 3. Reset the UI state
    setShowLearnModal(false);
    setLearnModalOpenTime(null);
  };

  const hasSelection = (selectedNodes.length > 0 && !!selectedNodes[0].type) || selectedEdges.length > 0;
  
  
  let activeSelectionColor = undefined;
  if (selectedNodes.length > 0 && selectedNodes[0].type) {
    const type = selectedNodes[0].type;
    if (type === 'datasetNode') activeSelectionColor = 'var(--secondary)';
    else if (type === 'preprocessingNode') activeSelectionColor = 'var(--warning)';
    else if (type === 'modelNode') activeSelectionColor = 'var(--danger)';
    else if (type === 'evaluationNode') activeSelectionColor = 'var(--success)';
  } else if (selectedEdges.length > 0) {
    activeSelectionColor = 'var(--flow)'; // Purple for edges
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>

      <div style={{ 
        border: "4px solid var(--text)", 
        borderRadius: "0", 
        overflow: "hidden",
        boxShadow: "var(--hard-shadow)",
        backgroundColor: "rgb(255 255 255 / 50%)",
      }}>
        <SAMMbar />
      </div>
      
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 999 }}>
        <button
          onClick={openAllNotes}
          style={{
            padding: "3px 10px", // Slightly tighter padding for the sidebar
            backgroundColor: "#ffffff",
            color: "#ffffff",
            border: "3px solid #000000",
            borderRadius: "8px",
            boxShadow: "4px 4px 0px #000000", // Hard neo-brutalist shadow
            fontWeight: "900",
            fontSize: "1rem", // Scaled down slightly to fit the corner beautifully
            cursor: "pointer",
            transition: "transform 0.1s ease",
            textTransform: "uppercase"
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "translate(4px, 4px)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "none"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
        >
           <span style={{ fontSize: '1.5rem' }} role="img">
          📒
          </span>
        </button>
      </div>

      <VideoStream />
      
      {showLearnModal && (
        <LearnModal 
          selectedType={learnModalType} 
          onClose={handleCloseLearnModal} 
        />
      )}

      <div
        style={{
          width: "100%",
          height: "650px",
          border: "4px solid var(--text)",
          boxShadow: "var(--hard-shadow)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          background: "var(--surface)"
        }}
      >

        <NodeToolbar
          addNewNode={addNewNode}
          Learn={Learn}
          hasSelection={hasSelection}
          runPipeline={runPipeline}
          activeColor={activeSelectionColor}
        />

        <div
          style={{
            padding: "0 16px 12px 16px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={customNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodeDragStop={(_, node) => handleNodeDragStop(node)}
          onNodesDelete={(deletedNodes) => handleNodesDelete(deletedNodes, nodes, edges)}
          onEdgesDelete={(deletedEdges) => handleEdgesDelete(deletedEdges, nodes, edges)}
        >
          <MiniMap style={{ border: "2px solid var(--text)", borderRadius: "0" }} />
          <Controls style={{ border: "2px solid var(--text)", borderRadius: "0", overflow: "hidden" }} />
          <Background color="var(--text)" gap={20} />
        </ReactFlow>

        <div
          style={{
            borderTop: "4px solid var(--text)",
            padding: "16px",
            background: "var(--primary)", /* Yellow background for high contrast footer */
            minHeight: "70px",
            color: "var(--text)"
          }}
        >
          <strong style={{ fontSize: "1.2rem", textTransform: "uppercase" }}>
            Reflection
          </strong>

          <p style={{
            color: reflectionMessage === "Error" ? "var(--danger)" : "var(--text)",
            fontWeight: 800,
            marginTop: "8px",
            fontFamily: "var(--mono)",
            fontSize: "1.1rem"
          }}>
            {reflectionMessage ? `> ${reflectionMessage}` : "> Awaiting execution..."}
          </p>

        </div>
      </div>
    </div>
  );
}