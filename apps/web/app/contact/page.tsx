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
  stack: string;
  modules: string[];
  notes: string;
};

const CATEGORIES = [
  "Restaurant or takeaway",
  "Café or bakery",
  "Bar or pub",
  "Food truck",
  "Shop or online store",
  "Hair, beauty or barber",
  "Gym, studio or personal trainer",
  "Trade or home service",
  "Something else",
];

const MODULES = [
  { id: "website", label: "Website" },
  { id: "ordering", label: "Online ordering" },
  { id: "bookings", label: "Bookings" },
  { id: "pos", label: "POS" },
  { id: "loyalty", label: "Rewards" },
  { id: "campaigns", label: "Win-back texts and emails" },
  { id: "reviews", label: "Reviews" },
  { id: "stock", label: "Stock" },
  { id: "driver_dispatch", label: "Delivery" },
  { id: "ai_calls", label: "AI phone calls" },
];

const LOCATIONS_OPTIONS = ["1", "2", "3 to 5", "6 or more"];

const NEXT_STEPS = [
  "We read what you've sent.",
  "We get in touch to find a time for a quick call.",
  "On the call we show you how ZentraBite would work for your business.",
  "You'll be one of the first to know when sign-ups open.",
];

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    category: CATEGORIES[0]!,
    locations: LOCATIONS_OPTIONS[0]!,
    stack: "",
    modules: [],
    notes: "",
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
    // TODO: not sent anywhere yet. Enquiries need saving (see the PR that
    // follows the redesign).
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 650);
  }

  const ready = form.name && form.email && form.businessName;

  return (
    <>
      <Nav />
      <main className="page-top" style={{ paddingBottom: 96 }}>
        <div className="container contact-grid">
          <div>
            <span className="label">Book a call</span>
            <h1 className="h-page">Tell us about your business.</h1>
            <p className="lead" style={{ marginTop: 16, marginBottom: 36 }}>
              A few details help us show you the parts that matter to you.
            </p>

            {submitted ? (
              <Thanks form={form} />
            ) : (
              <form onSubmit={onSubmit} className="contact-form">
                <div className="form-row">
                  <label className="field">
                    <span>Your name</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      autoComplete="name"
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      autoComplete="email"
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span>Phone (optional)</span>
                    <input
                      className="input"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="field">
                    <span>Business name</span>
                    <input
                      className="input"
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      required
                      autoComplete="organization"
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span>Type of business</span>
                    <select
                      className="input"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Locations</span>
                    <select
                      className="input"
                      value={form.locations}
                      onChange={(e) => setForm({ ...form, locations: e.target.value })}
                    >
                      {LOCATIONS_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>What you use now (optional)</span>
                  <input
                    className="input"
                    value={form.stack}
                    onChange={(e) => setForm({ ...form, stack: e.target.value })}
                    placeholder="For example Square, Uber Eats and paper loyalty cards"
                  />
                </label>

                <fieldset className="field" style={{ border: 0 }}>
                  <span>What are you interested in?</span>
                  <div className="chip-grid">
                    {MODULES.map((m) => {
                      const on = form.modules.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          className="chip"
                          aria-pressed={on}
                          onClick={() => toggleModule(m.id)}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="field">
                  <span>Anything else we should know? (optional)</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="For example, we're on Uber Eats and want more people ordering direct."
                  />
                </label>

                <div>
                  <button type="submit" disabled={!ready || submitting} className="btn-primary btn-lg">
                    {submitting ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="aside-box" style={{ marginTop: 8 }}>
            <h2 className="h-card" style={{ marginBottom: 14 }}>
              What happens next
            </h2>
            <ol className="muted" style={{ paddingLeft: 20, display: "grid", gap: 10, marginBottom: 28 }}>
              {NEXT_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="muted">
              Rather email?{" "}
              <a href="mailto:hello@zentrabite.com" className="text-link">
                hello@zentrabite.com
              </a>
            </p>
            <p className="muted" style={{ marginTop: 10 }}>
              Or{" "}
              <Link href="/demo" className="text-link">
                try the demo
              </Link>{" "}
              with made-up data.
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Thanks({ form }: { form: FormState }) {
  return (
    <div className="aside-box" role="status">
      <h2 className="h-section" style={{ marginBottom: 10 }}>
        Thanks, {form.name.split(" ")[0] || "there"}.
      </h2>
      <p>
        We&apos;ll be in touch at <strong>{form.email}</strong> about {form.businessName}.
      </p>
      <div className="btn-row" style={{ marginTop: 24 }}>
        <Link href="/demo/live" className="btn-primary">
          Try the CRM demo
        </Link>
        <Link href="/" className="btn-secondary">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
