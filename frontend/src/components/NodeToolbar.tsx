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
    addNewNode("datasetNode")
  }
>
  Dataset
</button>

<button
  onClick={() =>
    addNewNode("preprocessingNode")
  }
>
  Preprocessing
</button>

<button
  onClick={() =>
    addNewNode("modelNode")
  }
>
  Model
</button>

<button
  onClick={() =>
    addNewNode("evaluationNode")
  }
>
  Evaluation
</button>

    </div>
  );
}