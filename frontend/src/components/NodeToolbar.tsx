type Props = {
  addNewNode: (
    nodeType: string
  ) => void;
};

export default function NodeToolbar({
  addNewNode,
}: Props) {

  return (
    <div
      style={{
        marginBottom: "1rem",
        display: "flex",
        gap: "0.5rem",
      }}
    >

      <button
        onClick={() =>
          addNewNode("Dataset")
        }
      >
        + Dataset Node
      </button>

      <button
        onClick={() =>
          addNewNode(
            "Preprocessing"
          )
        }
      >
        + Preprocessing Node
      </button>

      <button
        onClick={() =>
          addNewNode("Model")
        }
      >
        + Model Node
      </button>

      <button
        onClick={() =>
          addNewNode(
            "Evaluation"
          )
        }
      >
        + Evaluation Node
      </button>

    </div>
  );
}