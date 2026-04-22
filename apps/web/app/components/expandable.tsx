// Lightweight click-to-expand using native <details>/<summary>.
// Zero JS, accessible, matches the ZentraBite dark-glass aesthetic.
//
// Usage:
//   <Expandable summary="See how it works">
//     <p>Long explanation lives here.</p>
//   </Expandable>
//
// The summary row is the ONLY thing visible by default — long copy,
// bullets, diagrams, etc. sit inside children and expand on click.

import type { ReactNode, CSSProperties } from "react";

export function Expandable({
  summary,
  children,
  tone = "default",
  style,
}: {
  summary: string;
  children: ReactNode;
  tone?: "default" | "quiet";
  style?: CSSProperties;
}) {
  const color = tone === "quiet" ? "var(--steel)" : "var(--green)";
  return (
    <details
      style={{
        marginTop: 8,
        ...style,
      }}
    >
      <summary
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          color,
          fontSize: 13,
          fontWeight: 600,
          listStyle: "none",
          userSelect: "none",
        }}
      >
        <span aria-hidden style={{ fontSize: 11, transition: "transform 0.15s" }} className="expandable-chevron">
          ▸
        </span>
        {summary}
      </summary>
      <div style={{ paddingTop: 12, color: "var(--steel)", fontSize: 14, lineHeight: 1.6 }}>
        {children}
      </div>
      <style>{`
        details[open] > summary .expandable-chevron { transform: rotate(90deg); display: inline-block; }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>
    </details>
  );
}
