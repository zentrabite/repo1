"use client";

import { useBusinessType, type BusinessType } from "./business-type";

// 4. Keep what you earn. Answers "why not just use the delivery apps?" side by
// side: what a delivery app does, then what your own site does. Then: keep
// the delivery apps running while regulars move across.

const HEAD: Record<BusinessType, string> = {
  food: "No commission on your direct orders.",
  shops: "No commission on your direct orders.",
  salons: "No commission on your bookings.",
  trades: "No commission on your jobs.",
};

const THEM: Record<BusinessType, { name: string; text: string }> = {
  food: { name: "On a delivery app", text: "They take a cut of every order. The customer's details stay with them." },
  shops: { name: "On a marketplace", text: "They take a cut of every sale. The customer's details stay with them." },
  salons: { name: "On a booking app", text: "Many charge for bookings they send you. The client's details stay with them." },
  trades: { name: "On a lead site", text: "You pay for the leads they send you. The customer's details stay with them." },
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
    <section className="hm-keep" aria-labelledby="keep-title" data-reveal>
      <div className="wrap">
        <h2 id="keep-title" className="hm-h2 hm-keep-h" data-r style={{ "--i": 0 } as React.CSSProperties}>
          <span key={type} className="hm-swap">
            {HEAD[type]}
          </span>
        </h2>
        <div className="hm-keep-cols">
          <div className="hm-keep-card" data-r style={{ "--i": 1 } as React.CSSProperties}>
            <h3 className="hm-h3">
              <span key={type} className="hm-swap">
                {THEM[type].name}
              </span>
            </h3>
            <p>
              <span key={type} className="hm-swap">
                {THEM[type].text}
              </span>
            </p>
          </div>
          <div className="hm-keep-card on-navy" data-r style={{ "--i": 2 } as React.CSSProperties}>
            <h3 className="hm-h3">On your own site</h3>
            <p>You pay a monthly fee and Stripe&apos;s card fees. Every customer is yours to export any time.</p>
          </div>
        </div>
        <p className="hm-keep-line" data-r style={{ "--i": 3 } as React.CSSProperties}>
          <span key={type} className="hm-swap">
            {KEEP[type]}
          </span>
        </p>
      </div>
    </section>
  );
}
