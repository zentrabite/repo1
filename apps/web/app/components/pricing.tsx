import { SIGNUP_URL } from "../../lib/config";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    period: "per month",
    tag: "For single-location cafés & takeaways",
    features: [
      "Up to 500 orders / month",
      "Storefront with custom subdomain",
      "Stripe Connect payouts",
      "Live order board & POS",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$99",
    period: "per month",
    tag: "Busy restaurants ready to scale",
    features: [
      "Unlimited orders",
      "Winback engine & CRM",
      "SMS automations (500 / mo incl.)",
      "Smart delivery routing (Uber + DoorDash)",
      "Custom domain support",
      "Priority chat support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "let's talk",
    tag: "Multi-location groups & franchises",
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

export function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Simple pricing</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            Priced to pay for itself in a week.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            No per-order commissions. No take rate. One predictable monthly fee and
            you keep the rest.
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
              <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 28 }}>{t.period}</div>
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
                href={t.name === "Scale" ? "mailto:hello@zentrabite.com.au?subject=Scale%20plan%20enquiry" : SIGNUP_URL}
                className={t.highlight ? "btn-primary" : "btn-secondary"}
                style={{ marginTop: "auto", justifyContent: "center" }}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "var(--steel)" }}>
          All plans include: unlimited staff logins · free onboarding · Australian GST-ready reporting
        </div>
      </div>
    </section>
  );
}
