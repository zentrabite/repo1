// ─── Public 404 ──────────────────────────────────────────────────────────────
// The plain "not found" page for customer-facing addresses: restaurant sites
// on name.zentrabite.com and the public /site and /store pages. It has no CRM
// branding and no CRM links, so a customer never lands in the merchant app.
// Used by app/site/[subdomain]/not-found.tsx and app/not-found.tsx.

/** Page colour, also used for the browser bar (theme-color). */
export const PUBLIC_NOT_FOUND_BG = "#FAFBFC";

export default function PublicNotFound({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="zb-404" style={{ minHeight: "100vh", boxSizing: "border-box", display: "grid", placeItems: "center", background: PUBLIC_NOT_FOUND_BG, color: "#0F1F2D", fontFamily: "var(--font-outfit), system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 10px" }}>{title}</h1>
        <p style={{ margin: 0, color: "#5F7089", fontSize: 16, lineHeight: 1.5 }}>{children}</p>
      </div>
    </div>
  );
}

/** Link style inside the message. */
export const publicLinkStyle: React.CSSProperties = { color: "#007A52", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 };
