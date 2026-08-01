import type { Node } from "reactflow";

interface Props {
  datasetNode?: Node;
  updateNodeData: (
    nodeId: string,
    newData: Record<string, unknown>
  ) => void;
}

export default function FeatureSelectionPanel({
  datasetNode,
  updateNodeData,
}: Props) {

  if (
    !datasetNode ||
    !datasetNode.data?.columns
  ) {
    return (
      <div
        style={{
          background: "var(--surface)",
          padding: "16px",
          minHeight: "180px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        Upload a dataset to select features.
      </div>
    );
  }

  const node = datasetNode!;
  const columns: string[] =
    node.data.columns;

  const selectedFeatures: string[] =
    node.data.selectedFeatures ?? [];

  const targetColumn: string =
    node.data.targetColumn ?? "";

  //----------------------------------
  // Toggle feature
  //----------------------------------

  function toggleFeature(column: string) {

    let updatedFeatures: string[];

    if (
      selectedFeatures.includes(column)
    ) {

      updatedFeatures =
        selectedFeatures.filter(
          (c) => c !== column
        );

    } else {

      updatedFeatures = [
        ...selectedFeatures,
        column,
      ];

    }

    updateNodeData(
      node.id,
      {
        selectedFeatures: updatedFeatures,
      }
    );
  }

  //----------------------------------
  // Target changed
  //----------------------------------

  function handleTargetChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {

    const target = e.target.value;

    let updatedFeatures =
      selectedFeatures.filter(
        (c) => c !== target
      );

    updateNodeData(
      node.id,
      {
        targetColumn: target,
        selectedFeatures: updatedFeatures,
      }
    );
  }

  //----------------------------------
  // Select All
  //----------------------------------

  function selectAll() {

    updateNodeData(
      node.id,
      {
        selectedFeatures:
          columns.filter(
            c => c !== targetColumn
          )
      }
    );
  }

  //----------------------------------
  // Clear All
  //----------------------------------

  function clearAll() {

    updateNodeData(
      node.id,
      {
        selectedFeatures: []
      }
    );
  }

  //----------------------------------

  return (

    <div
      style={{
        border: "4px solid var(--text)",
        boxShadow: "var(--hard-shadow)",
        background: "var(--surface)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >

      {/* <div
        style={{
          fontWeight: 800,
          fontSize: "1rem",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Feature Selection
      </div> */}

      <div
        style={{
          display: "flex",
          gap: "8px",
        }}
      >

        <button
          onClick={selectAll}
          style={{
            flex: 1,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Select All
        </button>

        <button
          onClick={clearAll}
          style={{
            flex: 1,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Clear All
        </button>

      </div>

      <div
        style={{
          maxHeight: "180px",
          overflowY: "auto",
          border: "2px solid var(--text)",
          padding: "8px",
        }}
      >

        {columns.map((column) => (

          <label
            key={column}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >

            <input
              type="checkbox"
              checked={
                selectedFeatures.includes(column)
              }
              disabled={
                column === targetColumn
              }
              onChange={() =>
                toggleFeature(column)
              }
            />

            {column}

          </label>

        ))}

      </div>

      <div
        style={{
          fontWeight: 700,
          marginTop: "4px",
        }}
      >
        Target Column
      </div>

      <select
        value={targetColumn}
        onChange={handleTargetChange}
        style={{
          padding: "8px",
          fontWeight: 700,
          border: "2px solid var(--text)",
          background: "white",
        }}
      >

        {columns.map((column) => (

          <option
            key={column}
            value={column}
          >
            {column}
          </option>

        ))}

      </select>

    </div>

  );

}