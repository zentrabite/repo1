"use client";

import Link from "next/link";
import { useBusinessType, type BusinessType } from "./business-type";

// 2. The green band. The hero's CRM screen runs down into it. First the four
// true things, then "why not just use the delivery apps?": what an app or
// marketplace does, what your own site does, and keep the apps running while
// your regulars move across. Green with near-black words.

const HEAD: Record<BusinessType, string> = {
  order: "Keep the order and the customer.",
  book: "Keep the booking and the client.",
  quote: "Keep the job and the customer.",
};

const THEM: Record<BusinessType, string> = {
  order: "On a delivery app or marketplace, they take a cut of every sale and keep the customer's details. On your own site, you keep both.",
  book: "On a booking app, many charge for the bookings they send you and keep the client's details. On your own site, you keep both.",
  quote: "On a lead site, you pay for the leads they send you and they keep the customer's details. On your own site, you keep both.",
};

const KEEP: Record<BusinessType, string> = {
  order: "Keep Uber Eats or your marketplace running while your regulars move across.",
  book: "Keep your booking app running while your regulars move across.",
  quote: "Keep your lead sites running while your regulars come to you direct.",
};

const TICKS = [
  "No commission on direct orders",
  "Your customer list is yours",
  "Built in Adelaide",
  "1-month free trial at launch",
];

function Tick() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function KeepEarnings() {
  const { type } = useBusinessType();
  return (
    <section className="hm-green" aria-labelledby="keep-title">
      <div className="wrap">
        <ul className="hm-ticks" aria-label="What's true" data-reveal>
          {TICKS.map((t, i) => (
            <li key={t} data-r style={{ "--i": i } as React.CSSProperties}>
              <Tick />
              {t}
            </li>
          ))}
        </ul>
        <div className="hm-keep-grid">
          <h2 id="keep-title" className="hm-h2">
            <span key={type} className="hm-swap">
              {HEAD[type]}
            </span>
          </h2>
          <div className="hm-keep-text">
            <p>
              <span key={type} className="hm-swap">
                {THEM[type]}
              </span>
            </p>
            <p>
              <span key={type} className="hm-swap">
                {KEEP[type]}
              </span>{" "}
              You pay a monthly fee and Stripe&apos;s card fees, and every customer is yours to export any time.
            </p>
            <Link href="/features/storefronts" className="hm-link">
              See how your own site works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
