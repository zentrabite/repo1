import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { CTABanner } from "../components/cta-banner";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How ZentraBite connects your website, ordering, customer list, rewards and win-back texts, so each one feeds the next.",
  alternates: { canonical: "/how-it-works" },
};

const SETUP = [
  {
    title: "Book a call",
    body: "We talk through how your business runs and which parts you'd switch on. A café might want ordering and rewards. A barber might want bookings and rebooking texts.",
  },
  {
    title: "We bring in your details",
    body: "Give us your current website. We pull in your name, logo, colours, hours, photos and your menu or services, and flag anything we weren't sure about.",
  },
  {
    title: "You check it and connect Stripe",
    body: "Fix anything that's wrong, then connect Stripe so card payments go straight into your own bank account.",
  },
  {
    title: "Your site goes live",
    body: "At yourname.zentrabite.com, or on your own domain if you have one.",
  },
];

const FLOWS = [
  {
    title: "When a customer orders or books",
    points: [
      "They pay by card, Apple Pay or Google Pay through Stripe.",
      "The order appears on your orders board, and on the kitchen screen if you use one.",
      "The customer is saved to your list with what they bought and when.",
      "Rewards points are added to their account.",
      "Stock comes off for the items they bought, if you track stock.",
    ],
  },
  {
    title: "Bringing customers back",
    points: [
      "Customers earn points for every dollar and move up through Bronze, Silver and Gold.",
      "They get a birthday bonus if you switch it on.",
      "When a regular hasn't been in for a while, they get a text or email with an offer you've set.",
      "You can see who came back after each message.",
    ],
  },
  {
    title: "Seeing how it's going",
    points: [
      "Sales, top items and customer numbers by day, week and month.",
      "Reports that show GST, with exports for Xero or your accountant.",
      "An assistant you can ask about your own business, like who your best customers are this month.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="page-top">
          <div className="container">
            <div className="section-head">
              <span className="label">How it works</span>
              <h1 className="h-page">From the first order to the next visit.</h1>
              <p className="lead">
                Your website, ordering or bookings, customer list, rewards and texts all share the same records. So
                when a customer orders, everything else knows about it.
              </p>
            </div>
          </div>
        </section>

        <section className="section tight">
          <div className="container cols-2">
            <div>
              <h2 className="h-section">Getting set up</h2>
              <p className="muted" style={{ marginTop: 12 }}>
                We do most of it for you.
              </p>
            </div>
            <ol className="steps">
              {SETUP.map((s) => (
                <li key={s.title}>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {FLOWS.map((f, i) => (
          <section key={f.title} className={`section tight${i % 2 === 0 ? " alt" : ""}`}>
            <div className="container cols-2">
              <h2 className="h-section">{f.title}</h2>
              <ul className="tick-list" style={{ fontSize: 17 }}>
                {f.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="section tight">
          <div className="container cols-2">
            <h2 className="h-section">Only what you need</h2>
            <div className="prose">
              <p>
                Each part is switched on for your business, so you only see what you use. A hairdresser never sees a
                kitchen screen, and a takeaway doesn&apos;t need class timetables.
              </p>
              <p>
                You can turn parts on or off later as the business changes. See{" "}
                <Link href="/#features" className="text-link">
                  everything that&apos;s inside
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
