interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  accent?: boolean;
  delay?: number;
}

// Only apply accent colour when the value is real data — never on placeholder "—"
const isPlaceholder = (v: string) => v === "—" || v === "" || v === "$—" || v === "0";

export default function StatCard({ label, value, subtitle, icon, accent, delay = 0 }: StatCardProps) {
  const useAccent = accent && !isPlaceholder(value);

  return (
    <div
      className="gc fd"
      style={{
        padding: "22px 24px",
        flex: 1,
        minWidth: 150,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Label row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{
          fontSize: 12,
          color: "#6B7C93",
          fontFamily: "var(--font-inter)",
          fontWeight: 400,
          textTransform: "uppercase",
          letterSpacing: ".5px",
        }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 16, opacity: .38 }}>{icon}</span>}
      </div>

      {/* Value — accent only when there's real data */}
      <div style={{
        fontSize: 30,
        fontWeight: 700,
        fontFamily: "var(--font-outfit)",
        color: useAccent ? "#00B67A" : "#F8FAFB",
        lineHeight: 1,
        letterSpacing: "-0.5px",
      }}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontSize: 12,
          color: "#6B7C93",
          fontFamily: "var(--font-inter)",
          marginTop: 6,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
