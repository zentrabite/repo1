"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";

// ─── Theme ────────────────────────────────────────────────────────────────
const C = {
  g:    "#00B67A",
  o:    "#FF6B35",
  r:    "#FF4757",
  y:    "#FFC14B",
  st:   "#6B7C93",
  cl:   "#F8FAFB",
  mist: "rgba(226,232,240,.09)",
  bg:   "rgba(28,45,72,.5)",
};

// ─── Step definitions ─────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basics",       icon: "🏪" },
  { id: 2, label: "Hours",        icon: "🕒" },
  { id: 3, label: "Branding",     icon: "🎨" },
  { id: 4, label: "Menu",         icon: "📋" },
  { id: 5, label: "Payments",     icon: "💳" },
  { id: 6, label: "Delivery",     icon: "🚚" },
  { id: 7, label: "Notifications",icon: "📣" },
  { id: 8, label: "Team",         icon: "👥" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ─── Data shapes ───────────────────────────────────────────────────────────
type Biz = {
  id:         string;
  name:       string;
  type:       string;
  suburb:     string | null;
  subdomain:  string | null;
  logo_url:   string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled:  boolean | null;
  stripe_payouts_enabled:  boolean | null;
  stripe_details_submitted: boolean | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings:   any;
};

const DAYS = [
  ["mon","Mon"], ["tue","Tue"], ["wed","Wed"], ["thu","Thu"],
  ["fri","Fri"], ["sat","Sat"], ["sun","Sun"],
] as const;

const DEFAULT_MENU = [
  { name: "Mains",  items: [
    { name: "Signature dish",  price: 18, description: "Your hero item" },
    { name: "Classic option",  price: 16 },
    { name: "Vegetarian pick", price: 15 },
  ]},
  { name: "Sides",  items: [
    { name: "Fries",         price:  6 },
    { name: "House salad",   price:  8 },
  ]},
  { name: "Drinks", items: [
    { name: "Soft drink",    price:  4 },
    { name: "Bottled water", price:  3 },
  ]},
];

const DEFAULT_WINBACK = [
  {
    name:          "30-day winback",
    inactive_days: 30,
    offer_type:    "percent",
    offer_value:   10,
    channel:       "sms",
    template:      "Hey {name}, we miss you at {business}! Here's {offer} on your next order: {link}",
    cooldown_days: 60,
    is_active:     true,
  },
  {
    name:          "60-day winback (big nudge)",
    inactive_days: 60,
    offer_type:    "percent",
    offer_value:   20,
    channel:       "sms",
    template:      "Hi {name}, still there? {business} has {offer} waiting for you: {link}",
    cooldown_days: 90,
    is_active:     true,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [biz, setBiz]         = useState<Biz | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState<StepId>(1);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<string | null>(null);

  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/onboarding/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setBiz(data.business);
    const savedStep = data.business?.settings?.onboarding?.step;
    if (typeof savedStep === "number" && savedStep >= 1 && savedStep <= 8) setStep(savedStep as StepId);
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    reload().finally(() => setLoading(false));
  }, [authLoading, isSuperAdmin, reload, router]);

  // Save helper — merges a settings patch and/or top-level fields
  const save = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (patch: any, opts?: { advance?: boolean; silent?: boolean }): Promise<boolean> => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/onboarding/${id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(patch),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          show(`Save failed: ${body.error ?? res.status}`);
          return false;
        }
        const data = await res.json();
        setBiz(data.business);
        if (!opts?.silent) show("Saved ✓");
        if (opts?.advance) {
          const next = Math.min(8, step + 1) as StepId;
          setStep(next);
          // persist the cursor so resume works
          await fetch(`/api/admin/onboarding/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings: { onboarding: { step: next } } }),
          });
        }
        return true;
      } finally {
        setSaving(false);
      }
    },
    [id, step, show],
  );

  if (authLoading || loading) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading onboarding…</div>;
  if (!isSuperAdmin || !biz) return null;

  const progress = (step / STEPS.length) * 100;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 0 80px" }}>
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 12, fontFamily: "var(--font-inter)" }}
      >
        ← Super Admin
      </button>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: 0 }}>
            {biz.name}
          </h2>
          <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(0,182,122,.12)", color: C.g, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-outfit)" }}>
            ONBOARDING
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: C.st, margin: 0 }}>
          Step {step} of {STEPS.length} · Save-as-you-go — you can pause anytime.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 4, background: C.mist, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: C.g, transition: "width .25s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 6 }}>
          {STEPS.map(s => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                title={s.label}
                style={{
                  flex: 1,
                  background: active ? "rgba(0,182,122,.10)" : done ? "rgba(0,182,122,.04)" : "transparent",
                  border: `1px solid ${active ? C.g : done ? "rgba(0,182,122,.25)" : C.mist}`,
                  borderRadius: 8,
                  padding: "8px 4px",
                  cursor: "pointer",
                  color: active ? C.cl : done ? "rgba(0,182,122,.8)" : C.st,
                  fontSize: 11,
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{done ? "✓" : s.icon}</span>
                <span style={{ whiteSpace: "nowrap" }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className="gc" style={{ padding: 24, minHeight: 360 }}>
        {step === 1 && <StepBasics      biz={biz} save={save} />}
        {step === 2 && <StepHours       biz={biz} save={save} />}
        {step === 3 && <StepBranding    biz={biz} save={save} show={show} />}
        {step === 4 && <StepMenu        biz={biz} show={show} />}
        {step === 5 && <StepPayments    biz={biz} save={save} show={show} />}
        {step === 6 && <StepDelivery    biz={biz} save={save} />}
        {step === 7 && <StepNotifications biz={biz} save={save} show={show} />}
        {step === 8 && <StepTeam        biz={biz} router={router} show={show} />}
      </div>

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button
          onClick={() => setStep(Math.max(1, step - 1) as StepId)}
          disabled={step === 1 || saving}
          style={{ background: "transparent", border: `1px solid ${C.mist}`, borderRadius: 8, padding: "10px 18px", color: C.cl, cursor: step === 1 ? "not-allowed" : "pointer", fontFamily: "var(--font-inter)", fontSize: 13, opacity: step === 1 ? 0.4 : 1 }}
        >
          ← Back
        </button>
        <button
          onClick={() => {
            if (step < 8) setStep((step + 1) as StepId);
            else router.push(`/admin`);
          }}
          disabled={saving}
          className="bp"
          style={{ padding: "11px 22px" }}
        >
          {step < 8 ? "Skip →" : "Finish & return to Admin"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "rgba(15,31,45,.95)", color: C.cl, padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.mist}`, fontSize: 13, fontFamily: "var(--font-inter)", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,.4)", zIndex: 40 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Basics ───────────────────────────────────────────────────────
type SaveFn = (patch: Record<string, unknown>, opts?: { advance?: boolean; silent?: boolean }) => Promise<boolean>;

function StepBasics({ biz, save }: { biz: Biz; save: SaveFn }) {
  const [name,      setName]      = useState(biz.name);
  const [type,      setType]      = useState(biz.type);
  const [subdomain, setSubdomain] = useState(biz.subdomain ?? "");
  const [suburb,    setSuburb]    = useState(biz.suburb ?? "");
  const [abn,       setAbn]       = useState<string>(biz.settings?.abn ?? "");
  const [phone,     setPhone]     = useState<string>(biz.settings?.phone ?? "");
  const [website,   setWebsite]   = useState<string>(biz.settings?.website ?? "");
  const [tz,        setTz]        = useState<string>(biz.settings?.timezone ?? "Australia/Sydney");

  return (
    <Section title="Business basics" subtitle="Confirm what you collected and add details for receipts.">
      <Grid>
        <Field label="Business name"><input value={name}      onChange={e => setName(e.target.value)} /></Field>
        <Field label="Type">          <input value={type}      onChange={e => setType(e.target.value)} /></Field>
        <Field label="Suburb">        <input value={suburb}    onChange={e => setSuburb(e.target.value)} /></Field>
        <Field label="Subdomain">     <input value={subdomain} onChange={e => setSubdomain(e.target.value)} /></Field>
        <Field label="ABN">           <input value={abn}       onChange={e => setAbn(e.target.value)} placeholder="11 digits" /></Field>
        <Field label="Business phone"><input value={phone}     onChange={e => setPhone(e.target.value)} placeholder="+61 ..." /></Field>
        <Field label="Website">       <input value={website}   onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></Field>
        <Field label="Timezone">
          <select value={tz} onChange={e => setTz(e.target.value)}>
            {["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Perth","Australia/Adelaide","Australia/Darwin","Australia/Hobart","Pacific/Auckland","UTC"].map(z => <option key={z}>{z}</option>)}
          </select>
        </Field>
      </Grid>

      <SaveBar
        onSave={() => save({
          name, type, subdomain, suburb,
          settings: { abn, phone, website, timezone: tz },
        }, { advance: true })}
      />
    </Section>
  );
}

// ─── Step 2: Hours ────────────────────────────────────────────────────────
function StepHours({ biz, save }: { biz: Biz; save: SaveFn }) {
  const initial = biz.settings?.hours ?? {};
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {};
    for (const [k] of DAYS) {
      out[k] = initial[k] ?? { open: "09:00", close: "21:00", closed: false };
    }
    return out;
  });

  function copyMondayToAll() {
    const m = hours.mon;
    if (!m) return;
    const next = { ...hours };
    for (const [k] of DAYS) next[k] = { ...m };
    setHours(next);
  }

  return (
    <Section title="Operating hours" subtitle="These show on the storefront and drive AI-call routing.">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={copyMondayToAll} style={ghostBtn}>Copy Monday to all days</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 100px", gap: 10, alignItems: "center" }}>
        {DAYS.map(([k, label]) => {
          const row = hours[k]!;
          return (
            <RowContents key={k}>
              <div style={{ fontSize: 13, color: C.cl, fontWeight: 600 }}>{label}</div>
              <input type="time" disabled={row.closed} value={row.open}  onChange={e => setHours({ ...hours, [k]: { ...row, open: e.target.value } })} />
              <input type="time" disabled={row.closed} value={row.close} onChange={e => setHours({ ...hours, [k]: { ...row, close: e.target.value } })} />
              <label style={{ fontSize: 12, color: C.st, display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={row.closed} onChange={e => setHours({ ...hours, [k]: { ...row, closed: e.target.checked } })} />
                Closed
              </label>
            </RowContents>
          );
        })}
      </div>
      <SaveBar onSave={() => save({ settings: { hours } }, { advance: true })} />
    </Section>
  );
}

// ─── Step 3: Branding ─────────────────────────────────────────────────────
function StepBranding({ biz, save, show }: { biz: Biz; save: SaveFn; show: (m: string) => void }) {
  const [logo, setLogo]   = useState<string | null>(biz.logo_url);
  const [color, setColor] = useState<string>(biz.settings?.branding?.accent_color ?? "#00B67A");
  const [uploading, setUploading] = useState(false);

  async function handleLogo(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/onboarding/${biz.id}/logo`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { show(`Upload failed: ${data.error}`); return; }
      setLogo(data.logo_url);
      show("Logo uploaded ✓");
    } finally { setUploading(false); }
  }

  return (
    <Section title="Branding" subtitle="Shown on the storefront, receipts, and kitchen tickets.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={label}>Logo</div>
          <div style={{ aspectRatio: "1 / 1", maxWidth: 220, borderRadius: 12, background: C.bg, border: `1px dashed ${C.mist}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ color: C.st, fontSize: 13 }}>No logo yet</span>
            )}
          </div>
          <label style={ghostBtn}>
            {uploading ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleLogo(f); }} />
          </label>
        </div>
        <div>
          <Field label="Accent color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 56, height: 40, padding: 0, borderRadius: 8, border: `1px solid ${C.mist}`, background: "transparent" }} />
              <input value={color} onChange={e => setColor(e.target.value)} style={{ flex: 1 }} />
            </div>
          </Field>
          <div style={{ marginTop: 16, padding: 12, background: C.bg, borderRadius: 10, border: `1px solid ${C.mist}` }}>
            <div style={{ fontSize: 11, color: C.st, marginBottom: 6, fontWeight: 600 }}>Preview</div>
            <button style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 14 }}>
              Order now
            </button>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => save({ settings: { branding: { accent_color: color } } }, { advance: true })} />
    </Section>
  );
}

