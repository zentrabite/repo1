"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import ImportCheck from "@/components/import-check";
import PasswordInput from "@/components/password-input";
import type { ImportedMenuCategory, StoredImport } from "@/lib/import/types";

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
  { id: 8, label: "Website",      icon: "🌐" },
  { id: 9, label: "Team",         icon: "👥" },
] as const;
const LAST_STEP = STEPS.length as StepId;

type StepId = (typeof STEPS)[number]["id"];

// ─── Data shapes ───────────────────────────────────────────────────────────
type Biz = {
  id:         string;
  name:       string;
  type:       string;
  suburb:     string | null;
  subdomain:  string | null;
  logo_url:   string | null;
  address?:   string | null;
  website?:   string | null;
  description?: string | null;
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
    if (typeof savedStep === "number" && savedStep >= 1 && savedStep <= LAST_STEP) setStep(savedStep as StepId);
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
          const next = Math.min(LAST_STEP, step + 1) as StepId;
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
        {step === 8 && <StepWebsite     biz={biz} save={save} show={show} />}
        {step === 9 && <StepTeam        biz={biz} router={router} show={show} />}
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
            if (step < LAST_STEP) setStep((step + 1) as StepId);
            else router.push(`/admin`);
          }}
          disabled={saving}
          className="bp"
          style={{ padding: "11px 22px" }}
        >
          {step < LAST_STEP ? "Skip →" : "Finish & return to Admin"}
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

// The website import's saved draft and its "Check this" notes, if there was one.
function importOf(biz: Biz): StoredImport | null {
  const imp = biz.settings?.import;
  return imp && typeof imp === "object" && imp.source_url ? (imp as StoredImport) : null;
}

function StepBasics({ biz, save }: { biz: Biz; save: SaveFn }) {
  const imp = importOf(biz);
  const [name,      setName]      = useState(biz.name);
  const [address,   setAddress]   = useState(biz.address ?? "");
  const [type,      setType]      = useState(biz.type);
  const [subdomain, setSubdomain] = useState(biz.subdomain ?? "");
  const [suburb,    setSuburb]    = useState(biz.suburb ?? "");
  const [abn,       setAbn]       = useState<string>(biz.settings?.abn ?? "");
  const [phone,     setPhone]     = useState<string>(biz.settings?.phone ?? "");
  const [website,   setWebsite]   = useState<string>(biz.settings?.website ?? biz.website ?? "");
  const [tz,        setTz]        = useState<string>(biz.settings?.timezone ?? "Australia/Sydney");

  return (
    <Section title="Business basics" subtitle="Confirm what you collected and add details for receipts.">
      {imp && <ImportBanner imp={imp} />}
      <Grid>
        <Field label="Business name"><input value={name}      onChange={e => setName(e.target.value)} /><ImportCheck note={imp?.checks.name} /></Field>
        <Field label="Type">          <input value={type}      onChange={e => setType(e.target.value)} /><ImportCheck note={imp?.checks.type} /></Field>
        <Field label="Suburb">        <input value={suburb}    onChange={e => setSuburb(e.target.value)} /><ImportCheck note={imp?.checks.suburb} /></Field>
        <Field label="Subdomain">     <input value={subdomain} onChange={e => setSubdomain(e.target.value)} /></Field>
        <Field label="ABN">           <input value={abn}       onChange={e => setAbn(e.target.value)} placeholder="11 digits" /></Field>
        <Field label="Business phone"><input value={phone}     onChange={e => setPhone(e.target.value)} placeholder="+61 ..." /><ImportCheck note={imp?.checks.phone} /></Field>
        <Field label="Street address"><input value={address}   onChange={e => setAddress(e.target.value)} placeholder="12 King William St, Adelaide SA 5000" /><ImportCheck note={imp?.checks.address} /></Field>
        <Field label="Website">       <input value={website}   onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></Field>
        <Field label="Timezone">
          <select value={tz} onChange={e => setTz(e.target.value)}>
            {["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Perth","Australia/Adelaide","Australia/Darwin","Australia/Hobart","Pacific/Auckland","UTC"].map(z => <option key={z}>{z}</option>)}
          </select>
        </Field>
      </Grid>

      <SaveBar
        onSave={() => save({
          name, type, subdomain, suburb, address,
          settings: { abn, phone, website, timezone: tz },
        }, { advance: true })}
      />
    </Section>
  );
}

