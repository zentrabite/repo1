import Link from "next/link";

// Homepage pricing strip — intentionally small.
// Full tailored-pricing explanation lives at /pricing.

export function PricingTeaser() {
  return (
    <section id="pricing" className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div
          className="glass"
          style={{
            padding: 32,
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
            border: "1px solid rgba(0,182,122,0.3)",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Pricing
          </div>
          <div
            style={{
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--cloud)",
              marginBottom: 8,
            }}
          >
            Tailored to your business — not a flat tier.
          </div>
          <div
            style={{
              color: "var(--steel)",
              fontSize: 14.5,
              maxWidth: 480,
              margin: "0 auto 20px",
              lineHeight: 1.55,
            }}
          >
            Every business is different. Book a 20-min call and we'll quote you
            the same day.
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/contact"
              className="btn-primary"
              style={{ padding: "12px 22px", fontSize: 14.5 }}
            >
              Book a call →
            </Link>
            <Link
              href="/pricing"
              className="btn-secondary"
              style={{ padding: "12px 22px", fontSize: 14.5 }}
            >
              How it works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
