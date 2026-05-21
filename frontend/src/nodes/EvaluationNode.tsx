import {
  Handle,
  Position,
} from "reactflow";

export default function EvaluationNode({
  data, selected,
}: any) {

  return (
    <div
      style={{
        background: "#0dc51c",

        color: "white",

        padding: "12px",

        borderRadius: "12px",

        minWidth: "160px",

        textAlign: "center",

        fontWeight: 600,

        boxShadow:
          "0 2px 6px rgba(0,0,0,0.12)",
          border: selected ? "4px solid #fbff00" : "4px solid transparent",
      }}
    >


      <Handle
        type="target"
        position={Position.Left}
      />

      {data.label}

      <p>
  Accuracy:
  {
    data?.accuracy
      ?.toFixed(2)
  }
</p>

 
    </div>
  );
}