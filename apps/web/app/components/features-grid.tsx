const features = [
  {
    icon: "🧾",
    title: "Live order management",
    body: "Every incoming order beeps, toasts, and auto-refreshes — realtime across POS, kitchen, and dashboard. No more missed tickets.",
  },
  {
    icon: "🛍️",
    title: "Commission-free storefronts",
    body: "Your own branded ordering page. Keep 100% of the revenue Uber and DoorDash would have skimmed — pay only Stripe's standard fees.",
  },
  {
    icon: "🎁",
    title: "BiteBack loyalty",
    body: "Built-in rewards and tiers. Points accrue automatically on every order, redemptions apply at checkout — zero extra plugins.",
  },
  {
    icon: "🚚",
    title: "Smart delivery routing",
    body: "Auto-assign to your own driver, nearest rider, or fall through to Uber Direct / DoorDash Drive — whichever is cheapest right now.",
  },
  {
    icon: "📱",
    title: "SMS & email automations",
    body: "Win-back campaigns, abandoned-cart nudges, post-order receipts, review asks — all triggered the moment customer state changes.",
  },
  {
    icon: "💳",
    title: "Stripe Connect payouts",
    body: "Money lands in your bank account daily, not monthly. Full Connect onboarding, live balance, refunds, and disputes in one view.",
  },
  {
    icon: "📊",
    title: "Real financial reporting",
    body: "Revenue, fees, refunds, and payout reconciliation by channel. Export to Xero or CSV at the end of each month, GST-ready.",
  },
  {
    icon: "👥",
    title: "Customer CRM",
    body: "Every buyer is a saved contact with order history, lifetime value, favourite items, and birthday. Segment and target in a click.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Everything you need, nothing you don't
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            One platform. Every part of service.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Stop stitching together five tools for one restaurant. ZentraBite replaces
            your POS, your ordering page, your loyalty app, your SMS tool, and your
            delivery dispatcher.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="glass"
              style={{ padding: 28 }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--green-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  marginBottom: 18,
                }}
                aria-hidden
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 10, color: "var(--cloud)" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14.5, color: "var(--steel)", lineHeight: 1.6 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
