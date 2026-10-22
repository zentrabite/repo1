// ZentraBite logo: the ZB mark (public/brand/zentrabite-mark.png) plus the wordmark.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/zentrabite-mark.png"
        alt=""
        width={Math.round(size * 1.3)}
        height={size}
        style={{ display: "block", height: size, width: "auto", flexShrink: 0 }}
      />
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
