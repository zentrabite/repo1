// ─── Readable text on a shop's own colour ──────────────────────────────────
// A shop picks its brand colour, and its website, ordering page and counter
// cards put text on it. The text is whichever of dark or white is easier to
// read (the WCAG contrast ratio), so it passes where either can.
//
// Before 23 Nov each page guessed from the colour's brightness, and got it
// wrong for mid greens. ZentraBite's own #00AD82 got white text at 2.9 to 1,
// under the 4.5 to 1 small text needs. It gets dark text now, at about 5.8
// to 1. The counter cards always used dark text, which a dark brand colour
// made unreadable. No server-only import, so pages use it.

/** Relative luminance (WCAG 2) of a #rrggbb colour, or null if it isn't one. */
export function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1]!.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two #rrggbb colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a) ?? 0, lb = luminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Dark or white, whichever reads better on this colour. */
export function textOn(background: string, dark = "#0F1F2D", light = "#FFFFFF"): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

function mix(a: string, b: string, t: number): string {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a)![1]!, pb = /^#?([0-9a-f]{6})$/i.exec(b)![1]!;
  const ch = (p: string, i: number) => parseInt(p.slice(i, i + 2), 16);
  return "#" + [0, 2, 4].map(i => Math.round(ch(pa, i) * (1 - t) + ch(pb, i) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * The shop's colour, darkened on a light page or lightened on a dark one
 * until small text in it is readable (4.5 to 1). For prices, links and
 * labels in the shop's colour. A colour that already passes is kept.
 */
export function readableOn(color: string, background: string, min = 4.5): string {
  if (luminance(color) === null || luminance(background) === null) return color;
  const toward = (luminance(background) ?? 1) > 0.5 ? "#000000" : "#FFFFFF";
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = mix(color, toward, Math.min(t, 1));
    if (contrastRatio(c, background) >= min) return c;
  }
  return toward;
}
