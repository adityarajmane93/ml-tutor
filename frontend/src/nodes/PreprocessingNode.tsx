import { Handle, Position } from "reactflow";
import { useReactFlow } from 'reactflow';

export default function PreprocessingNode({
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

  const selectStyle = {
    border: "2px solid var(--text)",
    borderRadius: "0",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 600,
    padding: "2px 4px", // Slimmer padding
    boxShadow: "2px 2px 0px 0px var(--text)",
    width: "160px",     // Slimmer width
    cursor: "pointer",
    marginTop: "4px",
    fontSize: "0.85rem" // Smaller text
  };

  return (
    <div
      style={{
        background: "var(--warning)",
        color: "var(--surface)",
        padding: "10px 12px", // Slimmer padding
        minWidth: "190px",    // Slimmer width
        textAlign: "center",
        fontWeight: 800,
        borderRadius: "0",
        border: selected ? "1px solid var(--primary)" : "1px solid var(--text)",
      }}
    >
      <button className="neo-delete-btn" style={{background: "var(--warning)"}} onClick={handleDelete} title="Delete Node">
        X
      </button>

      <div style={{ fontSize: "0.95rem", textTransform: "uppercase" }}>
        {data.label}
      </div>

      <div style={{ marginTop: "10px", fontSize: "0.85rem" }}>
        <label>Method:</label>
        <br />
        <select
          className="nodrag"
          value={data?.method}
          onChange={(e) => updateNodeData(id, { method: e.target.value })}
          style={selectStyle}
        >
          <option value="fillMissingValues">Fill Missing Values</option>
          <option value="removeDuplicateRows">Remove Duplicate Rows</option>
        </select>
      </div>

      {data?.method === "fillMissingValues" && (
        <div style={{ marginTop: "10px", fontSize: "0.85rem" }}>
          <label>Strategy:</label>
          <br />
          <select
            className="nodrag"
            value={data?.strategy}
            onChange={(e) => updateNodeData(id, { strategy: e.target.value })}
            style={selectStyle}
          >
            <option value="average">Use Average</option>
            <option value="removeRows">Remove Rows</option>
          </select>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
}