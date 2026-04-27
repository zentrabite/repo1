// Brand spec: pill-shaped (999px), light background, same-hue text
// Outfit 600 — badges use the heading font family for visual clarity

const STYLES: Record<string, { bg: string; color: string }> = {
  VIP:              { bg: "rgba(0,182,122,.12)",    color: "#00B67A" },
  "At Risk":        { bg: "rgba(255,107,53,.12)",   color: "#FF6B35" },
  New:              { bg: "rgba(28,45,72,.8)",       color: "#E2E8F0" },
  Regular:          { bg: "rgba(107,124,147,.15)",   color: "#6B7C93" },
  Direct:           { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  "Uber Eats":      { bg: "rgba(255,107,53,.12)",   color: "#FF6B35" },
  Menulog:          { bg: "rgba(168,85,247,.12)",    color: "#A855F7" },
  Marketplace:      { bg: "rgba(168,85,247,.12)",    color: "#A855F7" },
  active:           { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  inactive:         { bg: "rgba(107,124,147,.14)",   color: "#6B7C93" },
  paused:           { bg: "rgba(107,124,147,.14)",   color: "#6B7C93" },
  Gold:             { bg: "rgba(245,158,11,.14)",    color: "#F59E0B" },
  Silver:           { bg: "rgba(192,192,192,.14)",   color: "#C0C0C0" },
  Bronze:           { bg: "rgba(205,127,50,.14)",    color: "#CD7F32" },
  SMS:              { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  Email:            { bg: "rgba(99,130,246,.14)",    color: "#818CF8" },
  New_order:        { bg: "rgba(99,130,246,.14)",    color: "#818CF8" },
  Preparing:        { bg: "rgba(245,158,11,.14)",    color: "#F59E0B" },
  Ready:            { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  Delivered:        { bg: "rgba(107,124,147,.14)",   color: "#6B7C93" },
  Converted:        { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  "High Value":     { bg: "rgba(245,158,11,.14)",    color: "#F59E0B" },
  Loyal:            { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  Inactive:         { bg: "rgba(220,53,69,.12)",     color: "#FF4757" },
  "Direct User":    { bg: "rgba(99,130,246,.14)",    color: "#818CF8" },
  "BiteBack Active":{ bg: "rgba(99,179,255,.14)",    color: "#63B3FF" },
  Discount:         { bg: "rgba(0,182,122,.12)",     color: "#00B67A" },
  Freebie:          { bg: "rgba(245,158,11,.14)",    color: "#F59E0B" },
  Welcome:          { bg: "rgba(99,130,246,.14)",    color: "#818CF8" },
  "BiteBack Active_net": { bg: "rgba(99,179,255,.14)", color: "#63B3FF" },
};

export default function Badge({ type, children }: { type: string; children: React.ReactNode }) {
  const s = STYLES[type] ?? { bg: "rgba(107,124,147,.14)", color: "#6B7C93" };
  return (
    <span
      className="bd"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}28`,
      }}
    >
      {children}
    </span>
  );
}
