import {
  Handle,
  Position,
} from "reactflow";

import Papa from "papaparse";



export default function DatasetNode({
  id,
  data,
  selected,
  updateNodeData,
}: any) {

  function handleFileUpload(
    event: any
  ) {

    const file =
      event.target.files[0];

    if (!file) return;

    Papa.parse(file, {

      header: true,

      complete: (
        results
      ) => {

        updateNodeData(
          id,
          {
            dataset:
              results.data,

            filename:
              file.name,
          }
        );
      },
    });
  }

  return (

    <div
      style={{
        background: "#2563eb",

        color: "white",

        padding: "12px",

        borderRadius: "12px",

        minWidth: "220px",

        textAlign: "center",

        fontWeight: 600,

        border: selected
          ? "4px solid #fbff00"
          : "4px solid transparent",

        boxShadow:
          "0 2px 6px rgba(0,0,0,0.12)",
      }}
    >

      <div>
        Dataset
      </div>

      <input
        className="nodrag"

        type="file"

        accept=".csv"

        onChange={
          handleFileUpload
        }

        style={{
          marginTop: "10px",
          width: "180px",
        }}
      />

      <p
        style={{
          fontSize: "12px",
        }}
      >
        {
          data?.filename
          || "No file selected"
        }
      </p>

      <Handle
        type="source"
        position={Position.Right}
      />

    </div>
  );
}