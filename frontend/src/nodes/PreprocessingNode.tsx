import {
  Handle,
  Position,
} from "reactflow";

export default function PreprocessingNode({
  id,
  data,
  selected,
  updateNodeData,
}: any) {

  return (

    <div
      style={{
        background: "#d4a508",

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

      {data.label}

      <div
        style={{
          marginTop: "10px",
        }}
      >

        <label>
          Method:
        </label>

        <br />

        <select
          className="nodrag"

          value={
            data?.method
            || "standardScaler"
          }

          onChange={(e) => {

            updateNodeData(
              id,
              {
                method:
                  e.target.value,
              }
            );
          }}

          style={{
            marginTop: "6px",
            width: "170px",
          }}
        >

          <option
            value="standardScaler"
          >
            Standard Scaler
          </option>

          <option
            value="minMaxScaler"
          >
            MinMax Scaler
          </option>

          <option value="none">
            None
          </option>

        </select>

      </div>

      <Handle
        type="target"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

    </div>
  );
}