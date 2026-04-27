// ZentraBite brand tokens — single source of truth
export const C = {
  nearBlack: "#0A1628",
  darkNavy:  "#0F1F2D",
  green:     "#00B67A",
  orange:    "#FF6B35",
  cloud:     "#E2E8F0",
  muted:     "#7A8FA6",
  border:    "#1E3448",
  cardBg:    "#132236",
} as const;

export const font = {
  heading: "'Outfit', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;

export type BrandColor = (typeof C)[keyof typeof C];
