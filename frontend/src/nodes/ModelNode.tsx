import {
  Handle,
  Position,
} from "reactflow";

export default function ModelNode({
  id,
  data,
  selected,
  updateNodeData,
}: any) {

  return (

    <div
      style={{
        background: "#c5290d",

        color: "white",

        padding: "12px",

        borderRadius: "12px",

        minWidth: "220px",

        textAlign: "center",

        fontWeight: 600,

        boxShadow:
          "0 2px 6px rgba(0,0,0,0.12)",

        border: selected
          ? "4px solid #fbff00"
          : "4px solid transparent",
      }}
    >

      {data.label}

      <div
        style={{
          marginTop: "10px",
        }}
      >

        <label>
          Algorithm:
        </label>

        <br />

        <select
          className="nodrag"

          value={
            data.algorithm
          }

          onChange={(e) => {

            const algorithm =
              e.target.value;

            if (
              algorithm === "knn"
            ) {

              updateNodeData(
                id,
                {
                  algorithm,
                  k: 5,
                }
              );
            }

            else if (
              algorithm ===
              "decisionTree"
            ) {

              updateNodeData(
                id,
                {
                  algorithm,
                  maxDepth: 3,
                }
              );
            }

            else {

              updateNodeData(
                id,
                {
                  algorithm,
                }
              );
            }
          }}

          style={{
            marginTop: "6px",
            width: "160px",
          }}
        >

          <option value="knn">
            KNN
          </option>

          <option
            value="logisticRegression"
          >
            Logistic Regression
          </option>

          <option
            value="decisionTree"
          >
            Decision Tree
          </option>

        </select>
      </div>

      {
        data.algorithm === "knn" && (

          <div
            style={{
              marginTop: "10px",
            }}
          >

            <label>
              K:
            </label>

            <input
              className="nodrag"

              type="number"

              value={
                data.k ?? ""
              }

              onChange={(e) => {

                updateNodeData(
                  id,
                  {
                    k: Number(
                      e.target.value
                    ),
                  }
                );
              }}

              style={{
                width: "60px",
                marginLeft: "8px",
              }}
            />

          </div>
        )
      }

      {
        data.algorithm ===
        "decisionTree" && (

          <div
            style={{
              marginTop: "10px",
            }}
          >

            <label>
              Max Depth:
            </label>

            <input
              className="nodrag"

              type="number"

              value={
                data.maxDepth ?? ""
              }

              onChange={(e) => {

                updateNodeData(
                  id,
                  {
                    maxDepth:
                      Number(
                        e.target.value
                      ),
                  }
                );
              }}

              style={{
                width: "60px",
                marginLeft: "8px",
              }}
            />

          </div>
        )
      }

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