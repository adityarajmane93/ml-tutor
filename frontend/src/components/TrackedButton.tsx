import type { ReactNode } from "react";

import { logEvent }
from "../services/logger";

type Props = {
  children: ReactNode;

  eventName: string;

  onClick?: () => void;
};

export default function TrackedButton({
  children,
  eventName,
  onClick,
}: Props) {
  async function handleClick() {
    await logEvent(
      "UI_EVENT",
      eventName,
      {}
    );

    if (onClick) {
      onClick();
    }
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
}