export function AIBrain() {
  return (
    <section id="ai-brain" className="section" style={{ paddingTop: 112, position: "relative" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 48px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            The Business Intelligence Layer
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            An AI co-pilot that actually runs the business.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Every sale, booking, customer and stock movement feeds the ZentraBite brain.
            It doesn't just show you dashboards — it tells you what's working, what's
            breaking, and the three things you should do today to make more money.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 1fr",
            gap: 32,
            alignItems: "stretch",
          }}
          className="ai-brain-grid"
        >
          {/* LEFT: Daily email preview */}
          <div
            className="glass"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: 20,
              boxShadow: "0 30px 80px rgba(0,0,0,0.35), 0 0 0 1px var(--mist-9)",
            }}
          >
            {/* Email chrome */}
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
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
              </div>
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
                inbox → ZentraBite · 7:00am
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 6 }}>
                From: <span style={{ color: "var(--cloud)" }}>brain@zentrabite.com</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cloud)", marginBottom: 2 }}>
                Your daily brief — Monday, 20 April
              </div>
              <div style={{ fontSize: 12.5, color: "var(--steel)", marginBottom: 20 }}>
                You made <span style={{ color: "var(--green)", fontWeight: 600 }}>$3,248 yesterday</span>{" "}
                · 14% above your 30-day average
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  {
                    tone: "win",
                    title: "Winback recovered $840 last week",
                    body: "Your lapsed-customer SMS flow brought 22 orders back. Want to boost it to weekly?",
                  },
                  {
                    tone: "alert",
                    title: "Stock alert · Chicken thigh",
                    body: "You'll run out in 2 days. AI suggests reordering 18kg from Meatworks AU — $312.",
                  },
                  {
                    tone: "alert",
                    title: "5 high-value customers haven't ordered in 21 days",
                    body: "Combined LTV: $4,120. Send a personalised winback? One click.",
                  },
                  {
                    tone: "opportunity",
                    title: "Opportunity · Upsell on combos",
                    body: "82% of Margherita orders don't add a drink. Add a drink bundle — projected +$1,800/mo.",
                  },
                  {
                    tone: "win",
                    title: "Best day to staff up: Friday 6–8pm",
                    body: "Demand rising 18% week-on-week. Consider +1 front-of-house shift.",
                  },
                ].map((row) => (
                  <div
                    key={row.title}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "var(--navy-40)",
                      border: `1px solid ${
                        row.tone === "alert"
                          ? "rgba(255,107,53,0.35)"
                          : row.tone === "win"
                          ? "rgba(0,182,122,0.35)"
                          : "var(--mist-9)"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          row.tone === "alert"
                            ? "var(--orange)"
                            : row.tone === "win"
                            ? "var(--green)"
                            : "var(--cloud)",
                        marginBottom: 4,
                      }}
                    >
                      {row.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--steel)", lineHeight: 1.5 }}>{row.body}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px dashed var(--mist-9)",
                  fontSize: 12,
                  color: "var(--steel)",
                }}
              >
                Sent daily to every owner. Reply <span style={{ color: "var(--green)" }}>"act"</span>{" "}
                and ZentraBite will execute the recommendation.
              </div>
            </div>
          </div>

          {/* RIGHT: AI capabilities */}
          <div style={{ display: "grid", gap: 16, gridTemplateRows: "auto auto auto auto" }}>
            {[
              {
                icon: "🧠",
                title: "Predictive insights, not just reports",
                body: "Forecasts next week's sales, demand per item, and staffing gaps — from your actual data, not guesswork.",
              },
              {
                icon: "📦",
                title: "Inventory & stock take intelligence",
                body: "Tracks stock, expiry, deliveries, and reorder triggers. Predicts waste before it happens.",
              },
              {
                icon: "📬",
                title: "Daily automated reports",
                body: "KPI summary, AI insights, and a short action list in your inbox every morning at 7am.",
              },
              {
                icon: "🎯",
                title: "Actionable recommendations",
                body: "One-click execution: run a winback, order stock, tweak a menu item, boost a campaign.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="glass"
                style={{ padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--green-15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--cloud)", marginBottom: 6 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--steel)", lineHeight: 1.55 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ai-brain-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
