"use client";

import type { ReactNode } from "react";

// Opens the floating website assistant (components/assistant.tsx) from
// anywhere on the page, such as the "Ask the assistant" line under Questions.
export const OPEN_ASSISTANT = "zb-open-assistant";

export function AskAssistant({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-controls="zb-assistant"
      onClick={(e) => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT, { detail: e.currentTarget }))}
    >
      {children}
    </button>
  );
}
