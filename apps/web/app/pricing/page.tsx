"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";

const MODULES = [
  { id: "orders", label: "Orders & POS", cost: 29, base: true, desc: "Storefront, live order board, KDS, payments" },
  { id: "loyalty", label: "Loyalty & rewards", cost: 19, desc: "Earn rules, tier ladder, redemptions" },
  { id: "campaigns", label: "Campaigns & winback", cost: 29, desc: "Automated SMS/email, segments, attribution" },
  { id: "stock", label: "Stock + AI ordering", cost: 19, desc: "Par levels, expiry, auto reorder suggestions" },
  { id: "ai_calls", label: "AI phone ordering", cost: 29, desc: "Twilio + AI voice agent (credit-metered)" },
  { id: "driver_dispatch", label: "Driver dispatch", cost: 19, desc: "Internal roster + Uber / DoorDash fallback" },
  { id: "reviews", label: "Reviews & feedback", cost: 9, desc: "Auto-ask, AI reply draft, sentiment" },
  { id: "analytics", label: "Advanced analytics", cost: 19, desc: "Cohort retention, heatmaps, LTV" },
  { id: "custom_website", label: "Custom ordering website", cost: 19, desc: "Branded subdomain or custom domain" },
  { id: "ordering_app", label: "Branded customer app", cost: 29, desc: "iOS + Android PWA in your brand" },
];

const ORDER_BANDS: { label: string; cap: number; mult: number }[] = [
  { label: "Under 500 / mo",    cap: 500,    mult: 1.0 },
  { label: "500 – 2,000 / mo",  cap: 2000,   mult: 1.15 },
  { label: "2,000 – 10,000",    cap: 10000,  mult: 1.35 },
  { label: "10,000+",           cap: 99999,  mult: 1.6 },
];

