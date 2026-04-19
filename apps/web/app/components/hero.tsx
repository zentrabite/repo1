import { LOGIN_URL, SIGNUP_URL } from "../../lib/config";

export function Hero() {
  return (
    <section
      className="grid-bg"
      style={{
        paddingTop: 160,
        paddingBottom: 96,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="container"
        style={{ display: "grid", gap: 56, position: "relative", zIndex: 1 }}
      >
        <div style={{ textAlign: "center", maxWidth: 840, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 22 }}>
            The all-in-one restaurant platform
          </div>
          <h1
            style={{
              fontSize: "clamp(40px, 6.2vw, 72px)",
              margin: "0 0 24px",
              background: "linear-gradient(180deg, var(--cloud) 30%, rgba(248,250,251,0.72) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Own your customers.
            <br />
            <span style={{ color: "var(--green)", WebkitTextFillColor: "var(--green)" }}>
              Own your margins.
            </span>
          </h1>
          <p
            style={{
              fontSize: "clamp(17px, 1.6vw, 20px)",
              color: "var(--steel)",
              maxWidth: 640,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            ZentraBite is the complete CRM, ordering, and delivery platform for modern
            restaurants — commission-free storefronts, live order management, built-in
            loyalty, and smart delivery routing, all under one roof.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 36,
              flexWrap: "wrap",
            }}
          >
            <a href={SIGNUP_URL} className="btn-primary" style={{ padding: "15px 30px", fontSize: 16 }}>
              Start free 14-day trial
              <span aria-hidden>→</span>
            </a>
            <a href="/demo" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
              ▶ Watch the 90-second demo
            </a>
          </div>
          <div style={{ marginTop: 18, fontSize: 13, color: "var(--steel)" }}>
            No credit card required · Cancel anytime · Free onboarding
          </div>
        </div>

        {/* Dashboard preview mock */}
        <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
          <div
            className="glass"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: 20,
              boxShadow: "0 40px 120px rgba(0,0,0,0.45), 0 0 0 1px var(--mist-9)",
            }}
          >
            {/* Fake browser chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderBottom: "1px solid var(--mist-9)",
                background: "rgba(15,25,42,0.6)",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
              <div
                style={{
                  marginLeft: 12,
                  flex: 1,
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--steel)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                dashboard.zentrabite.com.au/orders
              </div>
            </div>

            {/* Dashboard mock content */}
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, background: "var(--near-black)" }} className="hero-mock">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Dashboard", active: false },
                  { label: "Orders", active: true },
                  { label: "Customers", active: false },
                  { label: "Menu", active: false },
                  { label: "Winback", active: false },
                  { label: "Financials", active: false },
                ].map((i) => (
                  <div
                    key={i.label}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      color: i.active ? "white" : "var(--steel)",
                      background: i.active ? "var(--green)" : "transparent",
                      fontWeight: i.active ? 600 : 500,
                    }}
                  >
                    {i.label}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "Live orders", value: "7", color: "var(--green)" },
                    { label: "Today's revenue", value: "$1,842", color: "var(--cloud)" },
                    { label: "Avg. ticket", value: "$38.20", color: "var(--cloud)" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "var(--navy-40)",
                        border: "1px solid var(--mist-6)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 24, fontFamily: "var(--font-outfit)", fontWeight: 700, color: s.color, marginTop: 6 }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
                {[
                  { t: "#1289", name: "Olivia M.", items: "2× Margherita · 1× Garlic bread", total: "$42.50", status: "New", statusColor: "var(--green)" },
                  { t: "#1288", name: "James K.", items: "1× Wagyu burger · 1× Fries · Coke", total: "$31.80", status: "Cooking", statusColor: "var(--orange)" },
                  { t: "#1287", name: "Priya S.", items: "3× Pad thai · 2× Spring rolls", total: "$58.40", status: "Out for delivery", statusColor: "var(--steel)" },
                ].map((o) => (
                  <div
                    key={o.t}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "var(--navy-40)",
                      border: "1px solid var(--mist-6)",
                      display: "grid",
                      gridTemplateColumns: "70px 1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12 }}>{o.t}</div>
                    <div>
                      <div style={{ color: "var(--cloud)", fontWeight: 600 }}>{o.name}</div>
                      <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>{o.items}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700 }}>{o.total}</div>
                    <div
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        color: o.statusColor,
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${o.statusColor === "var(--steel)" ? "var(--mist-12)" : "rgba(0,182,122,0.25)"}`,
                      }}
                    >
                      {o.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .hero-mock { grid-template-columns: 1fr !important; }
          .hero-mock > div:first-child { display: none !important; }
        }
      `}</style>
    </section>
  );
}
