"use client";

import { useState } from "react";

const items = [
  {
    q: "How long does it take to go live?",
    a: "We do most of the setup for you. Your details, hours, menu and logo are pulled in from your current website, then you check them, connect Stripe and you're ready to take orders.",
  },
  {
    q: "Do I keep all my customer data?",
    a: "Yes. Every customer who orders through your page is yours, with their contact details, order history and preferences. If you ever leave ZentraBite, you take a CSV of all of them with you.",
  },
  {
    q: "What does 'commission-free' mean?",
    a: "You pay a monthly fee and Stripe's standard card fees. ZentraBite takes nothing from each order and adds nothing to delivery. Delivery apps take a commission on every order instead.",
  },
  {
    q: "Can I still use Uber Eats / DoorDash alongside?",
    a: "Yes. You can keep the delivery apps running and move your regulars to your own ordering page over time with win-back texts. Delivery can go through Uber Direct or DoorDash Drive when your own driver is busy.",
  },
  {
    q: "What payment methods do customers have?",
    a: "Cards (Visa, Mastercard, Amex), Apple Pay and Google Pay, all through Stripe. Stripe pays the money into your bank account.",
  },
  {
    q: "Do I need a POS already?",
    a: "No. ZentraBite has a built-in POS, so one screen runs dine-in, takeaway and online orders. If you already have a POS you like, ask us and we'll talk through your options.",
  },
  {
    q: "What about GST and accounting?",
    a: "Reports show GST, and you can export a CSV for Xero or your accountant at the end of each month.",
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
