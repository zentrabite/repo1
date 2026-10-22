// ZentraBite logo: the app icon (public/brand/zentrabite-icon.svg) plus the
// wordmark. Other logo variants live in docs/reference/brand/logo/.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/zentrabite-icon.svg"
        alt=""
        width={size}
        height={size}
        style={{ display: "block", width: size, height: size, flexShrink: 0 }}
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
        <span style={{ color: "var(--logo-zentra, var(--cloud))" }}>Zentra</span>
        <span style={{ color: "var(--green)" }}>Bite</span>
      </div>
    </div>
  );
}
