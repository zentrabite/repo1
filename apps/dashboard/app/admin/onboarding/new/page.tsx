"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/use-business";

const BIZ_TYPES = [
  "restaurant", "cafe", "bar", "bakery", "food_truck",
  "retail", "salon", "gym", "service", "other",
] as const;

const C = { g:"#00B67A", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.09)" };

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function NewOnboardingPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [name,          setName]          = useState("");
  const [type,          setType]          = useState<string>("restaurant");
  const [subdomain,     setSubdomain]     = useState("");
  const [subdomainEdit, setSubdomainEdit] = useState(false);
  const [suburb,        setSuburb]        = useState("");
  const [ownerName,     setOwnerName]     = useState("");
  const [ownerEmail,    setOwnerEmail]    = useState("");
  const [ownerPhone,    setOwnerPhone]    = useState("");
  const [contactPhone,  setContactPhone]  = useState("");
  const [description,   setDescription]   = useState("");
  const [sendInvite,    setSendInvite]    = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Auto-suggest subdomain from name until the rep overrides it
  useEffect(() => {
    if (!subdomainEdit) setSubdomain(slugify(name));
  }, [name, subdomainEdit]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) router.replace("/dashboard");
  }, [authLoading, isSuperAdmin, router]);

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
          name, type, subdomain, suburb,
          ownerName, ownerEmail, ownerPhone,
          contactPhone, description,
          sendInvite,
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

      <div className="gc" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Business name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Joe's Pizza" autoFocus />
        </Field>

        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)}>
            {BIZ_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Suburb / city">
            <input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Bondi" />
          </Field>
          <Field label="Storefront subdomain">
            <input
              value={subdomain}
              onChange={e => { setSubdomainEdit(true); setSubdomain(slugify(e.target.value)); }}
              placeholder="joes-pizza"
            />
            <div style={{ fontSize: 11, color: C.st, marginTop: 4 }}>
              {subdomain ? `${subdomain}.shop.zentrabite.com.au` : "Auto-suggested from the name"}
            </div>
          </Field>
        </div>

        <Field label="What do they do? (short description)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Wood-fired pizza & pasta, dinner-only, dine-in + delivery"
          />
        </Field>

        <Field label="Business contact phone">
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
            <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-inter)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.st, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {children}
    </label>
  );
}
