const REVENUE_PILLARS = [
  {
    icon: "📈",
    label: "Upsells",
    title: "Add revenue to every order",
    body: "Smart bundles, drink add-ons, and combo prompts surface at the right moment in checkout — proven to lift average ticket by 12–18%.",
    metric: "+14% average ticket",
  },
  {
    icon: "🤝",
    label: "Referrals",
    title: "Turn customers into your best channel",
    body: "Built-in referral codes with shareable links, automatic credit, and tracking — no extra tool or developer needed.",
    metric: "1 in 6 invites convert",
  },
  {
    icon: "🔄",
    label: "Subscriptions",
    title: "Predictable monthly revenue",
    body: "Sell weekly meal plans, monthly memberships, or recurring service packs. Stripe-powered, instantly live on your storefront.",
    metric: "Recurring MRR built in",
  },
  {
    icon: "💌",
    label: "Reactivation",
    title: "Win back lapsed customers",
    body: "AI segments customers who haven't ordered in 30/60/90 days and triggers personalised SMS + email flows automatically.",
    metric: "$3.40 ROI per $1 spent",
  },
  {
    icon: "🛒",
    label: "Missed revenue recovery",
    title: "Don't leave money on the table",
    body: "Abandoned carts, failed payments, no-show bookings — all flagged and recovered with one-tap automations.",
    metric: "8–12% of sales recovered",
  },
  {
    icon: "📦",
    label: "Stock intelligence",
    title: "Cut waste. Never stock out.",
    body: "AI par levels, expiry tracking and auto-reorder suggestions — based on real demand, not guesswork.",
    metric: "−22% food & stock waste",
  },
];

const CUSTOMER_VALUE = [
  {
    icon: "💎",
    title: "Lifetime value tracking",
    body: "Every customer has a live LTV, frequency, and last-seen date. Sort by VIP, at-risk, or new in seconds.",
  },
  {
    icon: "📉",
    title: "Churn detection",
    body: "AI flags customers slipping away before they actually leave — based on order cadence, spend trend, and engagement.",
  },
  {
    icon: "🤖",
    title: "Re-engagement automation",
    body: "Trigger personalised winback flows by segment. Test offers automatically and let the AI pick the winner.",
  },
];

export function RevenueEngine() {
  return (
    <section id="revenue" className="section" style={{ paddingTop: 112 }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            The Revenue Engine
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            Built to make you more money — not just track it.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Other software reports the past. ZentraBite moves the numbers — more
            tickets, more repeats, less leakage.
          </p>
        </div>

        {/* Revenue pillars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {REVENUE_PILLARS.map((p) => (
            <div
              key={p.label}
              className="glass"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                  {p.icon}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--steel)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  {p.label}
                </div>
              </div>
              <h3 style={{ fontSize: 16.5, margin: 0, color: "var(--cloud)" }}>{p.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--steel)", lineHeight: 1.55, margin: 0, flex: 1 }}>
                {p.body}
              </p>
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 12,
                  borderTop: "1px dashed var(--mist-9)",
                  fontSize: 13,
                  color: "var(--green)",
                  fontWeight: 700,
                  fontFamily: "var(--font-outfit)",
                }}
              >
                {p.metric}
              </div>
            </div>
          ))}
        </div>

        {/* Customer Value Engine */}
        <div
          className="glass"
          style={{
            marginTop: 56,
            padding: 36,
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 36,
            alignItems: "center",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 14, color: "var(--orange)" }}>
              Customer Value Engine
            </div>
            <h3 style={{ fontSize: 26, margin: "0 0 14px", color: "var(--cloud)", lineHeight: 1.2 }}>
              Stop chasing new customers. Squeeze more from the ones you already have.
            </h3>
            <p style={{ fontSize: 15, color: "var(--steel)", lineHeight: 1.65 }}>
              Keeping a customer is 5–7× cheaper than finding a new one. The CRM
              tracks lifetime value, spots churn early and runs winback on autopilot.
            </p>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {CUSTOMER_VALUE.map((c) => (
              <div
                key={c.title}
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "var(--navy-40)",
                  border: "1px solid var(--mist-6)",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--green-15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--cloud)", marginBottom: 4 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--steel)", lineHeight: 1.55 }}>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            #revenue .glass[style*="grid-template-columns: 1fr 1.4fr"] {
              grid-template-columns: 1fr !important;
              padding: 24px !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}


