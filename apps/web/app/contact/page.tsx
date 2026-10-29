"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { ENQUIRIES_URL } from "../../lib/config";

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

type FieldKey = Exclude<keyof FormState, "modules">;
type FieldErrors = Partial<Record<FieldKey, string>>;
type Problem = "invalid" | "server" | "network" | "offline" | "rate" | null;

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

// The CRM only saves ids from this list. Keep it in step with MODULE_IDS in
// apps/dashboard/lib/enquiries.ts.
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

// Same limits the CRM checks (ENQUIRY_LIMITS in apps/dashboard/lib/enquiries.ts).
const LIMITS: Record<FieldKey, number> = {
  name: 120,
  email: 254,
  phone: 40,
  businessName: 160,
  category: 80,
  locations: 20,
  stack: 500,
  notes: 2000,
};

// The CRM drops anything sent sooner than this after the page opens, as a
// bot. People rarely finish that fast, and if they do the form waits it out.
const MIN_FILL_MS = 3000;
const TIMEOUT_MS = 20000;

// The CRM's field names, mapped back to this form's.
const SERVER_FIELDS: Record<string, FieldKey> = {
  name: "name",
  email: "email",
  phone: "phone",
  business_name: "businessName",
  business_type: "category",
  locations: "locations",
  current_tools: "stack",
  message: "notes",
};

// Order the fields appear in, for focusing the first one with a problem.
const FIELD_ORDER: FieldKey[] = ["name", "email", "phone", "businessName", "category", "locations", "stack", "notes"];

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const CONTACT_EMAIL = "hello@zentrabite.com";

const NEXT_STEPS = [
  "We read what you've sent.",
  "We get in touch to find a time for a quick call.",
  "On the call we show you how ZentraBite would work for your business.",
  "You'll be one of the first to know when sign-ups open.",
];

function checkForm(f: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.name.trim()) errors.name = "Add your name.";
  const email = f.email.trim();
  if (!email) errors.email = "Add your email so we can reply.";
  else if (!EMAIL_RE.test(email)) errors.email = "That email doesn't look right. Check it and try again.";
  if (!f.businessName.trim()) errors.businessName = "Add your business name.";
  return errors;
}

