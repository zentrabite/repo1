// Click to show more, using native <details> and <summary>. No JavaScript.
//
//   <Expandable summary="See how it works">
//     <p>Longer explanation.</p>
//   </Expandable>

import type { ReactNode, CSSProperties } from "react";

export function Expandable({
  summary,
  children,
  style,
}: {
  summary: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <details className="more-details" style={style}>
      <summary>{summary}</summary>
      <div className="more-body">{children}</div>
    </details>
  );
}
