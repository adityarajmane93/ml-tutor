import {
  Handle,
  Position,
} from "reactflow";

export default function DatasetNode({
  data, selected,
}: any) {

  return (
    <div
      style={{
        background: "#2c6fc0",

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
        type="source"
        position={Position.Right}
      />

      {data.label}

    </div>
  );
}