/** A mailto link with what they typed, so emailing us doesn't mean starting again. */
function mailtoWith(f: FormState): string {
  const notes = f.notes.trim();
  const lines = [
    `Name: ${f.name.trim()}`,
    `Business: ${f.businessName.trim()}`,
    f.phone.trim() ? `Phone: ${f.phone.trim()}` : "",
    notes ? `\n${notes.length > 600 ? `${notes.slice(0, 600)}…` : notes}` : "",
  ].filter(Boolean);
  const subject = f.businessName.trim() ? `Enquiry from ${f.businessName.trim()}` : "Enquiry";
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<Problem>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<FormState | null>(null);

  const inFlight = useRef(false);
  const openedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>>({});

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (key in errors) setErrors(e => {
      const next = { ...e };
      delete next[key as FieldKey];
      return next;
    });
  }

  function toggleModule(id: string) {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(id) ? f.modules.filter(m => m !== id) : [...f.modules, id],
    }));
  }

  function focusFirst(found: FieldErrors) {
    const first = FIELD_ORDER.find(k => found[k]);
    if (first) fieldRefs.current[first]?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;

    const found = checkForm(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setProblem("invalid");
      focusFirst(found);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    setProblem(null);
    const snapshot = form;
    let ok = false;

    try {
      const waited = Date.now() - openedAt.current;
      if (waited < MIN_FILL_MS) await sleep(MIN_FILL_MS - waited);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(ENQUIRIES_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            name: snapshot.name,
            email: snapshot.email,
            phone: snapshot.phone,
            business_name: snapshot.businessName,
            business_type: snapshot.category,
            locations: snapshot.locations,
            current_tools: snapshot.stack,
            modules: snapshot.modules,
            message: snapshot.notes,
            website: honeypot.current?.value ?? "",
            elapsed_ms: Date.now() - openedAt.current,
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      const data = (await res.json().catch(() => null)) as { ok?: boolean; fields?: Record<string, string> } | null;
      if (res.ok && data?.ok === true) {
        ok = true;
      } else if (res.status === 400 && data?.fields && typeof data.fields === "object") {
        const mapped: FieldErrors = {};
        for (const [k, msg] of Object.entries(data.fields)) {
          const key = SERVER_FIELDS[k];
          if (key && typeof msg === "string") mapped[key] = msg;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          setProblem("invalid");
          focusFirst(mapped);
        } else {
          setProblem("server");
        }
      } else if (res.status === 429) {
        setProblem("rate");
      } else {
        setProblem("server");
      }
    } catch {
      setProblem(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }

    if (ok) setSent(snapshot);
  }

  function describedBy(key: FieldKey, hint?: string): string | undefined {
    const ids = [hint, errors[key] ? `ct-${key}-error` : undefined].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  function fieldError(key: FieldKey) {
    return errors[key] ? (
      <p id={`ct-${key}-error`} className="ct-field-error">
        {errors[key]}
      </p>
    ) : null;
  }

  const errorCount = Object.keys(errors).length;
  const notesLeft = LIMITS.notes - form.notes.length;

  return (
    <>
      <Nav />
      <main className="page-top" style={{ paddingBottom: 96 }}>
        <div className="container contact-grid">
          <div style={{ minWidth: 0 }}>
            <span className="label">Book a call</span>
            <h1 className="h-page">Tell us about your business.</h1>
            <p className="lead" style={{ marginTop: 16, marginBottom: 36 }}>
              A few details help us show you the parts that matter to you.
            </p>

            {sent ? (
              <Thanks form={sent} />
            ) : (
              <form onSubmit={onSubmit} className="contact-form" noValidate aria-busy={submitting}>
                <div className="form-row">
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-name">
                      <span>Your name</span>
                    </label>
                    <input
                      id="ct-name"
                      name="name"
                      ref={el => { fieldRefs.current.name = el; }}
                      className={`input${errors.name ? " ct-invalid" : ""}`}
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      required
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={describedBy("name")}
                      maxLength={LIMITS.name}
                      autoComplete="name"
                    />
                    {fieldError("name")}
                  </div>
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-email">
                      <span>Email</span>
                    </label>
                    <input
                      id="ct-email"
                      name="email"
                      ref={el => { fieldRefs.current.email = el; }}
                      className={`input${errors.email ? " ct-invalid" : ""}`}
                      type="email"
                      inputMode="email"
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      required
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={describedBy("email")}
                      maxLength={LIMITS.email}
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    {fieldError("email")}
                  </div>
                </div>

                <div className="form-row">
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-phone">
                      <span>Phone (optional)</span>
                    </label>
                    <input
                      id="ct-phone"
                      name="phone"
                      ref={el => { fieldRefs.current.phone = el; }}
                      className={`input${errors.phone ? " ct-invalid" : ""}`}
                      type="tel"
                      value={form.phone}
                      onChange={e => update("phone", e.target.value)}
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={describedBy("phone")}
                      maxLength={LIMITS.phone}
                      autoComplete="tel"
                    />
                    {fieldError("phone")}
                  </div>
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-business">
                      <span>Business name</span>
                    </label>
                    <input
                      id="ct-business"
                      name="organization"
                      ref={el => { fieldRefs.current.businessName = el; }}
                      className={`input${errors.businessName ? " ct-invalid" : ""}`}
                      value={form.businessName}
                      onChange={e => update("businessName", e.target.value)}
                      required
                      aria-invalid={errors.businessName ? true : undefined}
                      aria-describedby={describedBy("businessName")}
                      maxLength={LIMITS.businessName}
                      autoComplete="organization"
                    />
                    {fieldError("businessName")}
                  </div>
                </div>

                <div className="form-row">
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-category">
                      <span>Type of business</span>
                    </label>
                    <select
                      id="ct-category"
                      name="business_type"
                      ref={el => { fieldRefs.current.category = el; }}
                      className="input"
                      value={form.category}
                      onChange={e => update("category", e.target.value)}
                      aria-describedby={describedBy("category")}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {fieldError("category")}
                  </div>
                  <div className="ct-cell">
                    <label className="field" htmlFor="ct-locations">
                      <span>Locations</span>
                    </label>
                    <select
                      id="ct-locations"
                      name="locations"
                      ref={el => { fieldRefs.current.locations = el; }}
                      className="input"
                      value={form.locations}
                      onChange={e => update("locations", e.target.value)}
                      aria-describedby={describedBy("locations")}
                    >
                      {LOCATIONS_OPTIONS.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {fieldError("locations")}
                  </div>
                </div>

                <div className="ct-cell">
                  <label className="field" htmlFor="ct-stack">
                    <span>What you use now (optional)</span>
                  </label>
                  <input
                    id="ct-stack"
                    name="current_tools"
                    ref={el => { fieldRefs.current.stack = el; }}
                    className={`input${errors.stack ? " ct-invalid" : ""}`}
                    value={form.stack}
                    onChange={e => update("stack", e.target.value)}
                    aria-invalid={errors.stack ? true : undefined}
                    aria-describedby={describedBy("stack")}
                    maxLength={LIMITS.stack}
                    autoComplete="off"
                    placeholder="For example Square, Uber Eats and paper loyalty cards"
                  />
                  {fieldError("stack")}
                </div>

                <fieldset className="field ct-fieldset" aria-labelledby="ct-modules-label">
                  <span id="ct-modules-label">What are you interested in? (optional)</span>
                  <div className="chip-grid">
                    {MODULES.map(m => {
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

                <div className="ct-cell">
                  <label className="field" htmlFor="ct-notes">
                    <span>Anything else we should know? (optional)</span>
                  </label>
                  <textarea
                    id="ct-notes"
                    name="message"
                    ref={el => { fieldRefs.current.notes = el; }}
                    className={`input${errors.notes ? " ct-invalid" : ""}`}
                    rows={4}
                    value={form.notes}
                    onChange={e => update("notes", e.target.value)}
                    aria-invalid={errors.notes ? true : undefined}
                    aria-describedby={describedBy("notes", notesLeft <= 300 ? "ct-notes-count" : undefined)}
                    maxLength={LIMITS.notes}
                    placeholder="For example, we're on Uber Eats and want more people ordering direct."
                  />
                  {notesLeft <= 300 && (
                    <p id="ct-notes-count" className="ct-hint">
                      {notesLeft === 0
                        ? "That's the limit of 2,000 characters."
                        : `${notesLeft.toLocaleString("en-AU")} ${notesLeft === 1 ? "character" : "characters"} left.`}
                    </p>
                  )}
                  {fieldError("notes")}
                </div>

                {/* Bots fill every box. People never see this one. */}
                <div className="ct-hp" aria-hidden="true">
                  <label htmlFor="ct-website">Leave this empty</label>
                  <input id="ct-website" name="website" type="text" ref={honeypot} tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>

                <div className="ct-submit">
                  <button
                    type="submit"
                    className="btn-primary btn-lg"
                    aria-disabled={submitting || undefined}
                  >
                    {submitting ? "Sending…" : "Send"}
                  </button>

                  <p className="sr-only" aria-live="polite">
                    {submitting
                      ? "Sending your details."
                      : problem === "invalid"
                        ? errorCount === 1
                          ? "One detail needs fixing before you send."
                          : `${errorCount} details need fixing before you send.`
                        : ""}
                  </p>

                  {problem && problem !== "invalid" && <SendProblem kind={problem} form={form} />}
                </div>
              </form>
            )}
          </div>

          <aside className="aside-box" style={{ marginTop: 8 }}>
            <h2 className="h-card" style={{ marginBottom: 14 }}>
              What happens next
            </h2>
            <ol className="muted" style={{ paddingLeft: 20, display: "grid", gap: 10, marginBottom: 28 }}>
              {NEXT_STEPS.map(s => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="muted">
              Rather email?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-link">
                {CONTACT_EMAIL}
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

      <style>{`
        .ct-cell { display: grid; gap: 8px; align-content: start; min-width: 0; }
        .ct-cell > .field { gap: 0; }
        .ct-fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
        .input.ct-invalid { border-color: var(--danger-text); }
        .input.ct-invalid:focus { border-color: var(--danger-text); box-shadow: 0 0 0 3px var(--accent-soft); }
        .ct-field-error { color: var(--danger-text); font-size: 15px; line-height: 1.4; }
        .ct-hint { color: var(--text-2); font-size: 14px; }
        .ct-submit { display: grid; gap: 16px; justify-items: start; }
        .ct-submit .btn-primary[aria-disabled="true"] { opacity: 0.55; cursor: progress; }
        .ct-problem {
          width: 100%;
          padding: 16px 18px;
          border: 1px solid var(--danger-text);
          border-radius: 12px;
          background: var(--surface);
          color: var(--text);
          display: grid;
          gap: 6px;
          overflow-wrap: anywhere;
        }
        .ct-problem strong { color: var(--danger-text); font-weight: 600; }
        .ct-problem p { color: var(--text-2); }
        .ct-thanks { overflow-wrap: anywhere; }
        .ct-thanks h2:focus { outline: none; }
        .ct-hp { position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden; }
        @media (max-width: 520px) {
          .ct-submit { justify-items: stretch; }
          .ct-submit .btn-primary { width: 100%; }
        }
      `}</style>
    </>
  );
}

const PROBLEM_COPY: Record<Exclude<Problem, "invalid" | null>, { title: string; body: string }> = {
  server: {
    title: "We couldn't send your details.",
    body: "Something went wrong on our side. Try again in a minute, or email us at",
  },
  network: {
    title: "We couldn't reach ZentraBite.",
    body: "Check your internet connection and try again, or email us at",
  },
  offline: {
    title: "You look to be offline.",
    body: "Connect to the internet and try again, or email us at",
  },
  rate: {
    title: "We've had a lot of sends from your connection.",
    body: "Wait a while and try again, or email us at",
  },
};

function SendProblem({ kind, form }: { kind: Exclude<Problem, "invalid" | null>; form: FormState }) {
  const copy = PROBLEM_COPY[kind];
  return (
    <div className="ct-problem" role="alert">
      <strong>{copy.title}</strong>
      <p>
        {copy.body}{" "}
        <a href={mailtoWith(form)} className="text-link">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      <p>Everything you typed is still here.</p>
    </div>
  );
}

function Thanks({ form }: { form: FormState }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const first = form.name.trim().split(/\s+/)[0] || "there";
  return (
    <div className="aside-box ct-thanks" role="status">
      <h2 ref={heading} tabIndex={-1} className="h-section" style={{ marginBottom: 10 }}>
        Thanks, {first}.
      </h2>
      <p>
        We&apos;ve got your details. We&apos;ll be in touch at <strong>{form.email.trim()}</strong> about{" "}
        {form.businessName.trim()}.
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
