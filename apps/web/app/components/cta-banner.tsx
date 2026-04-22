
export function CTABanner() {
  return (
    <section className="section" style={{ paddingBottom: 120 }}>
      <div className="container">
        <div
          className="glass cta-banner-card"
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
            Let's build it around your business.
          </h2>
          <p style={{ fontSize: 16, color: "var(--cloud)", opacity: 0.85, maxWidth: 520, margin: "0 auto 28px" }}>
            Pricing is tailored to what you actually need. 20-minute call to scope it.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a href="/contact" className="btn-primary" style={{ padding: "15px 30px", fontSize: 16 }}>
              Book a call
              <span aria-hidden>→</span>
            </a>
            <a href="/demo" className="btn-secondary" style={{ padding: "14px 28px", fontSize: 16 }}>
              See the demo
            </a>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .cta-banner-card { padding: 40px 24px !important; }
        }
      `}</style>
    </section>
  );
}


