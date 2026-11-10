import Link from "next/link";

// 9. The close. Navy, running straight into the navy footer, so the page ends
// on one scene: the ask, then the name at full width.
export function Closing() {
  return (
    <section className="hm-close on-navy" data-nav-tone="navy" aria-labelledby="close-title" data-reveal>
      <div className="wrap hm-close-grid">
        <h2 id="close-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
          Want it for your business?
        </h2>
        <div className="hm-close-side">
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            Tell us what you run. We&apos;ll show you how it would work.
          </p>
          <div data-r style={{ "--i": 2 } as React.CSSProperties}>
            <Link href="/contact" className="btn-primary btn-lg">
              Book a call
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
