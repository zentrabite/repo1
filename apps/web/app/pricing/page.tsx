import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { Expandable } from "../components/expandable";

// Pricing is tailored per client — this page is intentionally a single CTA.
// No tiers. No calculator. Everything else lives behind a "Why tailored?"
// click-to-expand so the page stays calm on first load.

export const metadata = {
  title: "Pricing — ZentraBite",
  description:
    "Every business is different. Book a call and we'll build a plan priced to what you actually need.",
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main
        style={{ paddingTop: 140, paddingBottom: 120, background: "var(--near-black)" }}
        className="grid-bg"
      >
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              Pricing
            </div>
            <h1
              style={{
                fontSize: "clamp(34px, 5.5vw, 52px)",
                margin: "0 0 16px",
                lineHeight: 1.1,
              }}
            >
              Priced to your business.
            </h1>
            <p
              style={{
                fontSize: 17,
                color: "var(--steel)",
                lineHeight: 1.55,
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              Every business runs differently — so we quote every business differently.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: 40,
              textAlign: "center",
              background:
                "linear-gradient(135deg, rgba(0,182,122,0.18), rgba(28,45,72,0.55))",
              border: "1px solid rgba(0,182,122,0.35)",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--cloud)",
                marginBottom: 8,
              }}
            >
              Book a 20-minute call.
            </div>
            <div
              style={{
                color: "var(--steel)",
                fontSize: 15,
                maxWidth: 480,
                margin: "0 auto 22px",
                lineHeight: 1.6,
              }}
            >
              We'll scope what you need, pick the modules that fit, and send a
              written quote the same day.
            </div>
            <Link
              href="/contact"
              className="btn-primary"
              style={{ padding: "14px 26px", fontSize: 15 }}
            >
              Book a call →
            </Link>
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--steel)" }}>
              No credit card. No obligation.
            </div>
          </div>

          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <Expandable summary="Why tailored pricing?">
              A solo personal trainer doesn't need driver dispatch. A 10-location
              restaurant doesn't want a 1-location plan. Pricing reflects the
              modules you actually turn on, your order volume, and whether you
              use AI features — not a flat tier that overcharges small operators
              and underserves big ones.
            </Expandable>
          </div>

          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <Expandable summary="What every plan includes">
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {[
                  "Unlimited staff logins",
                  "Free onboarding & data migration",
                  "GST-ready reports — Xero / MYOB export",
                  "0% commission on your direct orders",
                  "Realtime dashboards",
                  "Your data is yours — one-click export",
                  "Role-based permissions",
                ].map((t) => (
                  <li
                    key={t}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      color: "var(--cloud)",
                    }}
                  >
                    <span style={{ color: "var(--green)" }}>✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </Expandable>
          </div>

          <div className="glass" style={{ padding: 24 }}>
            <Expandable summary="Common questions">
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  {
                    q: "Do I pay per order?",
                    a: "No commission on your direct storefront orders. You only pay Stripe processing (what you'd pay anywhere).",
                  },
                  {
                    q: "Is there a contract?",
                    a: "Month-to-month. Cancel anytime. You keep your data.",
                  },
                  {
                    q: "How long does setup take?",
                    a: "Most businesses are fully onboarded in 48 hours.",
                  },
                  {
                    q: "Can I turn modules off later?",
                    a: "Yes — anything you disable stops billing on the next cycle.",
                  },
                ].map((f) => (
                  <div key={f.q}>
                    <div style={{ color: "var(--cloud)", fontWeight: 600, fontSize: 14 }}>
                      {f.q}
                    </div>
                    <div style={{ color: "var(--steel)", fontSize: 13.5, marginTop: 4, lineHeight: 1.55 }}>
                      {f.a}
                    </div>
                  </div>
                ))}
              </div>
            </Expandable>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
