"use client";

import { useBusinessType, type BusinessType } from "./business-type";

// 4. Keep what you earn. Answers "why not just use the delivery apps?" with the
// orders board itself: your own site, the mobile app, the counter, Uber Eats
// and DoorDash in one list.

const HEAD: Record<BusinessType, string> = {
  food: "No commission on your direct orders.",
  shops: "No commission on your direct orders.",
  salons: "No commission on your bookings.",
  trades: "No commission on your jobs.",
};

const KEEP: Record<BusinessType, string> = {
  food: "Keep Uber Eats running while your regulars move across.",
  shops: "Keep selling on marketplaces while your regulars move across.",
  salons: "Keep your booking app running while your regulars move across.",
  trades: "Keep your lead sites running while your regulars come to you direct.",
};

export function KeepEarnings() {
  const { type } = useBusinessType();
  return (
    <section className="hm-keep on-navy" data-nav-tone="navy" aria-labelledby="keep-title" data-reveal>
      <div className="wrap hm-keep-grid">
        <div className="hm-keep-text">
          <h2 id="keep-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            <span key={type} className="hm-swap">
              {HEAD[type]}
            </span>
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            You pay a monthly fee and Stripe&apos;s card fees. Your customer list is yours to export any time.
          </p>
          <p className="hm-keep-line" data-r style={{ "--i": 2 } as React.CSSProperties}>
            <span key={type} className="hm-swap">
              {KEEP[type]}
            </span>
          </p>
        </div>
        <figure className="hm-keep-fig" data-r style={{ "--i": 3 } as React.CSSProperties}>
          <div className="hm-keep-frame" data-ui>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/hero/orders-channels.webp"
              width={1416}
              height={702}
              loading="lazy"
              decoding="async"
              alt="The ZentraBite orders board. Orders from the mobile app, the restaurant's own site, the POS, Uber Eats and DoorDash sit in one list, each with its status."
            />
          </div>
          <figcaption>Your orders board, with every channel in one list. Our demo restaurant, sample data.</figcaption>
        </figure>
      </div>
    </section>
  );
}
