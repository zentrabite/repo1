export function V4Cta() {
  return (
    <section id="v4-cta">
      <div
        className="s-eyebrow reveal"
        style={{ margin: "0 auto 20px", display: "inline-flex" }}
      >
        Ready to grow?
      </div>
      <h2 className="cta-h reveal d1">
        Start your <span style={{ color: "var(--g)" }}>1-month free trial</span>{" "}
        today.
      </h2>
      <p className="cta-sub reveal d2">
        No credit card. No lock-in. Pricing tailored to your business after
        your trial.
      </p>
      <div
        style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
        className="reveal d3"
      >
        <a
          href="/contact"
          className="btn-lg p"
          style={{ padding: "16px 38px", fontSize: 16 }}
        >
          Book a call with us →
        </a>
        <a
          href="#storytelling"
          className="btn-lg s"
          style={{ padding: "15px 28px", fontSize: 15 }}
        >
          Explore the platform
        </a>
      </div>
      <p className="cta-note reveal">
        Works for restaurants, cafés, food trucks, retail, services, and more.
      </p>
    </section>
  );
}
