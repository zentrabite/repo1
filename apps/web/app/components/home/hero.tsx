import Link from "next/link";

// 1. Hero. Navy in light and dark mode. Option B, picked 11 Nov: the
// headline, one sentence, the one action and three true things on the left.
// On the right, one big real screen of the CRM (the customer list) running
// off the edge, with the restaurant's own ordering site on a phone in front
// of it. On a phone the two sit side by side, the CRM cropped to a customer's
// profile. Both are our demo restaurant with sample data, and say so.

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hm-hero on-navy" data-nav-tone="navy" aria-labelledby="hero-title">
      <div className="wrap hm-hero-grid">
        <div className="hm-hero-text">
          <h1 id="hero-title" className="hm-h1">
            <span>Know your regulars.</span> <span>Notice when they stop coming.</span>
          </h1>
          <p className="hm-hero-lead">
            They order on your own site with no commission. Then they join your list, earn rewards and get a text if
            they go quiet.
          </p>
          <div className="hm-actions">
            <Link href="/contact" className="btn-primary btn-lg">
              Book a call
            </Link>
            <Link href="/demo/live" className="hm-link">
              Try the live demo
            </Link>
          </div>
          <ul className="hm-proof">
            <li>
              <Tick />
              No commission on your direct orders
            </li>
            <li>
              <Tick />
              Your customer list is yours to keep
            </li>
            <li>
              <Tick />
              Built in Adelaide
            </li>
          </ul>
        </div>

        <figure className="hm-hs">
          <div className="hm-hs-desk" data-ui>
            <picture>
              {/* On a phone, the CRM is a customer's profile instead of the whole list */}
              <source media="(max-width: 699px)" srcSet="/media/hero/crm-customer-profile-panel.webp" width={960} height={1762} />
              <img
                src="/media/app/customer-desktop.webp"
                width={1440}
                height={900}
                alt="The customer list in the ZentraBite CRM, with each customer's tier, contact details, spend and last order."
                fetchPriority="high"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
          <div className="hm-hs-phone" data-ui>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/hero/site-home-phone.webp"
              width={780}
              height={1688}
              alt="A restaurant's own ordering site on a phone, with its order button, hours and address."
              decoding="async"
              draggable={false}
            />
          </div>
          <figcaption>Their ordering site and your customer list. Our demo restaurant, sample data.</figcaption>
        </figure>
      </div>
    </section>
  );
}
