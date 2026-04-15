import { type LucideIcon } from "lucide-react";

// Brand spec:
//   Title    → Outfit Medium 500, H3 scale
//   Body     → Inter Regular 400, body size
//   Icon     → Lucide, 24px, 1.5px stroke (active state = green fill bg)

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      padding: "52px 24px",
      textAlign: "center",
      borderRadius: 12,
      border: "1px dashed rgba(226,232,240,.1)",
      background: "rgba(28,45,72,.2)",
    }}>
      {/* Icon — green tinted background (active indicator per brand iconography spec) */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "rgba(0,182,122,.1)",
        border: "1px solid rgba(0,182,122,.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <Icon size={24} color="#00B67A" strokeWidth={1.5} />
      </div>

      {/* Title — Outfit H3 */}
      <h3 style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 500,
        fontSize: 16,
        color: "#F8FAFB",
        marginBottom: 8,
      }}>
        {title}
      </h3>

      {/* Description — Inter body */}
      <p style={{
        fontFamily: "var(--font-inter)",
        fontSize: 14,
        color: "#6B7C93",
        maxWidth: 400,
        lineHeight: 1.65,
      }}>
        {description}
      </p>
    </div>
  );
}
