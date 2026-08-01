import { useState } from "react";
import { Handle, Position } from "reactflow";
import { useReactFlow } from 'reactflow';
import { logEvent } from "../services/logger";

export default function EvaluationNode({
  id, data, selected,
}: any) {

  const [selectedMetric, setSelectedMetric] = useState("accuracy");

  const { deleteElements } = useReactFlow();
  
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevents the click from accidentally dragging/selecting the node
      deleteElements({ nodes: [{ id }] }); // Triggers your existing deletion logic!
    };
  
  const metrics = {
    accuracy: {
      label: "Accuracy",
      value: data?.accuracy,
      percentage: true,
    },
    precision: {
      label: "Precision",
      value: data?.precision,
      percentage: false,
    },
    recall: {
      label: "Recall",
      value: data?.recall,
      percentage: false,
    },
    F1: {
      label: "F1 Score",
      value: data?.F1,
      percentage: false,
    },
  };
  const currentMetric = metrics[selectedMetric as keyof typeof metrics];
  return (
    <div
      style={{
        background: "var(--success)",
        color: "var(--surface)",
        padding: "8px 10px", // Slimmer padding
        minWidth: "150px",    // Slimmer width
        overflow: "hidden",
        textAlign: "center",
        fontWeight: 800,
        borderRadius: "0",
        border: selected ? "1px solid var(--primary)" : "1px solid var(--text)",
      }}
    >
      <button className="neo-delete-btn" style={{background: "var(--success)"}} onClick={handleDelete} title="Delete Node">
        X
      </button>
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
     
      <div style={{ fontSize: "0.95rem", textTransform: "uppercase", marginBottom: "4px" }}>
        {data.label}
      </div>

      <div style={{ 
        background: "var(--surface)", 
        color: "var(--text)", 
        padding: "4px 6px", 
        border: "2px solid var(--text)",
        boxShadow: "2px 2px 0px 0px var(--text)",
        fontSize: "0.85rem"
      }}>
        <select
          className="nodrag"
          value={selectedMetric}
          onChange={(e) => {
            const metric = e.target.value;

            setSelectedMetric(metric);

            logEvent(
              "evaluation",
              "metric_selected",
              {
                  node_id: id,
                  metric: metric,
                  value: data?.[metric],
                  algorithm: data?.algorithm,
              }
            );
          }}
          style={{
            width: "100%",
            marginBottom: "10px",
            padding: "4px",
            fontWeight: 600,
            height: "30px",
            cursor: "pointer",
          }}
        >
          <option value="accuracy">Accuracy</option>
          <option value="precision">Precision</option>
          <option value="recall">Recall</option>
          <option value="F1">F1 Score</option>
        </select>

        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            color: "var(--success)",
          }}
        >
          {currentMetric.value != null
            ? currentMetric.percentage
              ? `${Math.round(currentMetric.value * 100)}%`
              : currentMetric.value.toFixed(2)
            : "--"}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#666",
            marginTop: 4,
          }}
        >
          {currentMetric.label}
        </div>
      </div>
    </div>
  );
}