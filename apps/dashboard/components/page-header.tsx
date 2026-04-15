// Brand spec:
//   Title    → Outfit SemiBold 600, 24–28px (H2)
//   Subtitle → Inter Regular 400, 14–16px, Steel
//   Button   → Primary (green fill) or omitted

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick?: () => void };
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      marginBottom: 20,
    }}>
      <div>
        <h2 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: 22,
          color: "#F8FAFB",
          letterSpacing: "-.2px",
          lineHeight: 1.1,
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            fontFamily: "var(--font-inter)",
            fontSize: 14,
            color: "#6B7C93",
            marginTop: 5,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button className="bp" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