// ─── Step 4: Menu seed ────────────────────────────────────────────────────
type MenuDraft = { name: string; items: { name: string; price: number; description?: string }[] };

function StepMenu({ biz, show }: { biz: Biz; show: (m: string) => void }) {
  const [cats, setCats] = useState<MenuDraft[]>(DEFAULT_MENU);
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/onboarding/${biz.id}/seed-menu`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: cats.map((c, i) => ({ ...c, sort_order: i })) }),
      });
      const data = await res.json();
      if (!res.ok) { show(`Seed failed: ${data.error}`); return; }
      show(`Seeded ${data.categories} categories, ${data.items} items ✓`);
      setSeeded(true);
    } finally { setBusy(false); }
  }

  function addCategory() { setCats([...cats, { name: "", items: [{ name: "", price: 0 }] }]); }
  function removeCategory(i: number) { setCats(cats.filter((_, idx) => idx !== i)); }
  function updateCategory(i: number, next: MenuDraft) { setCats(cats.map((c, idx) => idx === i ? next : c)); }

  return (
    <Section title="Starter menu" subtitle="Seeds categories + items the owner can rename in Menu. Skip this step if they'll upload their own.">
      {seeded && (
        <div style={{ padding: 10, background: "rgba(0,182,122,.08)", border: "1px solid rgba(0,182,122,.25)", borderRadius: 8, color: C.g, fontSize: 13, marginBottom: 16 }}>
          ✓ Menu seeded. Advance to the next step when ready.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map((cat, i) => (
          <div key={i} style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input value={cat.name} onChange={e => updateCategory(i, { ...cat, name: e.target.value })} placeholder="Category name" style={{ flex: 1, fontWeight: 600 }} />
              <button onClick={() => removeCategory(i)} style={{ ...ghostBtn, padding: "6px 10px", color: C.r }}>Remove</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cat.items.map((it, j) => (
                <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 110px 32px", gap: 6 }}>
                  <input value={it.name} onChange={e => updateCategory(i, { ...cat, items: cat.items.map((x, k) => k === j ? { ...x, name: e.target.value } : x) })} placeholder="Item name" />
                  <input type="number" step="0.5" value={it.price} onChange={e => updateCategory(i, { ...cat, items: cat.items.map((x, k) => k === j ? { ...x, price: Number(e.target.value) } : x) })} />
                  <button onClick={() => updateCategory(i, { ...cat, items: cat.items.filter((_, k) => k !== j) })} style={{ ...ghostBtn, padding: "4px 6px" }}>×</button>
                </div>
              ))}
              <button onClick={() => updateCategory(i, { ...cat, items: [...cat.items, { name: "", price: 0 }] })} style={{ ...ghostBtn, alignSelf: "flex-start", marginTop: 4 }}>+ item</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={addCategory} style={ghostBtn}>+ Category</button>
        <div style={{ flex: 1 }} />
        <button disabled={busy} onClick={seed} className="bp" style={{ padding: "10px 18px" }}>
          {busy ? "Seeding…" : seeded ? "Seed again" : "Seed menu →"}
        </button>
      </div>
    </Section>
  );
}

// ─── Step 5: Payments ─────────────────────────────────────────────────────
function StepPayments({ biz, save, show }: { biz: Biz; save: SaveFn; show: (m: string) => void }) {
  const [gst,     setGst]    = useState<number>(biz.settings?.gst_rate ?? 10);
  const [fee,     setFee]    = useState<number>(biz.settings?.service_fee_rate ?? 0);
  const [tipStr,  setTipStr] = useState<string>((biz.settings?.tip_options ?? [5, 10, 15]).join(","));
  const [connecting, setConnecting] = useState(false);

  const live = biz.stripe_charges_enabled && biz.stripe_payouts_enabled;
  const started = Boolean(biz.stripe_account_id);

  async function startStripe() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: biz.id }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else show(data.error ?? "Couldn't start Stripe onboarding");
    } finally { setConnecting(false); }
  }

  return (
    <Section title="Payments" subtitle="Stripe Connect, GST, tip %. Owner can revisit in Settings later.">
      <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, color: C.cl, fontSize: 14 }}>Stripe Connect</div>
            <div style={{ fontSize: 12, color: C.st, marginTop: 4 }}>
              {live ? "Live — charges + payouts enabled" :
               started ? "Onboarding in progress — owner needs to finish" :
               "Not started"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ ...pill, background: biz.stripe_charges_enabled ? "rgba(0,182,122,.14)" : "rgba(255,193,75,.14)", color: biz.stripe_charges_enabled ? C.g : C.y }}>
              {biz.stripe_charges_enabled ? "Charges ✓" : "Charges —"}
            </span>
            <span style={{ ...pill, background: biz.stripe_payouts_enabled ? "rgba(0,182,122,.14)" : "rgba(255,193,75,.14)", color: biz.stripe_payouts_enabled ? C.g : C.y }}>
              {biz.stripe_payouts_enabled ? "Payouts ✓" : "Payouts —"}
            </span>
          </div>
        </div>
        <button onClick={startStripe} disabled={connecting} style={{ marginTop: 12, ...ghostBtn }}>
          {connecting ? "Opening Stripe…" : started ? "Resume onboarding in Stripe ↗" : "Start Stripe onboarding ↗"}
        </button>
      </div>

      <Grid>
        <Field label="GST %">         <input type="number" value={gst} onChange={e => setGst(Number(e.target.value))} /></Field>
        <Field label="Service fee %"> <input type="number" step="0.1" value={fee} onChange={e => setFee(Number(e.target.value))} /></Field>
        <Field label="Tip options (comma-separated %)">
          <input value={tipStr} onChange={e => setTipStr(e.target.value)} placeholder="5,10,15" />
        </Field>
      </Grid>

      <SaveBar
        onSave={() => save({
          settings: {
            gst_rate:         gst,
            service_fee_rate: fee,
            tip_options:      tipStr.split(",").map(s => Number(s.trim())).filter(n => !Number.isNaN(n)),
          },
        }, { advance: true })}
      />
    </Section>
  );
}

// ─── Step 6: Delivery providers ───────────────────────────────────────────
function StepDelivery({ biz, save }: { biz: Biz; save: SaveFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = biz.settings?.delivery ?? {};
  const [uberId,      setUberId]      = useState<string>(d.uber_direct?.customer_id    ?? "");
  const [uberClient,  setUberClient]  = useState<string>(d.uber_direct?.client_id      ?? "");
  const [uberSecret,  setUberSecret]  = useState<string>(d.uber_direct?.client_secret  ?? "");
  const [ddDev,       setDdDev]       = useState<string>(d.doordash?.developer_id     ?? "");
  const [ddKey,       setDdKey]       = useState<string>(d.doordash?.key_id           ?? "");
  const [ddSecret,    setDdSecret]    = useState<string>(d.doordash?.signing_secret   ?? "");
  const [shippo,      setShippo]      = useState<string>(d.shippo?.api_key            ?? "");
  const [auspost,     setAuspost]     = useState<string>(d.auspost?.api_key           ?? "");

  return (
    <Section title="Delivery providers" subtitle="Paste credentials from each provider portal. Blank ones stay disabled.">
      <ProviderCard title="Uber Direct" help="uber.com/business/deliveries/api">
        <Field label="Customer ID"><input value={uberId}      onChange={e => setUberId(e.target.value)} /></Field>
        <Field label="Client ID">  <input value={uberClient}  onChange={e => setUberClient(e.target.value)} /></Field>
        <Field label="Client secret"><input type="password" value={uberSecret} onChange={e => setUberSecret(e.target.value)} /></Field>
      </ProviderCard>
      <ProviderCard title="DoorDash Drive" help="developer.doordash.com">
        <Field label="Developer ID"> <input value={ddDev}   onChange={e => setDdDev(e.target.value)} /></Field>
        <Field label="Key ID">       <input value={ddKey}   onChange={e => setDdKey(e.target.value)} /></Field>
        <Field label="Signing secret"><input type="password" value={ddSecret} onChange={e => setDdSecret(e.target.value)} /></Field>
      </ProviderCard>
      <ProviderCard title="E-commerce shipping" help="Optional — for post-able goods">
        <Field label="Shippo API key"><input type="password" value={shippo} onChange={e => setShippo(e.target.value)} /></Field>
        <Field label="Australia Post API key"><input type="password" value={auspost} onChange={e => setAuspost(e.target.value)} /></Field>
      </ProviderCard>

      <SaveBar
        onSave={() => save({
          settings: {
            delivery: {
              uber_direct: { customer_id: uberId, client_id: uberClient, client_secret: uberSecret, enabled: Boolean(uberId) },
              doordash:    { developer_id: ddDev, key_id: ddKey, signing_secret: ddSecret, enabled: Boolean(ddDev) },
              shippo:      { api_key: shippo, enabled: Boolean(shippo) },
              auspost:     { api_key: auspost, enabled: Boolean(auspost) },
            },
          },
        }, { advance: true })}
      />
    </Section>
  );
}

// ─── Step 7: Notifications + Zentra Rewards defaults ────────────────────────────
function StepNotifications({ biz, save, show }: { biz: Biz; save: SaveFn; show: (m: string) => void }) {
  const [notifyEmail, setNotifyEmail] = useState<string>(biz.settings?.notify_email ?? "");
  const [notifyPhone, setNotifyPhone] = useState<string>(biz.settings?.notify_phone ?? "");
  const [fromEmail,   setFromEmail]   = useState<string>(biz.settings?.receipt_from_email ?? "");
  const [seeding, setSeeding] = useState(false);
  const [seeded,  setSeeded]  = useState(false);

  async function seedRules() {
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/onboarding/${biz.id}/seed-winback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: DEFAULT_WINBACK }),
      });
      const data = await res.json();
      if (!res.ok) { show(`Seed failed: ${data.error}`); return; }
      show(`Seeded ${data.inserted} winback rules ✓`);
      setSeeded(true);
    } finally { setSeeding(false); }
  }

  return (
    <Section title="Notifications & Zentra Rewards" subtitle="Where order alerts go, and default Zentra Rewards rules so automations work day 1.">
      <Grid>
        <Field label="Order alert email"><input value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="orders@business.com" /></Field>
        <Field label="Order alert phone"><input value={notifyPhone} onChange={e => setNotifyPhone(e.target.value)} placeholder="+61..." /></Field>
        <Field label="Receipt 'from' email"><input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@business.com" /></Field>
      </Grid>

      <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: C.cl, fontSize: 13 }}>Default Zentra Rewards rules</div>
            <div style={{ fontSize: 12, color: C.st, marginTop: 3 }}>
              Creates a 30-day (10% off) and 60-day (20% off) SMS campaign. Owner can edit anytime in Zentra Rewards.
            </div>
          </div>
          <button onClick={seedRules} disabled={seeding} className="bp" style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
            {seeding ? "Seeding…" : seeded ? "Seeded ✓" : "Seed rules"}
          </button>
        </div>
      </div>

      <SaveBar
        onSave={() => save({
          settings: { notify_email: notifyEmail, notify_phone: notifyPhone, receipt_from_email: fromEmail },
        }, { advance: true })}
      />
    </Section>
  );
}

// ─── Step 8: Team + review ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepTeam({ biz, router, show }: { biz: Biz; router: any; show: (m: string) => void }) {
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([]);
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("Manager");
  const [busy,    setBusy]    = useState(false);

  async function sendInvite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("Invalid email");
    setBusy(true);
    try {
      const res = await fetch("/api/team/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, businessId: biz.id, role, businessName: biz.name }),
      });
      const data = await res.json();
      if (!res.ok) { show(`Invite failed: ${data.error}`); return; }
      setInvites(prev => [...prev, { email, role }]);
      setEmail("");
      show(data.delivered ? `Invite sent to ${email} ✓` : "Invite recorded (email skipped)");
    } finally { setBusy(false); }
  }

  return (
    <Section title="Team & review" subtitle="Invite extra staff. When you finish, the owner will be able to log in and see everything you've set up.">
      <Grid>
        <Field label="Teammate email"><input value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@business.com" /></Field>
        <Field label="Role">
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option>Manager</option>
            <option>Staff</option>
            <option>POS</option>
          </select>
        </Field>
      </Grid>
      <button onClick={sendInvite} disabled={busy} className="bp" style={{ marginTop: 10, padding: "9px 14px" }}>
        {busy ? "Sending…" : "Send invite"}
      </button>

      {invites.length > 0 && (
        <div style={{ marginTop: 16, background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.st, marginBottom: 8, textTransform: "uppercase" }}>Invited</div>
          {invites.map((i, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: C.cl }}>
              <span>{i.email}</span><span style={{ color: C.st }}>{i.role}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, background: "rgba(0,182,122,.06)", border: "1px solid rgba(0,182,122,.25)", borderRadius: 10 }}>
        <div style={{ fontWeight: 600, color: C.g, fontSize: 14, marginBottom: 6 }}>🎉 Onboarding complete</div>
        <div style={{ fontSize: 13, color: C.cl, lineHeight: 1.55 }}>
          The owner has a magic link in their inbox. You can impersonate them from the admin panel to verify
          everything looks right, or hand it over and move on to your next sale.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => router.push("/admin")} className="bp" style={{ padding: "9px 14px" }}>Back to Super Admin</button>
          <button
            onClick={async () => {
              await fetch("/api/admin/impersonate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: biz.id }),
              });
              window.location.href = "/dashboard";
            }}
            style={ghostBtn}
          >
            Impersonate to verify ↗
          </button>
        </div>
      </div>
    </Section>
  );
}

// ─── Reusable bits ────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 18, color: C.cl }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: C.st, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-inter)" }}>
      <span style={label_()}>{label}</span>
      {children}
    </label>
  );
}

function ProviderCard({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 600, color: C.cl, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.st }}>{help}</div>
      </div>
      <Grid>{children}</Grid>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
      <button
        className="bp"
        disabled={busy}
        style={{ padding: "11px 22px" }}
        onClick={async () => { setBusy(true); try { await onSave(); } finally { setBusy(false); } }}
      >
        {busy ? "Saving…" : "Save & continue →"}
      </button>
    </div>
  );
}

function RowContents({ children }: { children: React.ReactNode }) { return <>{children}</>; }

const label = { fontSize: 12, fontWeight: 600 as const, color: C.st, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
function label_() { return label; }

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.mist}`,
  borderRadius: 8,
  padding: "9px 14px",
  color: C.cl,
  fontSize: 13,
  fontFamily: "var(--font-inter)",
  cursor: "pointer",
};

const pill: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "var(--font-outfit)",
};
