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

              minWidth: "160px",

              textAlign: "center",

              fontWeight: 600,

              boxShadow:
                "0 2px 6px rgba(0,0,0,0.12)",

              border: selected ? "4px solid #fbff00" : "4px solid transparent",

            }
          
          }

          
          >

        {data.label}
<p>
  Algorithm:
  {data.algorithm}
</p>

<div
  style={{
    marginTop: "8px",
  }}
>

  <label>
    K:
  </label>

  <input
  className="nodrag"

  type="number"

  value={data.k ?? ""}

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

