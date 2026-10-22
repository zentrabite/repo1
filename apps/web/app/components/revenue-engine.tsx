import { Expandable } from "./expandable";
import { Icon, type IconName } from "./zb-icon";

const REVENUE_PILLARS = [
  {
    icon: "growth" as IconName,
    label: "Upsells",
    title: "Add revenue to every order",
    body: "Smart bundles, drink add-ons, and combo prompts surface at the right moment in checkout.",
    metric: "Prompts at checkout",
  },
  {
    icon: "referral" as IconName,
    label: "Referrals",
    title: "Turn customers into your best channel",
    body: "Built-in referral codes with shareable links, automatic credit, and tracking — no extra tool or developer needed.",
    metric: "Shareable referral links",
  },
  {
    icon: "return" as IconName,
    label: "Subscriptions",
    title: "Predictable monthly revenue",
    body: "Sell weekly meal plans, monthly memberships, or recurring service packs. Stripe-powered, instantly live on your storefront.",
    metric: "Recurring MRR built in",
  },
  {
    icon: "email" as IconName,
    label: "Reactivation",
    title: "Win back lapsed customers",
    body: "AI segments customers who haven't ordered in 30/60/90 days and triggers personalised SMS + email flows automatically.",
    metric: "30, 60 and 90 day flows",
  },
  {
    icon: "storefront" as IconName,
    label: "Missed revenue recovery",
    title: "Don't leave money on the table",
    body: "Abandoned carts, failed payments, no-show bookings — all flagged and recovered with one-tap automations.",
    metric: "One-tap recovery",
  },
  {
    icon: "package" as IconName,
    label: "Stock intelligence",
    title: "Cut waste. Never stock out.",
    body: "AI par levels, expiry tracking and auto-reorder suggestions — based on real demand, not guesswork.",
    metric: "AI par levels",
  },
];

export function RevenueEngine() {
  return (
    <section id="revenue" className="section" style={{ paddingTop: 112 }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Revenue engine
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 10 }}>
            Built to grow your numbers — not just track them.
          </h2>
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
                  <Icon name={p.icon} size={22} />
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
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "var(--green)",
                  fontWeight: 700,
                  fontFamily: "var(--font-outfit)",
                }}
              >
                {p.metric}
              </div>
              <Expandable summary="How it works">
                {p.body}
              </Expandable>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


