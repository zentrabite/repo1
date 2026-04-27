import { C, font } from "@/lib/brand";

interface Props {
  title: string;
  description: string;
  accentColor?: string;
}

export default function PlaceholderPage({ title, description, accentColor = C.green }: Props) {
  return (
    <div style={{ padding: "40px", fontFamily: font.body }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 4, height: 32, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
        <h1 style={{ fontFamily: font.heading, fontSize: 28, fontWeight: 700, color: C.cloud, margin: 0 }}>
          {title}
        </h1>
      </div>
      <p style={{ color: C.muted, fontSize: 15, marginBottom: 40, marginLeft: 16 }}>
        {description}
      </p>

      {/* Under construction card */}
      <div style={{
        border: `2px dashed ${C.border}`,
        borderRadius: 16,
        padding: "64px 40px",
        textAlign: "center",
        color: C.muted,
        fontSize: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: C.darkNavy,
          margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill={C.muted} aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
        <p style={{ margin: 0, fontWeight: 500, color: C.cloud }}>{title} — coming next phase</p>
        <p style={{ margin: "6px 0 0", fontSize: 13 }}>
          This page will be built out in the steps that follow. The shell and routing are already wired up.
        </p>
      </div>
    </div>
  );
}
