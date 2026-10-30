import { useState } from "react";
import { useNavigate } from "react-router-dom";

type DatasetOption = {
  id: number;
  key: string;
  name: string;
  instances: number;
  features: number;
  featureTypes: string;
  target: string;
  description: string;
  objective: string;
  sourceUrl: string;
};

const UCI_DATASETS: DatasetOption[] = [
  {
    id: 267,
    key: "banknote_authentication",
    name: "Banknote Authentication",
    instances: 1_372,
    features: 4,
    featureTypes: "Real-valued",
    target: "class",
    description:
      "Wavelet measurements taken from images of genuine and forged banknotes. The measurements describe image variance, skewness, curtosis, and entropy.",
    objective:
      "Build a binary classifier that predicts whether a banknote is genuine or forged, then compare how different models perform.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/267/banknote+authentication",
  },
  {
    id: 109,
    key: "wine",
    name: "Wine",
    instances: 178,
    features: 13,
    featureTypes: "Integer and real-valued",
    target: "class",
    description:
      "Chemical measurements from wines grown in the same Italian region. Each wine belongs to one of three cultivars.",
    objective:
      "Train a multiclass model to identify the wine cultivar from its chemical measurements and evaluate the model's accuracy.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/109/wine",
  },
  {
    id: 602,
    key: "dry_bean",
    name: "Dry Bean",
    instances: 13_611,
    features: 16,
    featureTypes: "Integer and real-valued",
    target: "Class",
    description:
      "Shape measurements extracted from images of dry beans. The records cover seven registered bean varieties with similar appearances.",
    objective:
      "Build a multiclass model that identifies a bean variety from its shape, then inspect which algorithm gives the strongest result.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/602/dry+bean+dataset",
  },
  {
    id: 563,
    key: "iranian_churn",
    name: "Iranian Churn",
    instances: 3_150,
    features: 13,
    featureTypes: "Integer",
    target: "Churn",
    description:
      "Twelve months of anonymised activity from an Iranian telecom company, including call failures, usage, complaints, and subscription information.",
    objective:
      "Predict whether a customer will leave the telecom service and compare models for this binary classification problem.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/563/iranian+churn+dataset",
  },
  {
    id: 73,
    key: "mushroom",
    name: "Mushroom",
    instances: 8_124,
    features: 22,
    featureTypes: "Categorical",
    target: "poisonous",
    description:
      "Physical descriptions of gilled mushrooms, such as cap shape, odor, gill colour, and habitat. Some predictor values are missing.",
    objective:
      "Use preprocessing and classification to predict whether a mushroom is edible or poisonous. Pay close attention to missing values.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/73/mushroom",
  },
  {
    id: 2,
    key: "adult_income",
    name: "Adult Income",
    instances: 48_842,
    features: 14,
    featureTypes: "Categorical and integer",
    target: "income",
    description:
      "Census records containing demographic, education, occupation, and work information. Some predictor values are missing.",
    objective:
      "Predict whether a person's annual income exceeds $50,000 and consider how class balance and demographic variables affect evaluation.",
    sourceUrl: "https://archive.ics.uci.edu/dataset/2/adult",
  },
];

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8000";

