import PipelineCanvas
from "./components/PipelineCanvas";

function App() {
  return (
    <div
      style={{
        padding: "1rem",
        fontFamily: "Arial",
      }}
    >
      <h1>ML-Tutor</h1>

      <p>
        Visual ML Sandbox
      </p>

      <PipelineCanvas />
    </div>
  );
}

export default App;