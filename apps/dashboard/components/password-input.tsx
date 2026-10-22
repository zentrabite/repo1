"use client";

// Password box with an eye button. Closed eye while the password is hidden,
// click it and the eye opens and the password shows as plain text.
// Drop-in for <input type="password" />: every other input prop passes through.

import { useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** What the button calls the value, e.g. "password" or "API key". */
  label?: string;
};

export default function PasswordInput({ style, label = "password", ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...props}
        type={show ? "text" : "password"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ ...style, paddingRight: 44 }}
      />
      <button
        type="button"
        className="zb-eye"
        onClick={() => setShow(s => !s)}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={show}
        title={show ? `Hide ${label}` : `Show ${label}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* Open eye: grows from a line, so it looks like the eye opening */}
          <g className={`zb-eye-open${show ? " on" : ""}`}>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </g>
          {/* Closed eye: lid with lashes */}
          <g className={`zb-eye-shut${show ? "" : " on"}`}>
            <path d="M2 8.5c2.4 3.6 5.8 5.5 10 5.5S19.6 12.1 22 8.5" />
            <path d="M5.2 11.9 3.6 14.1M9.2 13.7l-.7 2.6M14.8 13.7l.7 2.6M18.8 11.9l1.6 2.2" />
          </g>
        </svg>
      </button>
    </div>
  );
}
