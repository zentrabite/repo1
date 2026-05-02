"use client";

import { useState } from "react";

const items = [
  {
    q: "How long does it take to go live?",
    a: "Most restaurants are fully onboarded in under 48 hours. Upload your menu, connect Stripe, set your delivery radius, and you're taking orders. Our team handles the setup call free of charge.",
  },
  {
    q: "Do I keep all my customer data?",
    a: "Yes. Every customer that orders through your storefront is yours — full contact details, order history, and preferences. If you ever leave ZentraBite you walk out the door with a CSV of everyone.",
  },
  {
    q: "What does 'commission-free' actually mean?",
    a: "You pay our flat monthly fee plus Stripe's standard card processing (1.75% + 30c in AU). That's it. No per-order take, no delivery markup, no hidden fees. Uber Eats charges 15–30% per order — we charge zero.",
  },
  {
    q: "Can I still use Uber Eats / DoorDash alongside?",
    a: "Absolutely. Many merchants run us parallel to the aggregators and funnel repeat customers to their ZentraBite storefront over time using our SMS win-back flows. Our delivery engine can even dispatch to Uber Direct and DoorDash Drive when your own driver is busy.",
  },
  {
    q: "What payment methods do customers have?",
    a: "Cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and Link. All processed through Stripe, money lands in your bank daily.",
  },
  {
    q: "Do I need a POS already?",
    a: "No — ZentraBite includes a built-in POS for in-store orders so a single screen runs dine-in, takeaway, and online. If you have an existing POS you like, we can integrate with it — ask us for a tailored quote.",
  },
  {
    q: "What about GST and accounting?",
    a: "Every report is GST-ready. Export to Xero or download a reconciled CSV for your accountant at the end of the month. Payouts, fees, refunds, and tips all line up.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section" style={{ background: "rgba(28,45,72,0.18)" }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Questions</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)" }}>
            Answered.
          </h2>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="glass"
                style={{ padding: 0, overflow: "hidden" }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "22px 26px",
                    background: "transparent",
                    border: "none",
                    color: "var(--cloud)",
                    fontFamily: "inherit",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  {item.q}
                  <span
                    aria-hidden
                    style={{
                      fontSize: 22,
                      color: "var(--green)",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 26px 22px",
                      color: "var(--steel)",
                      fontSize: 15,
                      lineHeight: 1.65,
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
