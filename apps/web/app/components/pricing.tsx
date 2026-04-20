
const tiers = [
  {
    name: "Starter",
    price: "$49",
    period: "per month",
    tag: "For single-location cafés & takeaways",
    credits: "500 AI credits / month included",
    features: [
      "Up to 500 orders / month",
      "Storefront with custom subdomain",
      "Stripe Connect payouts",
      "Live order board & POS",
      "Email support",
    ],
    cta: "Start 1-month free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$99",
    period: "per month",
    tag: "Busy restaurants ready to scale",
    credits: "2,500 AI credits / month included",
    features: [
      "Unlimited orders",
      "Winback engine & CRM",
      "Smart delivery routing (Uber + DoorDash)",
      "AI campaign drafting & menu suggestions",
      "Custom domain support",
      "Priority chat support",
    ],
    cta: "Start 1-month free trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "let's talk",
    tag: "Multi-location groups & franchises",
    credits: "Volume credit pricing + rollover",
    features: [
      "Everything in Growth",
      "Multi-location dashboard",
      "Shared customer CRM across sites",
      "Dedicated account manager",
      "Custom integrations (Xero, POS, KDS)",
      "99.9% uptime SLA",
    ],
    cta: "Book a call",
    highlight: false,
  },
];

const creditExamples = [
  { label: "AI campaign draft (SMS or email copy)", cost: "1 credit" },
  { label: "AI menu optimisation suggestion", cost: "5 credits" },
  { label: "AI voice call (per minute, inbound order-taking)", cost: "10 credits" },
  { label: "AI review reply draft", cost: "1 credit" },
];

const topUpPacks = [
  { size: "1,000 credits", price: "$19", per: "1.9¢ / credit" },
  { size: "5,000 credits", price: "$79", per: "1.6¢ / credit" },
  { size: "25,000 credits", price: "$299", per: "1.2¢ / credit" },
];

export function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Simple pricing · AI-powered</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            One subscription. AI credits when you need them.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Your monthly plan covers the full platform — POS, ordering, CRM, delivery,
            reporting. AI features run on credits so you only pay for the AI you actually
            use. Every plan ships with a generous monthly credit allowance.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              className="glass"
              style={{
                padding: 32,
                border: t.highlight ? "1px solid var(--green)" : undefined,
                boxShadow: t.highlight ? "0 0 0 4px rgba(0,182,122,0.15), 0 20px 60px rgba(0,0,0,0.3)" : undefined,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {t.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "5px 14px",
                    borderRadius: 999,
                    background: "var(--green)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Most popular
                </div>
              )}
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
                {t.name}
              </div>
              <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 22 }}>{t.tag}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 44, color: "var(--cloud)" }}>
                  {t.price}
                </span>
              </div>
              <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 14 }}>{t.period}</div>

              {/* AI credit pill */}
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(0,182,122,0.10)",
                  border: "1px solid rgba(0,182,122,0.28)",
                  color: "var(--green)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 22,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span aria-hidden>⚡</span> {t.credits}
              </div>

              <ul style={{ listStyle: "none", display: "grid", gap: 12, marginBottom: 28 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--cloud)" }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: "var(--green-15)",
                        color: "var(--green)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={t.name === "Scale" ? "mailto:hello@zentrabite.com.au?subject=Scale%20plan%20enquiry" : "/contact"}
                className={t.highlight ? "btn-primary" : "btn-secondary"}
                style={{ marginTop: "auto", justifyContent: "center" }}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>

        {/* What an AI credit buys */}
        <div
          style={{
            maxWidth: 1100,
            margin: "56px auto 0",
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 28,
          }}
          className="credit-grid"
        >
          <div
            className="glass"
            style={{ padding: 28 }}
          >
            <div className="eyebrow" style={{ marginBottom: 14 }}>What 1 AI credit buys</div>
            <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
              {creditExamples.map((c) => (
                <li
                  key={c.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--mist-9)",
                    fontSize: 14.5,
                    color: "var(--cloud)",
                  }}
                >
                  <span>{c.label}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--green)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {c.cost}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 14 }}>
              Unused credits roll over for 30 days. Buy top-up packs anytime — never expire on Scale.
            </div>
          </div>

          <div
            className="glass"
            style={{
              padding: 28,
              background:
                "linear-gradient(135deg, rgba(0,182,122,0.10), rgba(28,45,72,0.55))",
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 14 }}>Top-up credit packs</div>
            <ul style={{ listStyle: "none", display: "grid", gap: 14 }}>
              {topUpPacks.map((p) => (
                <li
                  key={p.size}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-6)",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--cloud)", fontWeight: 700, fontSize: 15 }}>{p.size}</div>
                    <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>{p.per}</div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-outfit)",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "var(--green)",
                    }}
                  >
                    {p.price}
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 14 }}>
              Buy top-ups in-app from the Billing page. Transparent invoicing — every credit shows exactly what it powered.
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "var(--steel)" }}>
          All plans include: unlimited staff logins · free onboarding · Australian GST-ready reporting · 0% commission on storefront orders
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .credit-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}


