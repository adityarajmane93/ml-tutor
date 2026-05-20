import {
  Handle,
  Position,
} from "reactflow";

export default function PreprocessingNode({
  data,
  selected,
}: any) {

  return (
    <div
      style={{
        background: "#d4a508",

        color: "white",

        padding: "12px",

        borderRadius: "12px",

        minWidth: "160px",

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

     <p>
  Method:
  {data.method}
</p>
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