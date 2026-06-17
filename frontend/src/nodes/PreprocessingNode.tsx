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

        minWidth: "240px",

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
        {data.label}
      </div>

      {/* ---------------- */}
      {/* METHOD */}
      {/* ---------------- */}

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
            width: "180px",
          }}
        >

          <option
            value="fillMissingValues"
          >
            Fill Missing Values
          </option>

          <option
            value="removeDuplicateRows"
          >
            Remove Duplicate Rows
          </option>

        </select>

      </div>

      {/* ---------------- */}
      {/* STRATEGY */}
      {/* ---------------- */}

      {
        data?.method ===
        "fillMissingValues" && (

          <div
            style={{
              marginTop: "12px",
            }}
          >

            <label>
              Strategy:
            </label>

            <br />

            <select
              className="nodrag"

              value={
                data?.strategy
              }

              onChange={(e) => {

                updateNodeData(
                  id,
                  {
                    strategy:
                      e.target.value,
                  }
                );
              }}

              style={{
                marginTop: "6px",
                width: "180px",
              }}
            >

              <option
                value="average"
              >
                Use Average
              </option>

              <option
                value="removeRows"
              >
                Remove Rows
              </option>

            </select>

          </div>
        )
      }

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
      />

      
    </div>
  );
}