export default function PricingPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["orders", "loyalty", "campaigns"]));
  const [band, setBand] = useState(1);
  const [locations, setLocations] = useState(1);
  const [aiCredits, setAiCredits] = useState(2000);

  const totals = useMemo(() => {
    const base = MODULES.reduce((acc, m) => acc + (selected.has(m.id) ? m.cost : 0), 0);
    const b = ORDER_BANDS[band] ?? ORDER_BANDS[0]!;
    const volumeAdj = Math.round(base * (b.mult - 1));
    const locationAdj = (locations - 1) * 39;
    const creditCost = Math.round((aiCredits / 1000) * 18); // ~$18 per 1k credits
    const monthlyLow = base + locationAdj;
    const monthlyHigh = base + volumeAdj + locationAdj + creditCost;
    return { base, volumeAdj, locationAdj, creditCost, monthlyLow, monthlyHigh };
  }, [selected, band, locations, aiCredits]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      // Orders is mandatory base
      if (id === "orders" && !n.has("orders")) n.add("orders");
      return n;
    });
  }

  return (
    <>
      <Nav />
      <main style={{ paddingTop: 120, paddingBottom: 120, background: "var(--near-black)" }} className="grid-bg">
        <div className="container" style={{ maxWidth: 1160 }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px" }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Tailored — not templated</div>
            <h1 style={{ fontSize: "clamp(34px, 5.5vw, 52px)", margin: "0 0 18px", lineHeight: 1.08 }}>
              Honest pricing. Priced to your business.
            </h1>
            <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
              A personal trainer doesn't need driver dispatch. A 10-location restaurant
              doesn't want to pay for a 1-location plan. So we price per business — modules
              you enable, your monthly order volume, and what you use AI for. No inflated
              public tiers. No hidden numbers.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 28 }} className="pricing-grid">
            {/* Estimator */}
            <section className="glass" style={{ padding: 28 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Live estimate</div>

              <Block label="1 · Pick the modules you actually want">
                <div style={{ display: "grid", gap: 8 }}>
                  {MODULES.map((m) => {
                    const on = selected.has(m.id);
                    const disabled = m.base;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => !disabled && toggle(m.id)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "22px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          padding: "11px 14px",
                          borderRadius: 10,
                          border: `1px solid ${on ? "var(--green)" : "var(--mist-9)"}`,
                          background: on ? "rgba(0,182,122,0.10)" : "var(--navy-40)",
                          cursor: disabled ? "default" : "pointer",
                          textAlign: "left",
                          opacity: disabled && !on ? 0.5 : 1,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: `1.5px solid ${on ? "var(--green)" : "var(--mist-12)"}`,
                            background: on ? "var(--green)" : "transparent",
                            color: "var(--navy)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {on ? "✓" : ""}
                        </span>
                        <span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--cloud)" }}>
                            {m.label}
                            {m.base && (
                              <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--green)", fontWeight: 700, letterSpacing: "0.06em" }}>
                                INCLUDED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 1 }}>{m.desc}</div>
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            color: on ? "var(--green)" : "var(--steel)",
                            fontWeight: 700,
                          }}
                        >
                          +${m.cost}/mo
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Block>

              <Block label="2 · Monthly order volume">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {ORDER_BANDS.map((b, i) => {
                    const on = band === i;
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBand(i)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 8,
                          border: `1px solid ${on ? "var(--green)" : "var(--mist-9)"}`,
                          background: on ? "rgba(0,182,122,0.10)" : "var(--navy-40)",
                          color: on ? "var(--green)" : "var(--cloud)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          lineHeight: 1.25,
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </Block>

              <Block label={`3 · Locations: ${locations}`}>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={locations}
                  onChange={(e) => setLocations(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--green)" }}
                />
                <div style={{ fontSize: 12, color: "var(--steel)" }}>
                  +$39/mo per additional location (shared CRM across all).
                </div>
              </Block>

              <Block label={`4 · AI credits: ${aiCredits.toLocaleString()} / mo`}>
                <input
                  type="range"
                  min={0}
                  max={20000}
                  step={500}
                  value={aiCredits}
                  onChange={(e) => setAiCredits(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--green)" }}
                />
                <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.55 }}>
                  1 credit = 1 SMS draft · 5 = menu optimisation · 10 = 1 min of AI voice call. Unused credits roll over 30 days.
                </div>
              </Block>
            </section>

            {/* Summary */}
            <section>
              <div
                className="glass"
                style={{
                  padding: 28,
                  background: "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
                  border: "1px solid rgba(0,182,122,0.3)",
                  position: "sticky",
                  top: 96,
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your estimated monthly</div>
                <div
                  style={{
                    fontFamily: "var(--font-outfit)",
                    fontSize: 48,
                    fontWeight: 800,
                    color: "var(--cloud)",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  ${totals.monthlyLow}
                  <span style={{ fontSize: 24, color: "var(--steel)", fontWeight: 600 }}> – ${totals.monthlyHigh}</span>
                </div>
                <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 20 }}>
                  per month, all-in. Payouts from Stripe Connect clear separately.
                </div>

                <div style={{ display: "grid", gap: 8, fontSize: 13, color: "var(--cloud)" }}>
                  <SumRow k="Modules selected" v={`$${totals.base}`} />
                  <SumRow k={`Volume uplift (${ORDER_BANDS[band]!.label})`} v={`+$${totals.volumeAdj}`} />
                  <SumRow k={`Extra locations (${locations - 1})`} v={`+$${totals.locationAdj}`} />
                  <SumRow k={`AI credits (${aiCredits.toLocaleString()})`} v={`+$${totals.creditCost}`} />
                </div>

                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid var(--mist-9)",
                    fontSize: 12.5,
                    color: "var(--steel)",
                    lineHeight: 1.6,
                  }}
                >
                  This is a planning estimate. We'll send you a written, tailored quote
                  inside one business day — usually cheaper than the high end once we
                  understand your current stack.
                </div>

                <Link
                  href="/contact"
                  className="btn-primary"
                  style={{ padding: "14px 22px", fontSize: 15, marginTop: 20, justifyContent: "center", display: "flex" }}
                >
                  Get my tailored quote →
                </Link>
                <div style={{ fontSize: 12, color: "var(--steel)", textAlign: "center", marginTop: 12 }}>
                  1-month free trial · No credit card · Cancel anytime
                </div>
              </div>
            </section>
          </div>

          {/* What every plan includes */}
          <section style={{ marginTop: 72 }}>
            <h2 style={{ textAlign: "center", fontSize: 28, marginBottom: 28 }}>What every ZentraBite plan includes</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { t: "Unlimited staff logins", s: "Add your whole team — no per-seat fees." },
                { t: "Free onboarding & migration", s: "We import from Square, Mailchimp, your old CRM." },
                { t: "Australian GST-ready reporting", s: "Exports for BAS, Xero, MYOB." },
                { t: "0% commission on direct orders", s: "Your storefront keeps every dollar above processing." },
                { t: "Realtime dashboards", s: "Powered by Supabase realtime." },
                { t: "Data portability", s: "Your data is yours. One-click export." },
                { t: "Role-based permissions", s: "Owner / manager / staff / view-only." },
                { t: "99.9% uptime target", s: "Multi-region infra. Real monitoring." },
              ].map((i) => (
                <div key={i.t} className="glass" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--cloud)", marginBottom: 4 }}>{i.t}</div>
                  <div style={{ color: "var(--steel)", fontSize: 13, lineHeight: 1.55 }}>{i.s}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Cost drivers */}
          <section style={{ marginTop: 72 }}>
            <h2 style={{ fontSize: 26, marginBottom: 18, textAlign: "center" }}>What actually drives your bill</h2>
            <div className="glass" style={{ padding: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>What it means</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Typical range</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Modules enabled", "Only pay for what you turn on.", "$29 – $230 / mo"],
                    ["Order volume", "Soft uplift at higher bands (infra cost).", "0 – 60% uplift"],
                    ["Locations", "Shared CRM across all sites, +$39 / location.", "+$0 – $780"],
                    ["AI credit usage", "SMS drafts, menu AI, voice calls.", "0 – $400 / mo"],
                    ["Integrations", "Most are included. Custom POS / ERP is quoted.", "$0 – $500 / mo"],
                  ].map(([a, b, c], i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--mist-9)" }}>
                      <td style={tdStyle}>{a}</td>
                      <td style={{ ...tdStyle, color: "var(--steel)" }}>{b}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--green)" }}>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--steel)" }}>
              Nothing above is obligatory. Most small merchants land in the $89 – $179/mo band.
            </div>
          </section>

          {/* FAQ */}
          <section style={{ marginTop: 72 }}>
            <h2 style={{ fontSize: 26, marginBottom: 18, textAlign: "center" }}>Pricing FAQs</h2>
            <div style={{ display: "grid", gap: 12, maxWidth: 820, margin: "0 auto" }}>
              {[
                { q: "Why don't you just publish a fixed price?", a: "Because every business is different. A personal trainer with 40 clients shouldn't pay the same as a 5-location pizzeria. We publish the math instead of a number we'd have to keep overriding." },
                { q: "What's in the 1-month free trial?", a: "Everything. All modules enabled, full onboarding, real data migration from your existing tools. You only start paying if you decide to stay." },
                { q: "Do I need a credit card to start?", a: "No. We scope, set you up, and only collect billing details after you've used the platform and confirmed the fit." },
                { q: "What happens if I go over my AI credits?", a: "We alert you at 80% and 100%. Nothing breaks — SMS / email automations keep running. You can top up in one click from Billing." },
                { q: "Can I turn modules off later?", a: "Yes. Anything you disable stops billing on the next cycle. We keep your data." },
                { q: "Are there any per-order fees?", a: "No commission on your direct storefront orders. You only pay Stripe processing (as it would be anywhere). Third-party delivery fees (Uber/DoorDash) are billed through their APIs." },
              ].map((f) => (
                <details key={f.q} className="glass" style={{ padding: 18 }}>
                  <summary style={{ fontWeight: 600, color: "var(--cloud)", cursor: "pointer", fontSize: 14.5 }}>{f.q}</summary>
                  <div style={{ color: "var(--steel)", fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>{f.a}</div>
                </details>
              ))}
            </div>
          </section>

          <div
            className="glass"
            style={{
              padding: 36,
              marginTop: 56,
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
              border: "1px solid rgba(0,182,122,0.3)",
            }}
          >
            <h2 style={{ margin: "0 0 10px", fontSize: 24, color: "var(--cloud)" }}>Ready to get a real number?</h2>
            <p style={{ color: "var(--steel)", maxWidth: 500, margin: "0 auto 20px", fontSize: 15 }}>
              Tell us about your business. We'll send a written quote inside one business
              day — tailored, no sales dance.
            </p>
            <Link href="/contact" className="btn-primary" style={{ padding: "13px 24px", fontSize: 14.5 }}>
              Get my tailored quote →
            </Link>
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 880px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--green)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function SumRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--steel)" }}>{k}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--cloud)" }}>{v}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 11.5,
  color: "var(--steel)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "14px",
  fontSize: 14,
  color: "var(--cloud)",
  verticalAlign: "top",
};
