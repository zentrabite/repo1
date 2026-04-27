"use client";

// ─── /admin/businesses/[id] ─────────────────────────────────────────────────
// Super-admin "About this tenant" page. One-screen summary of everything we
// might need if the owner calls in: who they are, how to reach them, what they
// do, and quick-launch buttons for dial, email, impersonate.
//
// All fields are inline-editable: typing into a field marks the form dirty;
// hitting "Save changes" PATCHes /api/admin/businesses/[id].

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useBusiness } from "@/hooks/use-business";

const C = {
  g:    "#00B67A",
  o:    "#FF6B35",
  r:    "#FF4757",
  y:    "#FFC14B",
  st:   "#6B7C93",
  cl:   "#F8FAFB",
  navy: "#1C2D48",
  mist: "rgba(226,232,240,.09)",
};

type Business = {
  id:                 string;
  name:               string;
  type:               string;
  suburb:             string | null;
  subdomain:          string | null;
  logo_url:           string | null;
  stripe_account_id:  string | null;
  description:        string | null;
  contact_phone:      string | null;
  contact_email:      string | null;
  website:            string | null;
  abn:                string | null;
  address:            string | null;
  created_at:         string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings:           any;
};

type Owner = {
  id:    string;
  name:  string | null;
  email: string | null;
  phone: string | null;
} | null;

