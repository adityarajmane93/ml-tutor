import { Handle, Position } from "reactflow";
import { useReactFlow } from 'reactflow';

export default function EvaluationNode({
  id, data, selected,
}: any) {

  const { deleteElements } = useReactFlow();
  
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevents the click from accidentally dragging/selecting the node
      deleteElements({ nodes: [{ id }] }); // Triggers your existing deletion logic!
    };
  
  function Metric({
    title,
    value,
  }: {
    title: string;
    value?: number;
  }) {
    return (
      <div
        style={{
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        <span>{title}: </span>

        <span
          style={{ fontWeight: 500
          }}
        >
          {value != null ? value.toFixed(2) : "--"}
        </span>
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--success)",
        color: "var(--surface)",
        padding: "10px 12px", // Slimmer padding
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
     
      <div style={{ fontSize: "0.95rem", textTransform: "uppercase", marginBottom: "6px" }}>
        {data.label}
      </div>

      <div style={{ 
        background: "var(--surface)", 
        color: "var(--text)", 
        padding: "4px 8px", 
        border: "2px solid var(--text)",
        boxShadow: "2px 2px 0px 0px var(--text)",
        fontSize: "0.85rem"
      }}>
        
        <span style={{ fontSize: "1rem", fontWeight: 900 }}>
          {data?.accuracy ? `${(data.accuracy.toFixed(2))*100}%` : "--"}
        </span>
        <div
            style={{
              color: "#666",
              fontSize: 13,
            }}
          >
            Overall Accuracy
          </div>
        <hr />
        <Metric
          title="Precision"
          value={data?.precision}
        /> 
        <Metric
          title="Recall"
          value={data?.recall}
        />
        <Metric
          title="F1 Score"
          value={data?.F1}
        />
      </div>
    </div>
  );
}