export function V4Hero() {
  return (
    <section id="v4-hero">
      <div className="hero-badge reveal">
        <span className="badge-pulse" />
        <span className="badge-txt">Business Operating System</span>
      </div>
      <h1 className="hero-h1 reveal">
        <span className="h1-white">One system to run, grow,</span>
        <br />
        <span className="h1-green">and scale your business.</span>
      </h1>
      <p className="hero-sub reveal d1">
        Orders, customers, stock, campaigns, and an AI co-pilot — all wired
        together from day one. Turn every first-time visitor into a lifetime
        regular.
      </p>
      <div className="hero-btns reveal d2">
        <a href="#v4-cta" className="btn-lg p">
          Start 1-month free trial →
        </a>
        <a href="#ai-chat" className="btn-lg s">
          <span aria-hidden>✨</span> Ask the AI
        </a>
      </div>
      <p className="hero-trust reveal d3">
        <span>✓ No credit card</span>
        <span className="trust-sep" />
        <span>✓ Any food-service business</span>
        <span className="trust-sep" />
        <span>✓ Pricing tailored to you</span>
      </p>
    </section>
  );
}
