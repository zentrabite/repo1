import Link from "next/link";

// 1. Hero. Picked 11 Nov (round 3): D2's layout with D1's headline, on white.
// The headline says what this is, then one sentence and the one action. Under it, one
// wide real screen of the CRM (the customer list) running down into the green
// band of the next section, with two cards laid on it: a regular, and the text
// a quiet customer gets. On a phone the screen is a customer's profile instead.
// All of it is our demo restaurant with sample data, and says so.

export function Hero() {
  return (
    <section className="hm-hero" aria-labelledby="hero-title">
      <div className="wrap hm-hero-top">
        <h1 id="hero-title" className="hm-h1">
          <span>A website and CRM</span> <span>for local businesses.</span>
        </h1>
        <p className="hm-hero-lead">Your own site takes the orders. Your customer list brings people back.</p>
        <div className="hm-actions">
          <Link href="/contact" className="btn-primary btn-lg">
            Book a call
          </Link>
          <Link href="/demo/live" className="hm-link">
            Try the live demo
          </Link>
        </div>
      </div>

      <div className="wrap hm-shot-wrap">
        <figure className="hm-shot">
          <div className="hm-shot-stage">
            <div className="hm-shot-screen" data-ui>
              <picture>
                {/* On a phone, the CRM is one customer's profile instead of the whole list */}
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
            <div className="hm-card hm-card-person" data-ui aria-hidden="true">
              <span className="hm-card-avatar">SD</span>
              <span className="hm-card-who">
                <b>Sofia De Luca</b>
                <span>VIP, 52 orders, $3,240 spent</span>
              </span>
            </div>
            <div className="hm-card hm-card-text" data-ui>
              <p className="hm-card-note">Text to Amelia, 34 days since her last order</p>
              <p className="hm-card-msg">Hey Amelia, we miss you. Here&apos;s 20% off your next order with us. Code: COMEBACK20</p>
            </div>
          </div>
          <figcaption>Our demo restaurant, sample data.</figcaption>
        </figure>
      </div>
    </section>
  );
}
