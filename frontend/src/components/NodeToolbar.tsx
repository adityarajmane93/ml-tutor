type Props = {
  addNewNode: (nodeType: string) => void;
  Learn: () => void;
  runPipeline: () => void;
  hasSelection: boolean;  
  activeColor?: string;
};

export default function NodeToolbar({
  addNewNode,
  Learn,
  runPipeline,
  hasSelection, 
  activeColor,
}: Props) {
  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        borderBottom: "4px solid var(--text)",
        background: "var(--surface)",
      }}
    >
      <button
        className="counter"
        style={{ background: "var(--secondary)", color: "var(--surface)", margin: 0 }}
        onClick={() => addNewNode("datasetNode")}
      >
        Dataset
      </button>

      <button
        className="counter"
        style={{ background: "var(--warning)", color: "var(--surface)", margin: 0 }}
        onClick={() => addNewNode("preprocessingNode")}
      >
        Preprocessing
      </button>

      <button
        className="counter"
        style={{ background: "var(--danger)", color: "var(--surface)", margin: 0 }}
        onClick={() => addNewNode("modelNode")}
      >
        Model
      </button>

      <button
        className="counter"
        style={{ background: "var(--success)", color: "var(--surface)", margin: 0 }}
        onClick={() => addNewNode("evaluationNode")}
      >
        Evaluation
      </button>

      {/* Utility Buttons */}
      <button
        className="counter"
        style={{
          // 3. Dynamically apply the violet color if something is selected!
          background: hasSelection ? (`color-mix(in srgb, ${activeColor} 85%, transparent)` || '#111827') : "var(--surface)",
          color: hasSelection ? "#ffffff" : "var(--text)",
          margin: 0,
          marginLeft: "auto", 
          transition: "background 0.3s ease" // Adds a nice smooth color fade
        }}
        onClick={Learn}
      >
        Learn
      </button>

      <button
        className="counter"
        style={{ background: "var(--primary)", color: "var(--text)", margin: 0 }}
        onClick={runPipeline}
      >
        Run Pipeline
      </button>
    </div>
  );
}