function toast(text: string, kind: "success" | "warn" | "error" = "success") {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: ${kind === "success" ? "rgba(0,182,122,0.94)" : kind === "warn" ? "rgba(255,193,75,0.94)" : "rgba(255,71,87,0.95)"}; color: ${kind === "error" ? "#fff" : "#0F1F2D"};
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function AdminBusinessAboutPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [biz, setBiz]         = useState<Business | null>(null);
  const [owner, setOwner]     = useState<Owner>(null);

  // Editable fields (mirror of loaded state — we send a full PATCH on save)
  const [form, setForm] = useState({
    name:          "",
    type:          "",
    suburb:        "",
    description:   "",
    contact_phone: "",
    contact_email: "",
    website:       "",
    abn:           "",
    address:       "",
    owner_name:    "",
    owner_phone:   "",
    owner_email:   "",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }

    fetch(`/api/admin/businesses/${id}`)
      .then(r => r.json())
      .then((data: { business: Business; owner: Owner; error?: string }) => {
        if (data.error || !data.business) { toast("Business not found", "error"); router.replace("/admin"); return; }
        hydrate(data.business, data.owner);
        setLoading(false);
      })
      .catch(() => {
        toast("Couldn't load business", "error");
        setLoading(false);
      });
  }, [id, isSuperAdmin, authLoading, router]);

  function hydrate(b: Business, o: Owner) {
    setBiz(b);
    setOwner(o);
    setForm({
      name:          b.name          ?? "",
      type:          b.type          ?? "",
      suburb:        b.suburb        ?? "",
      description:   b.description   ?? "",
      contact_phone: b.contact_phone ?? "",
      contact_email: b.contact_email ?? "",
      website:       b.website       ?? "",
      abn:           b.abn           ?? "",
      address:       b.address       ?? "",
      owner_name:    o?.name  ?? "",
      owner_phone:   o?.phone ?? "",
      owner_email:   o?.email ?? "",
    });
    setDirty(false);
  }

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  }

  async function save() {
    if (!biz) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name,
          type:          form.type,
          suburb:        form.suburb,
          description:   form.description,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          website:       form.website,
          abn:           form.abn,
          address:       form.address,
          owner: {
            name:  form.owner_name,
            phone: form.owner_phone,
            email: form.owner_email,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      hydrate(data.business, data.owner);
      toast("Saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function impersonate() {
    if (!biz) return;
    try {
      const res = await fetch("/api/admin/impersonate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ businessId: biz.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Now viewing CRM as ${biz.name}`, "warn");
      setTimeout(() => { window.location.href = "/dashboard"; }, 400);
    } catch {
      toast("Impersonation failed", "error");
    }
  }

  if (authLoading || loading) {
    return <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", padding: 80, fontFamily: "var(--font-inter)" }}>Loading tenant…</div>;
  }
  if (!isSuperAdmin || !biz) return null;

  const subdomainUrl = biz.subdomain ? `${biz.subdomain}.zentrabite.com.au` : null;
  const signupDate   = new Date(biz.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", maxWidth: 1100 }}>
      {/* Back + title */}
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/admin"
          style={{ fontSize: 12.5, color: C.st, textDecoration: "none", fontFamily: "var(--font-inter)" }}
        >
          ← Back to Super Admin
        </Link>
      </div>

      {/* Hero card */}
      <div
        className="gc"
        style={{
          padding: 24,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "72px 1fr auto",
          gap: 18,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: 16,
            background: biz.logo_url ? `url(${biz.logo_url}) center/cover no-repeat` : "rgba(0,182,122,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.mist}`,
            fontSize: 32,
          }}
        >
          {!biz.logo_url && "🏪"}
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.st, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Tenant · About
          </div>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 26, color: C.cl, marginTop: 2 }}>
            {biz.name}
          </div>
          <div style={{ fontSize: 13, color: C.st, marginTop: 4, fontFamily: "var(--font-inter)" }}>
            {biz.type}{biz.suburb ? ` · ${biz.suburb}` : ""} · Signed up {signupDate}
          </div>
          {subdomainUrl && (
            <div style={{ fontSize: 12, color: C.st, marginTop: 6, fontFamily: "var(--font-mono)" }}>
              {subdomainUrl}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          {form.contact_phone && (
            <a
              href={`tel:${form.contact_phone}`}
              style={{
                padding: "8px 14px", borderRadius: 8,
                background: "rgba(0,182,122,0.14)", border: `1px solid ${C.g}`,
                color: C.g, fontSize: 13, fontWeight: 700, textDecoration: "none",
                fontFamily: "var(--font-inter)", textAlign: "center",
              }}
            >
              📞 Call business
            </a>
          )}
          {form.owner_phone && (
            <a
              href={`tel:${form.owner_phone}`}
              style={{
                padding: "8px 14px", borderRadius: 8,
                background: "rgba(0,182,122,0.14)", border: `1px solid ${C.g}`,
                color: C.g, fontSize: 13, fontWeight: 700, textDecoration: "none",
                fontFamily: "var(--font-inter)", textAlign: "center",
              }}
            >
              📞 Call owner
            </a>
          )}
          <button
            onClick={impersonate}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "rgba(255,107,53,0.14)", border: "1px solid rgba(255,107,53,0.35)",
              color: C.o, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-inter)",
            }}
          >
            Impersonate →
          </button>
        </div>
      </div>

      {/* Two-column edit form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="about-grid">
        {/* ── What they do ── */}
        <div className="gc" style={{ padding: 20 }}>
          <SectionHeader title="What they do" subtitle="Short description shown in ops overview" />
          <Field label="Description" textarea
            value={form.description}
            onChange={v => update("description", v)}
            placeholder="e.g. Wood-fired pizza & pasta in Fitzroy. Dinner-only, dine-in + delivery via Uber Direct."
          />
          <Field label="Business type"
            value={form.type}
            onChange={v => update("type", v)}
            placeholder="restaurant / cafe / retail…"
          />
          <Field label="Business name"
            value={form.name}
            onChange={v => update("name", v)}
          />
        </div>

        {/* ── Contact details ── */}
        <div className="gc" style={{ padding: 20 }}>
          <SectionHeader title="Contact details" subtitle="Business phone, email, website. Used when we call them" />
          <Field label="Contact phone"
            value={form.contact_phone}
            onChange={v => update("contact_phone", v)}
            placeholder="+61 3 1234 5678"
            type="tel"
          />
          <Field label="Contact email"
            value={form.contact_email}
            onChange={v => update("contact_email", v)}
            placeholder="hello@example.com.au"
            type="email"
          />
          <Field label="Website"
            value={form.website}
            onChange={v => update("website", v)}
            placeholder="https://…"
            type="url"
          />
        </div>

        {/* ── Owner details ── */}
        <div className="gc" style={{ padding: 20 }}>
          <SectionHeader title="Owner / primary contact" subtitle="Who signs off, who to call first" />
          <Field label="Owner name"
            value={form.owner_name}
            onChange={v => update("owner_name", v)}
            placeholder="Jane Smith"
          />
          <Field label="Owner phone"
            value={form.owner_phone}
            onChange={v => update("owner_phone", v)}
            placeholder="+61 4xx xxx xxx"
            type="tel"
          />
          <Field label="Owner email"
            value={form.owner_email}
            onChange={v => update("owner_email", v)}
            placeholder="jane@…"
            type="email"
          />
          {owner?.id && (
            <div style={{ fontSize: 11, color: C.st, marginTop: 6, fontFamily: "var(--font-mono)" }}>
              auth user id: {owner.id}
            </div>
          )}
        </div>

        {/* ── Premises & legal ── */}
        <div className="gc" style={{ padding: 20 }}>
          <SectionHeader title="Premises & legal" subtitle="Address and ABN for invoicing and site visits" />
          <Field label="Street address" textarea
            value={form.address}
            onChange={v => update("address", v)}
            placeholder="123 Smith St, Fitzroy VIC 3065"
          />
          <Field label="Suburb"
            value={form.suburb}
            onChange={v => update("suburb", v)}
            placeholder="Fitzroy"
          />
          <Field label="ABN"
            value={form.abn}
            onChange={v => update("abn", v)}
            placeholder="12 345 678 910"
          />
        </div>
      </div>

      {/* Quick-access links */}
      <div className="gc" style={{ padding: 20, marginTop: 14 }}>
        <SectionHeader title="Handy links" subtitle="Quick jumps for anything not on this page" />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          <QuickLink href={`/admin`} label="Back to tenant list" />
          <QuickLink href={`/admin/onboarding/${biz.id}`} label="Resume onboarding wizard" />
          {subdomainUrl && <QuickLink href={`https://${subdomainUrl}`} label={`Open ${subdomainUrl}`} external />}
          {biz.stripe_account_id && (
            <QuickLink
              href={`https://dashboard.stripe.com/connect/accounts/${biz.stripe_account_id}`}
              label="Stripe Connect dashboard"
              external
            />
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div style={{
        position: "sticky", bottom: 16, marginTop: 16,
        display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end",
        padding: "12px 16px", borderRadius: 12,
        background: "rgba(15,25,42,0.92)",
        border: `1px solid ${dirty ? C.g : C.mist}`,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ fontSize: 12.5, color: dirty ? C.y : C.st, fontFamily: "var(--font-inter)", marginRight: "auto" }}>
          {saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            padding: "9px 18px", borderRadius: 8,
            background: dirty ? C.g : "rgba(226,232,240,0.08)",
            color: dirty ? "#fff" : C.st,
            border: "none", fontWeight: 700, fontSize: 13,
            cursor: dirty && !saving ? "pointer" : "not-allowed",
            fontFamily: "var(--font-outfit)",
          }}
        >
          Save changes
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .about-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: C.cl }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: C.st, marginTop: 2, fontFamily: "var(--font-inter)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, textarea, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    style: {
      width: "100%",
      padding: "9px 12px",
      borderRadius: 8,
      background: "rgba(28,45,72,.5)",
      border: `1px solid ${C.mist}`,
      color: C.cl,
      fontSize: 13,
      fontFamily: "var(--font-inter)",
      outline: "none",
      resize: textarea ? "vertical" as const : "none" as const,
      minHeight: textarea ? 70 : undefined,
    },
  };
  return (
    <label style={{ display: "block", marginBottom: 10, fontFamily: "var(--font-inter)" }}>
      <span style={{ display: "block", fontSize: 11.5, color: C.st, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {textarea
        ? <textarea rows={3} {...common} />
        : <input type={type} {...common} />}
    </label>
  );
}

function QuickLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const commonStyle: React.CSSProperties = {
    display: "block",
    padding: "10px 13px",
    borderRadius: 10,
    background: "rgba(28,45,72,.5)",
    border: `1px solid ${C.mist}`,
    color: C.cl,
    fontSize: 13,
    textDecoration: "none",
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
  };
  if (external) {
    return <a href={href} target="_blank" rel="noreferrer" style={commonStyle}>{label} ↗</a>;
  }
  return <Link href={href} style={commonStyle}>{label} →</Link>;
}
