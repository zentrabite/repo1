import Link from "next/link";

// The call to action at the bottom of most pages.
export function CTABanner({
  title = "Want to see it for your business?",
  body = "Book a 15-minute call. We'll show you how ZentraBite would work for your business and which parts you'd switch on.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="section tight">
      <div className="container">
        <div className="cta-band">
          <div>
            <h2 className="h-section">{title}</h2>
            <p>{body}</p>
          </div>
          <div className="btn-row">
            <Link href="/contact" className="btn-primary btn-lg">
              Book a call
            </Link>
            <Link href="/demo" className="btn-secondary btn-lg">
              Try the demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