export default function ProblemStatement({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState(UCI_DATASETS[0].key);

  const selectedDataset =
    UCI_DATASETS.find((dataset) => dataset.key === selectedKey) ?? UCI_DATASETS[0];

  const downloadUrl = `${API_BASE_URL}/uci-datasets/${selectedDataset.id}/download`;

  const handleFinish = () => {
    sessionStorage.setItem(
      "ml-tutor-selected-dataset",
      JSON.stringify({
        id: selectedDataset.id,
        key: selectedDataset.key,
        name: selectedDataset.name,
        target: selectedDataset.target,
      }),
    );
    onComplete();
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "15px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        className="neo-card"
        style={{
          maxWidth: "900px",
          width: "100%",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "30px",
        }}
      >
        <div style={{ borderBottom: "4px solid var(--text)", paddingBottom: "20px", textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 7vw, 3rem)",
              color: "var(--danger)",
              textTransform: "uppercase",
              letterSpacing: "-1px",
            }}
          >
            Choose Your Mission
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "1.1rem", fontWeight: "bold", color: "#4b5563" }}>
            Select one real-world dataset from the UCI Machine Learning Repository.
          </p>
        </div>

        <section
          aria-labelledby="dataset-picker-title"
          style={{
            backgroundColor: "#fffbeb",
            border: "3px solid #d97706",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "4px 4px 0 #d97706",
            textAlign: "left",
          }}
        >
          <label id="dataset-picker-title" htmlFor="uci-dataset" style={{ display: "block", fontSize: "1.25rem", fontWeight: 900 }}>
            UCI dataset
          </label>
          <select
            id="uci-dataset"
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "12px",
              border: "3px solid var(--text)",
              background: "#fff",
              color: "var(--text)",
              fontSize: "1rem",
              fontWeight: 800,
              boxShadow: "3px 3px 0 var(--text)",
            }}
          >
            {UCI_DATASETS.map((dataset) => (
              <option key={dataset.id} value={dataset.key}>
                {dataset.name} — {dataset.instances.toLocaleString()} rows
              </option>
            ))}
          </select>
          <p style={{ margin: "12px 0 0", color: "#78350f" }}>
            UCI ID {selectedDataset.id} · {selectedDataset.instances.toLocaleString()} rows · {selectedDataset.features} features · {selectedDataset.featureTypes}
          </p>
        </section>

        <section
          aria-labelledby="about-dataset-title"
          style={{
            backgroundColor: "#eff6ff",
            border: "3px solid #3b82f6",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "4px 4px 0 #3b82f6",
            textAlign: "left",
          }}
        >
          <h2 id="about-dataset-title" style={{ marginTop: 0, color: "#1d4ed8" }}>
            About {selectedDataset.name}
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "18px" }}>
            {selectedDataset.description}
          </p>

          <div style={{ backgroundColor: "#dbeafe", padding: "16px", borderLeft: "4px solid #2563eb" }}>
            <strong>Prediction target:</strong> Select <strong>{selectedDataset.target}</strong> as the target column in ML-Tutor. All other suitable columns are predictors.
          </div>

          <div style={{ marginTop: "22px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <a
              href={downloadUrl}
              download={`${selectedDataset.key}.csv`}
              className="neo-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                backgroundColor: "#fff",
                color: "#1d4ed8",
                borderColor: "#1d4ed8",
                boxShadow: "4px 4px 0 #1d4ed8",
              }}
            >
              Download CSV
            </a>
            <a href={selectedDataset.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 800 }}>
              View the UCI dataset page ↗
            </a>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "0.9rem", color: "#3b82f6", fontStyle: "italic" }}>
            Download the CSV, then upload it to a Dataset node in the sandbox.
          </p>
        </section>

        <section
          aria-labelledby="objective-title"
          style={{
            backgroundColor: "#f0fdf4",
            border: "3px solid #16a34a",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "4px 4px 0 #16a34a",
            textAlign: "left",
          }}
        >
          <h2 id="objective-title" style={{ marginTop: 0, color: "#166534" }}>
            What you will do in ML-Tutor
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#14532d" }}>
            {selectedDataset.objective}
          </p>
          <ol style={{ margin: 0, paddingLeft: "24px", fontSize: "1.05rem", lineHeight: 1.7, color: "#14532d" }}>
            <li>Add a Dataset node and upload the downloaded CSV.</li>
            <li>Open Features and confirm <strong>{selectedDataset.target}</strong> as the target.</li>
            <li>Connect preprocessing, model, and evaluation nodes into a complete pipeline.</li>
            <li>Run at least two algorithms and use the evaluation results to decide which model works best.</li>
          </ol>
        </section>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
          <button
            className="neo-btn"
            onClick={handleFinish}
            style={{
              padding: "16px 40px",
              backgroundColor: "var(--success)",
              color: "#fff",
              fontSize: "1.3rem",
              width: "100%",
              maxWidth: "420px",
              textTransform: "uppercase",
            }}
          >
            Accept {selectedDataset.name} Mission
          </button>
        </div>
      </div>
    </div>
  );
}
