import Link from "next/link";

export function CTABanner() {
  return (
    <section className="section" style={{ paddingBottom: 120 }}>
      <div className="container">
        <div
          className="glass"
          style={{
            padding: "64px 48px",
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(0,182,122,0.22) 0%, rgba(28,45,72,0.55) 70%)",
            border: "1px solid rgba(0,182,122,0.35)",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: 18 }}>
            Ready to run your whole business on one system?
          </h2>
          <p style={{ fontSize: 17, color: "var(--cloud)", opacity: 0.85, maxWidth: 560, margin: "0 auto 32px" }}>
            One month free. No credit card. Tailored to your business size and the
            modules you actually need. Onboarded by a real human inside 48 hours.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/contact" className="btn-primary" style={{ padding: "15px 30px", fontSize: 16 }}>
              Start 1-month free trial
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/demo"
              className="btn-secondary"
              style={{ padding: "14px 28px", fontSize: 16 }}
            >
              See the demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
