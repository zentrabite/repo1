
export function Hero() {
  return (
    <section
      className="grid-bg hero-section"
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
        <div style={{ textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          <div className="eyebrow" style={{ marginBottom: 22 }}>
            Business Operating System
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
            One system to run, grow,
            <br />
            <span style={{ color: "var(--green)", WebkitTextFillColor: "var(--green)" }}>
              and scale your business.
            </span>
          </h1>
          <p
            style={{
              fontSize: "clamp(17px, 1.6vw, 20px)",
              color: "var(--steel)",
              maxWidth: 620,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            One place for orders, customers and stock. An AI co-pilot tells you
            what to do next.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            <a href="/contact" className="btn-primary" style={{ padding: "15px 30px", fontSize: 16 }}>
              Book a call
              <span aria-hidden>→</span>
            </a>
            <a href="/demo" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
              ▶ Watch the 90-second demo
            </a>
          </div>
          <div style={{ marginTop: 18, fontSize: 13, color: "var(--steel)" }}>
            Works for any food-service business · Pricing tailored to you
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
                  { label: "Zentra Rewards", active: false },
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
                <div className="hero-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
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
                      gridTemplateColumns: "60px 1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                    }}
                    className="hero-order-row"
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
        @media (max-width: 820px) {
          .hero-section { padding-top: 120px !important; padding-bottom: 64px !important; }
        }
        @media (max-width: 720px) {
          .hero-mock { grid-template-columns: 1fr !important; padding: 16px !important; }
          .hero-mock > div:first-child { display: none !important; }
          .hero-stats { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .hero-section { padding-top: 104px !important; padding-bottom: 48px !important; }
          .hero-stats { grid-template-columns: 1fr !important; }
          .hero-order-row {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            column-gap: 10px !important;
            row-gap: 6px !important;
          }
          .hero-order-row > div:nth-child(2) { flex: 1 1 100%; order: 3; }
          .hero-order-row > div:nth-child(3) { margin-left: auto; }
        }
      `}</style>
    </section>
  );
}


