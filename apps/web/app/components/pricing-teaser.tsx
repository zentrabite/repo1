import Link from "next/link";

export function PricingTeaser() {
  return (
    <section id="pricing" className="section">
      <div className="container" style={{ maxWidth: 1100 }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 44px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Tailored — not templated</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            Honest pricing. Priced to your business.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            A personal trainer doesn't need driver dispatch. A 10-location restaurant
            doesn't want a 1-location plan. Pricing flexes with the modules you enable,
            your order volume, and your AI usage — no inflated public tier.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {[
            {
              icon: "🧩",
              title: "Only what you turn on",
              body: "Pick from 10 modules (orders, loyalty, AI calls, stock, drivers, campaigns…). Disabled modules vanish from your CRM.",
            },
            {
              icon: "📈",
              title: "Volume that reflects usage",
              body: "Gentle uplifts at higher order volumes — so infra cost stays honest without hitting small operators.",
            },
            {
              icon: "⚡",
              title: "AI on credits you see",
              body: "Every AI action logs exactly what it cost. Unused credits roll over 30 days.",
            },
            {
              icon: "🎁",
              title: "1 month free — no card",
              body: "Every module enabled during the trial. We only charge when you're convinced it's worth it.",
            },
          ].map((c) => (
            <div key={c.title} className="glass" style={{ padding: 22 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--cloud)", marginBottom: 4 }}>{c.title}</div>
              <div style={{ color: "var(--steel)", fontSize: 13.5, lineHeight: 1.6 }}>{c.body}</div>
            </div>
          ))}
        </div>

        <div
          className="glass"
          style={{
            padding: 32,
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
            border: "1px solid rgba(0,182,122,0.3)",
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, marginBottom: 6 }}>
            Try the live pricing estimator.
          </div>
          <div style={{ color: "var(--steel)", maxWidth: 520, margin: "0 auto 20px" }}>
            Pick modules, set your volume, drag the AI slider — see your monthly
            range instantly.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/pricing" className="btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
              Open the estimator →
            </Link>
            <Link href="/contact" className="btn-secondary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
              Get a tailored quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
