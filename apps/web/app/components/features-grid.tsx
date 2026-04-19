const features = [
  {
    icon: "🖥️",
    title: "Integrated POS system",
    body: "Dine-in, takeaway, and online orders on one screen. Split bills, apply discounts, print kitchen tickets, run end-of-day reports — no separate terminal or fees.",
  },
  {
    icon: "📱",
    title: "Custom mobile app — built for you",
    body: "We design, build, and launch your own branded iOS and Android app. Push notifications, saved cards, loyalty built in. You keep the app, the customers, and the data.",
    tag: "Done-for-you",
  },
  {
    icon: "🌐",
    title: "Custom website — built for you",
    body: "Beautiful, fast, SEO-ready restaurant website with your menu, photos, and online ordering wired up on day one. You approve a design, we ship it in under two weeks.",
    tag: "Done-for-you",
  },
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
    icon: "💬",
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
] as const;

type Feature = (typeof features)[number];

export function FeaturesGrid() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Everything you need, nothing you don't
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            One platform. Every part of service.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Stop stitching together five tools for one restaurant. ZentraBite gives
            you the POS, the ordering page, the loyalty app, the SMS tool, and the
            delivery dispatcher — and we'll even build your custom website and mobile
            app on top.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f: Feature) => {
            const tag = "tag" in f ? f.tag : undefined;
            return (
              <div
                key={f.title}
                className="glass"
                style={{ padding: 28, position: "relative" }}
              >
                {tag && (
                  <span
                    style={{
                      position: "absolute",
                      top: 18,
                      right: 18,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--orange)",
                      padding: "4px 9px",
                      borderRadius: 999,
                      background: "rgba(255,107,53,0.12)",
                      border: "1px solid rgba(255,107,53,0.35)",
                    }}
                  >
                    {tag}
                  </span>
                )}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
