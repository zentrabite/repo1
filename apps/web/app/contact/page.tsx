"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";

type FormState = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  category: string;
  locations: string;
  volume: string;
  stack: string;
  modules: string[];
  goals: string;
};

const CATEGORIES = [
  "Restaurant / takeaway",
  "Café / bakery",
  "Bar / pub",
  "Cloud kitchen / ghost kitchen",
  "Personal trainer / coach",
  "Fitness studio / gym",
  "Retail (physical store)",
  "E-commerce / online store",
  "Service business (salon / spa / trades)",
  "Appointment-based (clinic / professional)",
  "Other",
];

const MODULES = [
  { id: "orders", label: "Orders & POS" },
  { id: "loyalty", label: "Loyalty & rewards" },
  { id: "campaigns", label: "Campaigns & winback" },
  { id: "ai_calls", label: "AI phone ordering" },
  { id: "driver_dispatch", label: "Driver dispatch" },
  { id: "stock", label: "Stock / inventory" },
  { id: "reviews", label: "Reviews & feedback" },
  { id: "analytics", label: "Advanced analytics" },
  { id: "ordering_app", label: "Branded customer app" },
  { id: "custom_website", label: "Custom ordering website" },
];

const VOLUME_BANDS = [
  "Under 100 orders / month",
  "100 – 500 orders / month",
  "500 – 2,000 orders / month",
  "2,000 – 10,000 orders / month",
  "10,000+ orders / month",
  "Not sure yet",
];

