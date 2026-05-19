import TrackedButton
from "./components/TrackedButton";

function App() {
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial",
      }}
    >
      <h1>ML-Tutor</h1>

      <p>
        Experimental Telemetry Platform
      </p>

      <TrackedButton
        eventName="RUN_PIPELINE"
      >
        Run Pipeline
      </TrackedButton>
    </div>
  );
}

export default App;