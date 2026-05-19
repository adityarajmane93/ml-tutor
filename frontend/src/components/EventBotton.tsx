import { logEvent } from "../services/logger";

export default function EventButton() {
  async function handleClick() {
    await logEvent(
      "UI_EVENT",
      "BUTTON_CLICK",
      {
        button_name: "run_pipeline",
      }
    );
  }

  return (
    <button onClick={handleClick}>
      Run Pipeline
    </button>
  );
}