const LOCATIONS_OPTIONS = ["1", "2", "3 – 5", "6 – 20", "20+"];

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    category: CATEGORIES[0]!,
    locations: LOCATIONS_OPTIONS[0]!,
    volume: VOLUME_BANDS[0]!,
    stack: "",
    modules: [],
    goals: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleModule(id: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(id) ? f.modules.filter((m) => m !== id) : [...f.modules, id],
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Demo mode — fake the submit. In production this posts to /api/contact.
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 650);
  }

  const required = form.name && form.email && form.businessName;

  return (
    <>
      <Nav />
      <main style={{ paddingTop: 120, paddingBottom: 120, background: "var(--near-black)" }} className="grid-bg">
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 48, alignItems: "flex-start", maxWidth: 1180 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>Tailored to your business</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", margin: "0 0 20px", lineHeight: 1.08 }}>
              Let's scope what ZentraBite looks like for your business.
            </h1>
            <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6, marginBottom: 24 }}>
              Tell us what you run and the modules you want. We'll reply inside one
              business day with a tailored setup, a live walkthrough if you want one,
              and a <strong style={{ color: "var(--cloud)" }}>one-month free trial with no credit card</strong>.
            </p>

            {submitted ? (
              <SuccessCard form={form} />
            ) : (
              <form onSubmit={onSubmit} className="glass" style={{ padding: 28, display: "grid", gap: 18 }}>
                <Row>
                  <Field label="Your name *">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Alex Chen"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Email *">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      placeholder="you@business.com"
                      style={inputStyle}
                    />
                  </Field>
                </Row>

                <Row>
                  <Field label="Phone (optional)">
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+61 4xx xxx xxx"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Business name *">
                    <input
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      required
                      placeholder="Harbour Lane Pizza Co"
                      style={inputStyle}
                    />
                  </Field>
                </Row>

                <Row>
                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      style={inputStyle}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Locations">
                    <select
                      value={form.locations}
                      onChange={(e) => setForm({ ...form, locations: e.target.value })}
                      style={inputStyle}
                    >
                      {LOCATIONS_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                </Row>

                <Field label="Monthly order volume">
                  <select
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    style={inputStyle}
                  >
                    {VOLUME_BANDS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>

                <Field label="What you're using now (optional)">
                  <input
                    value={form.stack}
                    onChange={(e) => setForm({ ...form, stack: e.target.value })}
                    placeholder="e.g. Square POS + Mailchimp + nothing for loyalty"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Which modules are you interested in?">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 6 }}>
                    {MODULES.map((m) => {
                      const active = form.modules.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => toggleModule(m.id)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: active ? "rgba(0,182,122,0.14)" : "var(--navy-40)",
                            border: `1px solid ${active ? "var(--green)" : "var(--mist-9)"}`,
                            color: active ? "var(--green)" : "var(--cloud)",
                            fontSize: 13,
                            fontWeight: 600,
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.12s",
                          }}
                        >
                          <span style={{ marginRight: 6 }}>{active ? "✓" : "+"}</span>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="What would success look like in 90 days?">
                  <textarea
                    value={form.goals}
                    onChange={(e) => setForm({ ...form, goals: e.target.value })}
                    placeholder="e.g. Cut third-party marketplace dependency. Lift repeat orders by 20%. Automate winback."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={!required || submitting}
                  className="btn-primary"
                  style={{
                    padding: "14px 22px",
                    fontSize: 15,
                    justifyContent: "center",
                    opacity: !required || submitting ? 0.55 : 1,
                    cursor: !required || submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Sending…" : "Send — start my 1-month free trial →"}
                </button>

                <div style={{ fontSize: 12, color: "var(--steel)", textAlign: "center" }}>
                  No credit card. We reply inside 1 business day. Your info stays private.
                </div>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <aside style={{ display: "grid", gap: 20, position: "sticky", top: 100 }}>
            <TrialCard />
            <NextSteps />
            <BookDemoCard />
            <DirectContact />
          </aside>
        </div>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 960px) {
          main > .container { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  background: "var(--navy-40)",
  border: "1px solid var(--mist-9)",
  color: "var(--cloud)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--steel)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="contact-row">
      <style>{`@media (max-width: 560px) { .contact-row { grid-template-columns: 1fr !important; } }`}</style>
      {children}
    </div>
  );
}

function TrialCard() {
  return (
    <div
      className="glass"
      style={{
        padding: 22,
        background: "linear-gradient(135deg, rgba(0,182,122,0.18), rgba(28,45,72,0.6))",
        border: "1px solid rgba(0,182,122,0.35)",
      }}
    >
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: "var(--cloud)" }}>
        1 month free. No card.
      </div>
      <div style={{ color: "var(--steel)", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
        Full platform, full onboarding, real human support. We only charge you when
        you're convinced it's working.
      </div>
      <ul style={{ listStyle: "none", display: "grid", gap: 8, marginTop: 16 }}>
        {[
          "All modules enabled during trial",
          "Free data migration from Square / Mailchimp / Smile / POS",
          "Your own branded subdomain + storefront",
          "AI credits included — real usage, not a demo",
        ].map((t) => (
          <li key={t} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--cloud)", alignItems: "flex-start" }}>
            <span style={{ color: "var(--green)" }}>✓</span>{t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NextSteps() {
  const steps = [
    { t: "You send this form", s: "Takes ~60 seconds." },
    { t: "We reply in 1 business day", s: "A real human, not a chatbot — with a rough setup." },
    { t: "20-min scoping call", s: "Optional. We confirm modules, integrations, and volume." },
    { t: "Tailored quote + trial", s: "Your trial starts; we onboard inside 48 hours." },
  ];
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>What happens next</div>
      <ol style={{ listStyle: "none", display: "grid", gap: 12, counterReset: "step" }}>
        {steps.map((s, i) => (
          <li key={s.t} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "var(--green)",
                color: "var(--navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)" }}>{s.t}</div>
              <div style={{ color: "var(--steel)", fontSize: 12.5, marginTop: 2 }}>{s.s}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BookDemoCard() {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginBottom: 6 }}>
        Prefer a live walkthrough?
      </div>
      <div style={{ color: "var(--steel)", fontSize: 13.5, marginBottom: 14 }}>
        20 minutes. We share screen, you ask hard questions, you leave knowing if
        this fits.
      </div>
      <a
        href="mailto:hello@zentrabite.com.au?subject=Book%20a%20live%20demo"
        className="btn-secondary"
        style={{ padding: "10px 16px", fontSize: 13.5, justifyContent: "center", display: "flex" }}
      >
        Book a demo →
      </a>
    </div>
  );
}

function DirectContact() {
  return (
    <div style={{ color: "var(--steel)", fontSize: 13, padding: "0 4px", lineHeight: 1.7 }}>
      <div style={{ marginBottom: 4 }}>Prefer direct?</div>
      <div>
        <a href="mailto:hello@zentrabite.com.au" style={{ color: "var(--cloud)" }}>hello@zentrabite.com.au</a>
      </div>
      <div style={{ marginTop: 8 }}>
        <Link href="/demo" style={{ color: "var(--green)" }}>Or poke around the live demo →</Link>
      </div>
    </div>
  );
}

function SuccessCard({ form }: { form: FormState }) {
  return (
    <div
      className="glass"
      style={{
        padding: 36,
        textAlign: "center",
        background: "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
        border: "1px solid rgba(0,182,122,0.35)",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h2 style={{ fontSize: 26, margin: "0 0 10px", color: "var(--cloud)" }}>
        Got it, {form.name.split(" ")[0] || "there"}.
      </h2>
      <p style={{ color: "var(--steel)", fontSize: 15, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 20px" }}>
        We've queued up a tailored setup for <strong style={{ color: "var(--cloud)" }}>{form.businessName}</strong>.
        You'll hear from a real human at <strong style={{ color: "var(--cloud)" }}>{form.email}</strong> inside
        one business day.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <Link href="/demo/live" className="btn-primary" style={{ padding: "12px 20px", fontSize: 14 }}>
          Play with the CRM while you wait →
        </Link>
        <Link href="/" className="btn-secondary" style={{ padding: "12px 20px", fontSize: 14 }}>
          Back home
        </Link>
      </div>
    </div>
  );
}
