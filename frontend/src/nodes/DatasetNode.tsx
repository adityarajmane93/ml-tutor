import { Handle, Position } from "reactflow";
import { useReactFlow } from 'reactflow';
import Papa from "papaparse";

export default function DatasetNode({
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

  function handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        updateNodeData(id, {
          dataset: results.data,
          filename: file.name,
        });
      },
    });
  }

  const inputStyle = {
    border: "2px solid var(--text)",
    borderRadius: "0",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 600,
    padding: "2px 6px", // Slimmer padding
    boxShadow: "2px 2px 0px 0px var(--text)",
    cursor: "pointer",
    fontSize: "0.85rem" // Smaller text
  };

  return (
    <div
      style={{
        background: "var(--secondary)",
        color: "var(--surface)",
        padding: "10px 12px", // Slimmer padding
        minWidth: "180px",    // Slimmer width
        textAlign: "center",
        fontWeight: 800,
        borderRadius: "0",
        border: selected ? "1px solid var(--primary)" : "1px solid var(--text)", // Slightly thinner borders
      }}
    > 
      <button className="neo-delete-btn" style={{background: "var(--secondary)"}} onClick={handleDelete} title="Delete Node">
        X
      </button>
      
      <div style={{ fontSize: "0.95rem", marginBottom: "8px", textTransform: "uppercase" }}>
        Dataset
      </div>

      <input
        className="nodrag"
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ ...inputStyle, width: "150px", marginBottom: "6px" }}
      />

      <p style={{ fontSize: "10px", fontWeight: 600, margin: 0 }}>
        {data?.filename || "No file selected"}
      </p>
      
      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.85rem" }}>
        <label>Test Size:</label>
        <input
          className="nodrag"
          type="number" 
          min="10" 
          max="100" 
          step="1"
          value={data.testSize ?? ""}
          onChange={(e) => {
            updateNodeData(id, { testSize: Number(e.target.value) });
          }}
          style={{ ...inputStyle, width: "45px" }}
        />
        <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>%</span>
      </div>

      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
}