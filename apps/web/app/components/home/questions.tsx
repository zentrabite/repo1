import Link from "next/link";
import { AskAssistant } from "../assistant-trigger";

// 8. Questions. Every answer is on show, one band per question, so nobody has
// to open anything to find out. The website assistant is one line at the end.

const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can I sign up now?",
    a: "Not yet. We're starting with a small group of local businesses. Book a call and we'll tell you when sign-ups open. There'll be a 1-month free trial at launch.",
  },
  {
    q: "Is it only for restaurants?",
    a: "No. It started with food, and it also suits shops, salons, barbers, gyms, personal trainers and trades. You switch on the parts your business uses.",
  },
  {
    q: "Do I keep my customer list?",
    a: "Yes. Every customer who orders or books through your site is yours, with their contact details and history. If you ever leave, you take a file of all of them with you.",
  },
  {
    q: "What does no commission mean?",
    a: "You pay a monthly fee and Stripe's standard card fees. ZentraBite takes nothing from each order. Delivery apps take a cut of every order instead.",
  },
  {
    q: "Can I keep Uber Eats?",
    a: "Yes. Keep it running and move your regulars to your own site over time. Deliveries can go through Uber Direct or DoorDash Drive when your own driver is busy.",
  },
  {
    q: "How much does it cost?",
    a: (
      <>
        It depends on the parts you switch on. You pay a monthly fee for those, plus Stripe&apos;s card fees, and no
        commission.{" "}
        <Link href="/pricing" className="hm-link">
          How pricing works
        </Link>
      </>
    ),
  },
];

export function Questions() {
  return (
    <section id="questions" className="hm-faq" aria-labelledby="faq-title">
      <div className="wrap">
        <h2 id="faq-title" className="hm-h2">
          Questions
        </h2>
        <dl className="hm-faq-list" data-reveal>
          {ITEMS.map((item, i) => (
            <div key={item.q} className="hm-faq-row" data-r style={{ "--i": i } as React.CSSProperties}>
              <dt className="hm-h3">{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="hm-faq-ask">
          Something else? <AskAssistant className="hm-link">Ask the assistant</AskAssistant>
        </p>
      </div>
    </section>
  );
}
