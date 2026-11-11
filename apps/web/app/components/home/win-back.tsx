"use client";

import Link from "next/link";
import { useBusinessType, type BusinessType } from "./business-type";

// 4. Win-back, the payoff after the tour. A small cut of the real app (one
// campaign's panel) on a soft mint field, with the words beside it. Deon
// asked for this one on 11 Nov (from option D1). The words change with
// "What do you run?". The panel is our demo restaurant with sample data.

const HEAD: Record<BusinessType, string> = {
  food: "Notice when a regular stops coming.",
  shops: "Notice when a regular stops coming.",
  salons: "Notice when a client doesn't rebook.",
  trades: "Remind customers when they're due.",
};

const BODY: Record<BusinessType, string> = {
  food: "You pick how long counts as quiet and what the offer is. ZentraBite sends the text, and shows you who came back and what they spent.",
  shops: "You pick how long counts as quiet and what the offer is. ZentraBite sends the text, and shows you who came back and what they spent.",
  salons: "You pick how long counts as quiet and what the offer is. ZentraBite sends the text, and shows you who rebooked.",
  trades: "You pick the timing and the message. ZentraBite sends the reminder when the next service is due, and shows you who booked again.",
};

export function WinBack() {
  const { type } = useBusinessType();
  return (
    <section className="hm-wb" aria-labelledby="wb-title" data-reveal>
      <div className="wrap hm-wb-grid">
        <div className="hm-wb-text">
          <h2 id="wb-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            <span key={type} className="hm-swap">
              {HEAD[type]}
            </span>
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            <span key={type} className="hm-swap">
              {BODY[type]}
            </span>
          </p>
          <p data-r style={{ "--i": 2 } as React.CSSProperties}>
            <Link href="/features/winback" className="hm-link">
              See how win-back works
            </Link>
          </p>
        </div>
        <figure className="hm-wb-fig" data-r style={{ "--i": 1 } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-ui
            src="/media/hero/crm-winback-panel.webp"
            width={840}
            height={1204}
            alt="A win-back campaign in the CRM: a 30-day silent win-back by text, the message a quiet customer gets, and how many came back."
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <figcaption>Our demo restaurant, sample data.</figcaption>
        </figure>
      </div>
    </section>
  );
}
