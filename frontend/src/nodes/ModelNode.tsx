import { Handle, Position } from "reactflow";
import { useReactFlow } from 'reactflow';

export default function ModelNode({
  id,
  data,
  selected,
  updateNodeData,
}: any) {

  const { deleteElements } = useReactFlow();
  
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevents the click from accidentally dragging/selecting the node
      deleteElements({ nodes: [{ id }] }); // Triggers your existing deletion logic!
    };

  const inputStyle = {
    border: "2px solid var(--text)",
    borderRadius: "0",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 600,
    padding: "2px 6px", // Slimmer padding
    boxShadow: "2px 2px 0px 0px var(--text)",
    fontSize: "0.85rem" // Smaller text
  };

  return (
    <div
      style={{
        background: "var(--danger)",
        color: "var(--surface)",
        padding: "10px 12px", // Slimmer padding
        minWidth: "180px",    // Slimmer width
        textAlign: "center",
        fontWeight: 800,
        borderRadius: "0",
        border: selected ? "1px solid var(--primary)" : "1px solid var(--text)",
      }}
    >
      <button className="neo-delete-btn" style={{background: "var(--danger)"}} onClick={handleDelete} title="Delete Node">
        X
      </button>

      <div style={{ fontSize: "0.95rem", textTransform: "uppercase" }}>
        {data.label}
      </div>

      <div style={{ marginTop: "10px", fontSize: "0.85rem" }}>
        <label>Algorithm:</label>
        <br />
        <select
          className="nodrag"
          value={data.algorithm}
          onChange={(e) => {
            const algorithm = e.target.value;
            if (algorithm === "knn") {
              updateNodeData(id, { algorithm, k: 5, maxDepth: undefined });
            } else if (algorithm === "decisionTree") {
              updateNodeData(id, { algorithm, maxDepth: 3, k: undefined });
            } else {
              updateNodeData(id, { algorithm, k: undefined, maxDepth: undefined });
            }
          }}
          style={{ ...inputStyle, width: "170px", marginTop: "4px", cursor: "pointer" }}
        >
          <option value="knn">KNN</option>
          <option value="logisticRegression">Logistic Regression</option>
          <option value="decisionTree">Decision Tree</option>
        </select>
      </div>

      {data.algorithm === "knn" && (
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.85rem" }}>
          <label>K:</label>
          <input
            className="nodrag"
            type="number"
            value={data.k ?? ""}
            onChange={(e) => updateNodeData(id, { k: Number(e.target.value) })}
            style={{ ...inputStyle, width: "45px" }}
          />
        </div>
      )}

      {data.algorithm === "decisionTree" && (
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.85rem" }}>
          <label>Max Depth:</label>
          <input
            className="nodrag"
            type="number"
            value={data.maxDepth ?? ""}
            onChange={(e) => updateNodeData(id, { maxDepth: Number(e.target.value) })}
            style={{ ...inputStyle, width: "45px" }}
          />
        </div>
      )}

      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
}