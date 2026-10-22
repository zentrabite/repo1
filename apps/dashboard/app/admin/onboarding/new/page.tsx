"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/use-business";
import ImportCheck from "@/components/import-check";
import type { ImportResult } from "@/lib/import/types";

const BIZ_TYPES = [
  "restaurant", "cafe", "bar", "bakery", "food_truck",
  "retail", "salon", "gym", "service", "other",
] as const;

const C = { g:"#00B67A", st:"#6B7C93", cl:"#F8FAFB", y:"#FFC14B", mist:"rgba(226,232,240,.09)", bg:"rgba(28,45,72,.5)" };

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type FieldKey = "name" | "type" | "suburb" | "description" | "contactPhone" | "address";

export default function NewOnboardingPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [name,          setName]          = useState("");
  const [type,          setType]          = useState<string>("restaurant");
  const [subdomain,     setSubdomain]     = useState("");
  const [subdomainEdit, setSubdomainEdit] = useState(false);
  const [suburb,        setSuburb]        = useState("");
  const [address,       setAddress]       = useState("");
  const [ownerName,     setOwnerName]     = useState("");
  const [ownerEmail,    setOwnerEmail]    = useState("");
  const [ownerPhone,    setOwnerPhone]    = useState("");
  const [contactPhone,  setContactPhone]  = useState("");
  const [description,   setDescription]   = useState("");
  const [sendInvite,    setSendInvite]    = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Website import
  const [importUrl,   setImportUrl]   = useState("");
  const [permission,  setPermission]  = useState(false);
  const [importing,   setImporting]   = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported,    setImported]    = useState<ImportResult | null>(null);
  // Which form fields still hold the imported value (so a re-import can refresh them)
  const [filledFromImport, setFilledFromImport] = useState<Partial<Record<FieldKey, string>>>({});

  // Auto-suggest subdomain from name until the rep overrides it
  useEffect(() => {
    if (!subdomainEdit) setSubdomain(slugify(name));
  }, [name, subdomainEdit]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!importing) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [importing]);

  async function runImport() {
    setImportError(null);
    if (!importUrl.trim()) return setImportError("Paste their website address first");
    if (!permission) return setImportError("Tick the box to confirm the owner is happy for us to copy their website");
    setImporting(true);
    setElapsed(0);
    try {
      const res = await fetch("/api/admin/onboarding/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: importUrl, permission: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setImportError(data.error ?? `Import failed (${res.status})`); return; }
      applyImport(data.result as ImportResult);
    } catch {
      setImportError("Network error. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  function applyImport(r: ImportResult) {
    const current: Record<FieldKey, string> = { name, type, suburb, description, contactPhone, address };
    const setters: Record<FieldKey, (v: string) => void> = {
      name: setName, type: setType, suburb: setSuburb, description: setDescription, contactPhone: setContactPhone, address: setAddress,
    };
    const found: Record<FieldKey, string | null> = {
      name:         r.name.value,
      type:         r.type.value && (BIZ_TYPES as readonly string[]).includes(r.type.value) ? r.type.value : null,
      suburb:       r.suburb.value,
      description:  r.description.value,
      contactPhone: r.phone.value,
      address:      r.address.value,
    };
    const next: Partial<Record<FieldKey, string>> = {};
    for (const k of Object.keys(found) as FieldKey[]) {
      const v = found[k];
      if (!v) continue;
      // Only fill a field the rep hasn't typed into (type starts as "restaurant").
      const untouched = !current[k] || current[k] === filledFromImport[k] || (k === "type" && current[k] === "restaurant");
      if (untouched) { setters[k](v); next[k] = v; }
    }
    setFilledFromImport(next);
    setImported(r);
  }

  // The import's "Check this" note for a form field, while it still holds the imported value.
  function checkFor(k: FieldKey, value: string): { note: string | null; imported: boolean } {
    if (!imported || filledFromImport[k] !== value) return { note: null, imported: false };
    const map = { name: imported.name, type: imported.type, suburb: imported.suburb, description: imported.description, contactPhone: imported.phone, address: imported.address };
    return { note: map[k].check ?? null, imported: true };
  }

  async function create() {
    setError(null);
    if (!name.trim()) return setError("Business name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return setError("Enter a valid owner email");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, type, subdomain, suburb, address,
          ownerName, ownerEmail, ownerPhone,
          contactPhone, description,
          sendInvite,
          ...(imported ? { import: imported, importPermission: true, website: imported.final_url } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Create failed"); return; }
      router.push(`/admin/onboarding/${data.businessId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading…</div>;
  if (!isSuperAdmin) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 0 80px" }}>
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "var(--font-inter)" }}
      >
        ← Back to Super Admin
      </button>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl }}>
            New Business Onboarding
          </h2>
        </div>
        <p style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: C.st }}>
          Step 1 of 8 · Identity & owner. The wizard will guide you through the rest.
        </p>
      </div>

      {/* ── Import from their website ─────────────────────────────────── */}
      <div className="gc" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: C.cl }}>Import from their website</div>
          <div style={{ fontSize: 13, color: C.st, marginTop: 3, fontFamily: "var(--font-inter)" }}>
            Paste their website and we&apos;ll fill in the details, hours, menu, logo and colours for you to check with the owner.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !importing) runImport(); }}
            placeholder="joespizza.com.au"
            inputMode="url"
            disabled={importing}
          />
          <button onClick={runImport} disabled={importing} className="bp" style={{ padding: "11px 18px", whiteSpace: "nowrap", opacity: importing ? 0.6 : 1 }}>
            {importing ? "Reading…" : imported ? "Import again" : "Import"}
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.cl, fontFamily: "var(--font-inter)", lineHeight: 1.45, cursor: "pointer" }}>
          <input type="checkbox" checked={permission} onChange={e => setPermission(e.target.checked)} style={{ width: 16, height: 16, flex: "none", marginTop: 2, padding: 0 }} />
          The owner is happy for us to copy their details, menu, logo and photos from their website.
        </label>

        {importing && (
          <div style={{ fontSize: 13, color: C.st, fontFamily: "var(--font-inter)" }}>
            Reading their website and menu… {elapsed}s. This can take up to 2 minutes for a long menu.
          </div>
        )}
        {importError && (
          <div style={{ padding: "10px 12px", background: "rgba(255,71,87,.12)", border: "1px solid rgba(255,71,87,.3)", borderRadius: 8, color: "#FF4757", fontSize: 13 }}>
            {importError}
          </div>
        )}
        {imported && !importing && <ImportSummary r={imported} />}
      </div>

      <div className="gc" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Business name" check={checkFor("name", name)}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Joe's Pizza" autoFocus />
        </Field>

        <Field label="Type" check={checkFor("type", type)}>
          <select value={type} onChange={e => setType(e.target.value)}>
            {BIZ_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </Field>

        <Field label="Street address" check={checkFor("address", address)}>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 King William St, Adelaide SA 5000" />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Suburb / city" check={checkFor("suburb", suburb)}>
            <input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Bondi" />
          </Field>
          <Field label="Storefront subdomain">
            <input
              value={subdomain}
              onChange={e => { setSubdomainEdit(true); setSubdomain(slugify(e.target.value)); }}
              placeholder="joes-pizza"
            />
            <div style={{ fontSize: 11, color: C.st, marginTop: 4 }}>
              {subdomain ? `${subdomain}.shop.zentrabite.com` : "Auto-suggested from the name"}
            </div>
          </Field>
        </div>

        <Field label="What do they do? (short description)" check={checkFor("description", description)}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Wood-fired pizza & pasta, dinner-only, dine-in + delivery"
          />
        </Field>

        <Field label="Business contact phone" check={checkFor("contactPhone", contactPhone)}>
          <input
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            placeholder="+61 3 1234 5678"
          />
        </Field>

        <div style={{ borderTop: `1px solid ${C.mist}`, paddingTop: 18, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.st, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Owner contact
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Owner name">
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Owner email *">
              <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="owner@joespizza.com" />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Owner mobile">
              <input
                type="tel"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="+61 4xx xxx xxx"
              />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: C.cl, fontFamily: "var(--font-inter)" }}>
            <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} style={{ width: 16, height: 16, flex: "none", padding: 0 }} />
            Send magic-link invite email now
          </label>
        </div>

        {error && (
          <div style={{ padding: "10px 12px", background: "rgba(255,71,87,.12)", border: "1px solid rgba(255,71,87,.3)", borderRadius: 8, color: "#FF4757", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button
            onClick={create}
            disabled={submitting}
            className="bp"
            style={{ padding: "11px 22px", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Creating…" : "Create & continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// What the import found, what it couldn't, and anything to raise with the owner.
function ImportSummary({ r }: { r: ImportResult }) {
  const menuItems = (r.menu.value ?? []).reduce((n, c) => n + c.items.length, 0);
  const found: string[] = [];
  const missing: string[] = [];
  const tally = (ok: boolean, label: string) => (ok ? found : missing).push(label);
  tally(Boolean(r.name.value), "name");
  tally(Boolean(r.phone.value), "phone");
  tally(Boolean(r.address.value), "address");
  tally(Boolean(r.hours.value), "hours");
  tally(menuItems > 0, menuItems ? `${menuItems} menu items` : "menu");
  tally(Boolean(r.logo_candidates.length), "logo");
  tally(Boolean(r.colours.value), r.colours.value ? `${r.colours.value.swatches.length} brand colours` : "brand colours");
  tally(Boolean(r.photos.value?.length), r.photos.value?.length ? `${r.photos.value.length} photos` : "photos");

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14, fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ color: C.g, fontWeight: 600 }}>Found: {found.join(", ") || "nothing useful"}</div>
      {missing.length > 0 && <div style={{ color: C.st, marginTop: 2 }}>Not found: {missing.join(", ")}</div>}
      <div style={{ color: C.st, marginTop: 6 }}>
        The details are filled in below. Hours, logo, colours and menu carry into the next steps. Anything marked
        &ldquo;Check this&rdquo; needs confirming with the owner before it goes live.
      </div>
      {r.warnings.length > 0 && (
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: C.y }}>
          {r.warnings.map((w, i) => <li key={i} style={{ marginTop: 2 }}>{w}</li>)}
        </ul>
      )}
      <div style={{ color: C.st, marginTop: 10, fontSize: 12 }}>
        Read {r.pages_read.length} page{r.pages_read.length === 1 ? "" : "s"} from {r.final_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        {r.ai.used ? "" : " · pattern scan only"}
      </div>
    </div>
  );
}

function Field({ label, check, children }: { label: string; check?: { note: string | null; imported: boolean }; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-inter)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.st, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {children}
      {check && <ImportCheck note={check.note} imported={check.imported} />}
    </label>
  );
}
