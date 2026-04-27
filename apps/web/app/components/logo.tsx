export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-outfit)",
          fontWeight: 800,
          fontSize: size * 0.42,
          color: "var(--navy)",
          flexShrink: 0,
          boxShadow: "0 3px 14px rgba(0,182,122,.35)",
        }}
      >
        ZB
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 700,
          fontSize: 20,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        <span style={{ color: "var(--cloud)" }}>Zentra</span>
        <span style={{ color: "var(--green)" }}>Bite</span>
      </div>
    </div>
  );
}
