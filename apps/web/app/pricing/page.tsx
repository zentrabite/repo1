import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Pricing is set to your business and the modules you use. Book a call and we'll work out a plan that fits.",
  alternates: { canonical: "/pricing" },
};

const INCLUDED = [
  "No commission on your direct orders",
  "Setup done with you, starting from your current website",
  "Your customer list, which you can export whenever you like",
  "Reports with GST, ready for Xero or your accountant",
  "Logins for your staff",
];

const QUESTIONS = [
  {
    q: "Why isn't there a price list?",
    a: "Businesses use very different parts of ZentraBite. A personal trainer doesn't need delivery, and a takeaway doesn't need class bookings. So the price depends on what you switch on.",
  },
  {
    q: "Do I pay per order?",
    a: "No. There's no commission on orders through your own site. Stripe's normal card fees still apply, the same as anywhere else you take cards.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. There'll be a 1-month free trial when ZentraBite opens for sign-ups.",
  },
  {
    q: "Can I change what I use later?",
    a: "Yes. You can switch parts on or off as your business changes, and we'll adjust the plan.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="page-top">
          <div className="container cols-2" style={{ alignItems: "start" }}>
            <div>
              <span className="label">Pricing</span>
              <h1 className="h-page">Priced for your business.</h1>
              <p className="lead" style={{ marginTop: 20 }}>
                You pay for the parts you use. Tell us how your business runs and we&apos;ll put together a plan and
                a price.
              </p>
              <div className="btn-row" style={{ marginTop: 28 }}>
                <Link href="/contact" className="btn-primary btn-lg">
                  Book a call
                </Link>
                <Link href="/demo" className="btn-secondary btn-lg">
                  Try the demo
                </Link>
              </div>
            </div>
            <div className="aside-box">
              <h2 className="h-card" style={{ marginBottom: 16 }}>
                Every plan includes
              </h2>
              <ul className="tick-list">
                {INCLUDED.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container narrow">
            <div className="section-head">
              <h2 className="h-section">Pricing questions</h2>
            </div>
            <div className="faq">
              {QUESTIONS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p className="faq-a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
