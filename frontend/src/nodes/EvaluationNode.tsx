import { Handle, Position } from "reactflow";

export default function EvaluationNode({
  data, selected,
}: any) {

  return (
    <div
      style={{
        background: "var(--success)",
        color: "var(--surface)",
        padding: "10px 12px", // Slimmer padding
        minWidth: "140px",    // Slimmer width
        textAlign: "center",
        fontWeight: 800,
        borderRadius: "0",
        border: selected ? "1px solid var(--primary)" : "1px solid var(--text)",
      }}
    >
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
     
      <div style={{ fontSize: "0.95rem", textTransform: "uppercase", marginBottom: "6px" }}>
        {data.label}
      </div>

      <div style={{ 
        background: "var(--surface)", 
        color: "var(--text)", 
        padding: "4px 8px", // Slimmer padding
        border: "2px solid var(--text)",
        boxShadow: "2px 2px 0px 0px var(--text)",
        fontSize: "0.85rem"
      }}>
        Accuracy: <br/>
        <span style={{ fontSize: "1rem", fontWeight: 900 }}>
          {data?.accuracy ? data.accuracy.toFixed(2) : "--"}
        </span>
      </div>
    </div>
  );
}