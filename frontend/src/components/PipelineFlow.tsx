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

import { AllNotesButton } 
  from "./LearnTab";

import SessionTimer 
  from "./SessionTimer";

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
  ] = useNodesState<Node>(initialNodes);

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
    let typeToView = "notesInfo"; // Default fallback

    // Determine what is selected
    if (selectedNodes.length > 0 && selectedNodes[0].type) {
      typeToView = selectedNodes[0].type;
    } else if (selectedEdges.length > 0) {
      typeToView = "edge";
    }

    // Set the UI states to open the modal
    setLearnModalType(typeToView);
    setLearnModalOpenTime(currentTime); 
    setShowLearnModal(true);

    // Log the "OPEN" event!
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
      newData: Record<string, unknown>
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
      // Serialize layout
      const serialized = serializePipeline(nodes, edges);
      devLog("SERIALIZED:", serialized);

      // Open the WebSocket connection
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/run`);
      devLog("Web Socket Opened");
      
      // Send the data when the socket opens
      ws.onopen = () => {
        const payload = typeof serialized === "string" ? serialized : JSON.stringify(serialized);
        ws.send(payload);
        setReflectionMessage("Executing pipeline...");
      };

      // Catch network-level socket errors (e.g., server offline)
      ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setReflectionMessage("Error: Cannot connect to backend.");
      };

      // Handle connection closures
      ws.onclose = (event) => {
        if (!event.wasClean) {
          console.warn("WebSocket disconnected unexpectedly.");
          setReflectionMessage("Connection lost.");
        }
      };

      // When the backend replies
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
      setReflectionMessage("Error");
    }
  }

  const handleCloseLearnModal = async () => {
    // Calculate duration
    let durationSeconds = 0;
    if (learnModalOpenTime) {
       // (Current Time - Start Time) / 1000 gives us seconds
       durationSeconds = (Date.now() - learnModalOpenTime) / 1000;
    }

    // Log the event to your backend
    await logEvent("CLICK_EVENT", "LEARN_MODAL_CLOSED", {
      type_viewed: learnModalType,
      time_open_seconds: durationSeconds // Store the duration in metadata!
    });
    
    // Reset the UI state
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
    <div style={{ display: "flex", flexDirection: "row", gap: "24px", paddingBottom: "40px", height: "70vh", minHeight: "600px",minWidth: "1300px"  }}>

      <VideoStream />
      
      {showLearnModal && (
        <LearnModal 
          selectedType={learnModalType} 
          onClose={handleCloseLearnModal} 
        />
      )}

      {/* ========================================= */}
      {/* LEFT COLUMN: CANVAS & TOOLBAR             */}
      {/* ========================================= */}
      <div style={{ 
        flex: 1, // Ensures the whole canvas area stretches to fill the screen
        display: "flex", 
        justifyContent: "flex-end",
        flexDirection: "row", 
        minWidth: '900px',
        gap: "16px", 
        position: "relative" 
      }}>

        <div
          style={{
            flex: 1, 
            border: "4px solid var(--text)",
            boxShadow: "var(--hard-shadow)",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            background: "var(--surface)",
            position: "relative" 
          }}
        >
          <NodeToolbar
            addNewNode={addNewNode}
            Learn={Learn}
            hasSelection={hasSelection}
            runPipeline={runPipeline}
            activeColor={activeSelectionColor}
          />

          {/* ReactFlow must be wrapped in a flex: 1 div to expand correctly */}
          <div style={{ flex: 1, position: "relative" }}>
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
          </div>
        </div>
      </div>
      
      {/* ========================================= */}
      {/* RIGHT COLUMN: SAMM & REFLECTION           */}
      {/* ========================================= */}
      <div
        style={{
          width: "350px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          minWidth: "400px" 
        }}
      >
        {/* --- TOP ROW: SAMM Tracker + Buttons Stack --- */}
        
          {/* Timer & Notes sitting right on top of SAMM --- */}
          <div style={{ 
            display: "flex", 
            justifyContent: "flex-end", // Pushes them nicely to the right corner
            gap: "12px", 
            zIndex: 100,
            marginTop: "-65px"
          }}>
            <SessionTimer />
            <AllNotesButton onClick={openAllNotes} />
          </div>
          {/* LEFT: SAMM Tracker */}
          <div style={{ 
            flex: 1, // Takes up the remaining space
            border: "4px solid var(--text)", 
            borderRadius: "0", 
            overflow: "hidden",
            boxShadow: "var(--hard-shadow)",
            backgroundColor: "#ffffff",
            padding: "5px",
            minWidth: '400px',
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: 'center'
          }}>
            <SAMMbar direction="column"/>
          </div>

        {/* BOTTOM BOX: Reflection Panel */}
        <div
          style={{
            border: "4px solid var(--text)",
            boxShadow: "var(--hard-shadow)",
            padding: "24px",
            background: "var(--primary)", 
            flex: 1, // Fills the remaining vertical space
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minWidth: '360px',
            color: "var(--text)"
          }}
        > 
          <strong style={{ fontSize: "1.2rem", textTransform: "uppercase" }}>
            Reflection
          </strong>

          <p style={{
            color: reflectionMessage === "Error" ? "var(--danger)" : "var(--text)",
            fontWeight: 800,
            marginTop: "12px",
            fontFamily: "var(--mono)",
            fontSize: "1.1rem",
            textAlign: "center"
          }}>
            {reflectionMessage ? `> ${reflectionMessage}` : "> Awaiting execution..."}
          </p>
        </div>

      </div>
      
    </div>
  );
}