// ─── Step 2: Hours ────────────────────────────────────────────────────────
function StepHours({ biz, save }: { biz: Biz; save: SaveFn }) {
  const imp = importOf(biz);
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
      {imp && (imp.hours || imp.checks.hours) && (
        <div style={importBox}>
          <div style={{ fontWeight: 600, color: C.cl, fontSize: 13 }}>
            {imp.hours ? "Filled in from their website" : "Hours weren't found on their website"}
          </div>
          {imp.hours && Object.keys(imp.hours.sessions).length > 0 && (
            <div style={{ fontSize: 12, color: C.st, marginTop: 6, lineHeight: 1.6 }}>
              {DAYS.filter(([k]) => imp.hours?.sessions[k]?.length).map(([k, dayLabel]) => (
                <div key={k}>
                  <strong style={{ color: C.cl }}>{dayLabel}</strong>{" "}
                  {imp.hours!.sessions[k]!.map(sn => `${sn.label ? `${sn.label} ` : ""}${sn.open}–${sn.close}`).join(", ")}
                </div>
              ))}
            </div>
          )}
          <ImportCheck note={imp.checks.hours} />
        </div>
      )}
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
  const imp = importOf(biz);
  const [logo, setLogo]   = useState<string | null>(biz.logo_url);
  const [pulling, setPulling] = useState<string | null>(null);

  async function pickImportedLogo(url: string) {
    setPulling(url);
    try {
      const res = await fetch(`/api/admin/onboarding/${biz.id}/logo`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(`Couldn't use that logo: ${data.error ?? res.status}`); return; }
      setLogo(data.logo_url);
      show("Logo saved ✓");
    } finally { setPulling(null); }
  }
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
          {imp && imp.logo_candidates.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={label}>From their website</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {imp.logo_candidates.map(u => (
                  <button
                    key={u}
                    onClick={() => pickImportedLogo(u)}
                    disabled={Boolean(pulling)}
                    title="Use this logo"
                    style={{ width: 84, height: 84, borderRadius: 10, background: "#fff", border: `1px solid ${C.mist}`, padding: 6, cursor: "pointer", opacity: pulling && pulling !== u ? 0.5 : 1 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.st, marginTop: 6 }}>{pulling ? "Saving…" : "Click one to use it as their logo."}</div>
            </div>
          )}
          <ImportCheck note={imp?.checks.logo} />
        </div>
        <div>
          <Field label="Accent color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 56, height: 40, padding: 0, borderRadius: 8, border: `1px solid ${C.mist}`, background: "transparent" }} />
              <input value={color} onChange={e => setColor(e.target.value)} style={{ flex: 1 }} />
            </div>
          </Field>
          {imp?.colours && (
            <div style={{ marginTop: 12 }}>
              <div style={label}>Colours on their website</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {imp.colours.swatches.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    title={c}
                    style={{ width: 34, height: 34, borderRadius: 8, background: c, border: color.toLowerCase() === c ? `2px solid ${C.cl}` : `1px solid ${C.mist}`, cursor: "pointer", padding: 0 }}
                  />
                ))}
              </div>
            </div>
          )}
          <ImportCheck note={imp?.checks.colours} />
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
type MenuDraft = { name: string; items: { name: string; price: number; description?: string; dietary_tags?: string[]; check?: string | null }[] };

// Imported menu → editable draft. Sizes go into the description because
// items have one price; anything without a price starts at 0 and is flagged.
function draftFromImport(menu: ImportedMenuCategory[]): MenuDraft[] {
  return menu.map(c => ({
    name: c.name,
    items: c.items.map(i => {
      const sizes = i.variants?.length ? `Sizes: ${i.variants.map(v => `${v.name} $${v.price.toFixed(2)}`).join(" · ")}` : "";
      return {
        name:         i.name,
        price:        i.price ?? 0,
        description:  [i.description, sizes].filter(Boolean).join(" ") || undefined,
        dietary_tags: i.dietary_tags ?? [],
        check:        i.check ?? null,
      };
    }),
  }));
}

function StepMenu({ biz, show }: { biz: Biz; show: (m: string) => void }) {
  const imp = importOf(biz);
  const importedMenu = imp?.menu?.length ? imp.menu : null;
  const [cats, setCats] = useState<MenuDraft[]>(() => importedMenu ? draftFromImport(importedMenu) : DEFAULT_MENU);
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
      // The imported draft has done its job; drop it so settings stay small.
      if (importedMenu) {
        await fetch(`/api/admin/onboarding/${biz.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { import: { menu: null, menu_seeded_at: new Date().toISOString() } } }),
        });
      }
    } finally { setBusy(false); }
  }

  function addCategory() { setCats([...cats, { name: "", items: [{ name: "", price: 0 }] }]); }
  function removeCategory(i: number) { setCats(cats.filter((_, idx) => idx !== i)); }
  function updateCategory(i: number, next: MenuDraft) { setCats(cats.map((c, idx) => idx === i ? next : c)); }

  return (
    <Section title={importedMenu ? "Menu from their website" : "Starter menu"} subtitle={importedMenu ? "Check names and prices with the owner, then seed. They can edit everything later in Menu." : "Seeds categories + items the owner can rename in Menu. Skip this step if they'll upload their own."}>
      {importedMenu && !seeded && (
        <div style={importBox}>
          <ImportCheck note={imp?.checks.menu} imported />
          {imp?.surcharges && imp.surcharges.length > 0 && (
            <div style={{ fontSize: 12, color: C.st, marginTop: 8 }}>
              Fees kept out of the menu: {imp.surcharges.join(" · ")}
            </div>
          )}
        </div>
      )}
      {!importedMenu && imp?.menu_seeded_at && (
        <div style={{ ...importBox, fontSize: 13, color: C.st }}>The imported menu was already seeded. Edit it in Menu.</div>
      )}
      {!importedMenu && !imp?.menu_seeded_at && imp?.checks.menu && <div style={importBox}><ImportCheck note={imp.checks.menu} /></div>}
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
                <div key={j}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 32px", gap: 6 }}>
                    <input value={it.name} onChange={e => updateCategory(i, { ...cat, items: cat.items.map((x, k) => k === j ? { ...x, name: e.target.value } : x) })} placeholder="Item name" />
                    <input type="number" step="0.5" value={it.price} onChange={e => updateCategory(i, { ...cat, items: cat.items.map((x, k) => k === j ? { ...x, price: Number(e.target.value), check: null } : x) })} />
                    <button onClick={() => updateCategory(i, { ...cat, items: cat.items.filter((_, k) => k !== j) })} style={{ ...ghostBtn, padding: "4px 6px" }}>×</button>
                  </div>
                  {(it.description || it.dietary_tags?.length) ? (
                    <div style={{ fontSize: 11, color: C.st, margin: "4px 2px 0" }}>
                      {it.dietary_tags?.length ? `${it.dietary_tags.join(" · ")}${it.description ? " — " : ""}` : ""}{it.description}
                    </div>
                  ) : null}
                  {it.check && <ImportCheck note={it.check} />}
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
        <Field label="Client secret"><PasswordInput label="secret" value={uberSecret} onChange={e => setUberSecret(e.target.value)} /></Field>
      </ProviderCard>
      <ProviderCard title="DoorDash Drive" help="developer.doordash.com">
        <Field label="Developer ID"> <input value={ddDev}   onChange={e => setDdDev(e.target.value)} /></Field>
        <Field label="Key ID">       <input value={ddKey}   onChange={e => setDdKey(e.target.value)} /></Field>
        <Field label="Signing secret"><PasswordInput label="secret" value={ddSecret} onChange={e => setDdSecret(e.target.value)} /></Field>
      </ProviderCard>
      <ProviderCard title="E-commerce shipping" help="Optional — for post-able goods">
        <Field label="Shippo API key"><PasswordInput label="key" value={shippo} onChange={e => setShippo(e.target.value)} /></Field>
        <Field label="Australia Post API key"><PasswordInput label="key" value={auspost} onChange={e => setAuspost(e.target.value)} /></Field>
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

// ─── Step 8: Website ──────────────────────────────────────────────────────
// Their site at name.zentrabite.com: the look, the words, which of their own
// photos we may use, and the publish switch. Stock photos fill in until the
// owner says which of their photos are theirs to use.
const LOOKS = [
  { id: "bold",  label: "Bold",       note: "White, big uppercase names" },
  { id: "warm",  label: "Warm, dark", note: "Near-black, serif headings" },
  { id: "clean", label: "Clean",      note: "Light and simple" },
] as const;

function StepWebsite({ biz, save, show }: { biz: Biz; save: SaveFn; show: (m: string) => void }) {
  const imp = importOf(biz);
  const site = (biz.settings?.site ?? {}) as { published?: boolean; look?: string; tagline?: string; about?: string; photos?: string[]; offer_text?: string };
  const [look,    setLook]    = useState<string>(site.look ?? "bold");
  const [tagline, setTagline] = useState<string>(site.tagline ?? imp?.tagline ?? "");
  const [about,   setAbout]   = useState<string>(site.about ?? biz.description ?? "");
  const [offer,   setOffer]   = useState<string>(site.offer_text ?? "");
  const [photos,  setPhotos]  = useState<string[]>(site.photos ?? []);
  const [busy,    setBusy]    = useState(false);
  const published = site.published === true;
  const address = biz.subdomain ? `${biz.subdomain}.zentrabite.com` : null;
  const imported = imp?.photos ?? [];

  function togglePhoto(url: string) {
    setPhotos(p => (p.includes(url) ? p.filter(x => x !== url) : [...p, url]));
  }

  const siteSettings = () => ({ look, tagline: tagline.trim(), about: about.trim(), offer_text: offer.trim(), photos });

  async function setPublished(next: boolean) {
    setBusy(true);
    try {
      const ok = await save({ settings: { site: { ...siteSettings(), published: next, ...(next ? { published_at: new Date().toISOString() } : {}) } } }, { silent: true });
      if (ok) show(next ? "Website published ✓" : "Website hidden");
    } finally { setBusy(false); }
  }

  return (
    <Section title="Website" subtitle="Their site with ordering built in. Check it with the owner, then publish.">
      <div style={{ ...importBox, background: published ? "rgba(0,182,122,.06)" : importBox.background, borderColor: published ? "rgba(0,182,122,.25)" : "rgba(255,193,75,.2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: published ? C.g : C.cl }}>{published ? "Live" : "Not published yet"}</div>
          {address && <div style={{ fontSize: 12, color: C.st, marginTop: 3 }}>{address}{published ? "" : " shows a holding page until you publish"}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {biz.subdomain && <button onClick={() => window.open(`/site/${biz.subdomain}`, "_blank")} style={ghostBtn}>Preview ↗</button>}
          <button onClick={() => setPublished(!published)} disabled={busy || !biz.subdomain} className={published ? undefined : "bp"} style={published ? ghostBtn : { padding: "9px 14px" }}>
            {busy ? "Saving…" : published ? "Unpublish" : "Publish website"}
          </button>
        </div>
      </div>

      <div style={label}>Look</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "6px 0 18px" }}>
        {LOOKS.map(l => (
          <button key={l.id} onClick={() => setLook(l.id)} style={{ ...ghostBtn, textAlign: "left", borderColor: look === l.id ? C.g : C.mist, background: look === l.id ? "rgba(0,182,122,.08)" : "transparent" }}>
            <div style={{ fontWeight: 600 }}>{l.label}</div>
            <div style={{ fontSize: 11, color: C.st, marginTop: 2 }}>{l.note}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Tagline (under their name)">
          <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Wood-fired pizza with dough rested for 48 hours" maxLength={200} />
        </Field>
        <Field label="About them (Our story)">
          <textarea value={about} onChange={e => setAbout(e.target.value)} rows={4} maxLength={1200} placeholder="A few sentences about the venue, in their words." />
          <ImportCheck note={imp?.checks.description} />
        </Field>
        <Field label="Offer banner (optional)">
          <input value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. $10 off your first order here. Only if the owner is running it." maxLength={160} />
        </Field>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={label}>Their photos</div>
        <div style={{ fontSize: 12, color: C.st, margin: "4px 0 10px", lineHeight: 1.5 }}>
          Tick only photos the owner took or has the rights to. The first one ticked is the big photo at the top. Until any are ticked, the site uses licensed stock photos.
        </div>
        {imported.length === 0 && <div style={{ fontSize: 12, color: C.st }}>No photos came from the import.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
          {imported.map(p => {
            const on = photos.includes(p.url);
            return (
              <button key={p.url} onClick={() => togglePhoto(p.url)} title={p.alt ?? ""} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", padding: 0, cursor: "pointer", border: on ? `2px solid ${C.g}` : `1px solid ${C.mist}`, background: C.bg }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: on ? 1 : 0.55 }} />
                {on && <span style={{ position: "absolute", top: 6, right: 6, background: C.g, color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 7px" }}>{photos.indexOf(p.url) + 1}</span>}
              </button>
            );
          })}
        </div>
        <ImportCheck note={imp?.checks.photos} />
      </div>

      <SaveBar onSave={() => save({ settings: { site: siteSettings() } }, { advance: true })} />
    </Section>
  );
}

// ─── Step 9: Team + review ────────────────────────────────────────────────
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

const importBox: React.CSSProperties = {
  background: "rgba(255,193,75,.05)",
  border: "1px solid rgba(255,193,75,.2)",
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
};

// Where the import came from and anything to raise with the owner.
function ImportBanner({ imp }: { imp: StoredImport }) {
  const host = imp.final_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <div style={importBox}>
      <div style={{ fontSize: 13, color: C.cl, fontWeight: 600 }}>
        Imported from {host} on {new Date(imp.fetched_at).toLocaleDateString("en-AU")}
        {imp.ai_used ? "" : " (pattern scan only)"}
      </div>
      <div style={{ fontSize: 12, color: C.st, marginTop: 4 }}>
        Go through anything marked &ldquo;Check this&rdquo; with the owner before the store goes live.
      </div>
      {imp.warnings.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: C.y, fontSize: 12, lineHeight: 1.5 }}>
          {imp.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}

const pill: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "var(--font-outfit)",
};
