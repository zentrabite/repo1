// Shown for name.zentrabite.com addresses that don't belong to a business.
export default function SiteNotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAFBFC", color: "#0F1F2D", fontFamily: "var(--font-outfit), system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 10px" }}>Nothing here yet</h1>
        <p style={{ margin: 0, color: "#5F7089", fontSize: 16, lineHeight: 1.5 }}>
          This address isn&apos;t linked to a restaurant. Check the link, or visit{" "}
          <a href="https://zentrabite.com" style={{ color: "#00B67A", fontWeight: 600 }}>zentrabite.com</a>.
        </p>
      </div>
    </div>
  );
}
