"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";

// ── Module catalogue (shared across all tenants; no plan tiers) ──────────────
type ModuleId =
  | "orders" | "loyalty" | "campaigns" | "ai_calls" | "driver_dispatch"
  | "stock" | "reviews" | "analytics" | "custom_website" | "ordering_app"
  | "sms" | "email";

const MODULE_CATALOGUE: { id: ModuleId; label: string; desc: string; cost: number }[] = [
  { id: "orders",          label: "Orders & POS",            cost: 29, desc: "Storefront, order board, KDS, payments" },
  { id: "loyalty",         label: "Loyalty & rewards",       cost: 19, desc: "Points, tiers, redemptions" },
  { id: "campaigns",       label: "Campaigns & Zentra Rewards", cost: 29, desc: "Automated SMS/email with attribution" },
  { id: "ai_calls",        label: "AI phone ordering",       cost: 29, desc: "Twilio + AI voice agent (credit-metered)" },
  { id: "driver_dispatch", label: "Driver dispatch",         cost: 19, desc: "Internal roster + Uber/DoorDash fallback" },
  { id: "stock",           label: "Stock & AI ordering",     cost: 19, desc: "Par levels, expiry, reorder suggestions" },
  { id: "reviews",         label: "Reviews & feedback",      cost: 0,  desc: "Auto-ask + AI reply draft" },
  { id: "analytics",       label: "Advanced analytics",      cost: 19, desc: "Cohort retention, heatmaps" },
  { id: "custom_website",  label: "Custom ordering website", cost: 19, desc: "Branded subdomain" },
  { id: "ordering_app",    label: "Branded customer app",    cost: 29, desc: "iOS + Android PWA" },
  { id: "sms",             label: "SMS channel",             cost: 0,  desc: "Used by campaigns & automations" },
  { id: "email",           label: "Email channel",           cost: 0,  desc: "Used by campaigns & automations" },
];

type AdminBiz = {
  id:                 string;
  name:               string;
  type:               string;
  suburb:             string | null;
  subdomain:          string | null;
  stripe_account_id:  string | null;
  stripe_customer_id: string | null;
  contact_phone:      string | null;
  contact_email:      string | null;
  description:        string | null;
  created_at:         string;
  customerCount:      number;
  orderCount:         number;
  totalRevenue:       number;
  smsSent:            number;
  lastOrder:          string | null;
  modules:            Record<string, boolean>;
  owner:              { name: string | null; email: string | null; phone: string | null } | null;
};

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", y:"#FFC14B", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.09)" };

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

export default function AdminPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [businesses, setBusinesses] = useState<AdminBiz[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"modules" | "usage" | "ops">("modules");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then((data: AdminBiz[]) => {
        const list = Array.isArray(data) ? data : [];
        setBusinesses(list);
        if (list.length) setActiveId(list[0]!.id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isSuperAdmin, authLoading, router]);

  const active = businesses.find(b => b.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return businesses;
    // If the query is mostly digits, also match against owner + contact phone
    // with all non-digits stripped (so "04 1234 5678" matches "0412345678").
    const qDigits = q.replace(/\D/g, "");
    const isPhoneish = qDigits.length >= 4 && qDigits.length >= q.replace(/\s|\+/g, "").length * 0.7;
    return businesses.filter(b => {
      const textHay = [
        b.name, b.type, b.suburb ?? "", b.subdomain ?? "",
        b.owner?.name ?? "", b.owner?.email ?? "",
        b.contact_email ?? "", b.description ?? "",
      ].join(" ").toLowerCase();
      if (textHay.includes(q)) return true;
      if (!isPhoneish) return false;
      const phoneHay = [b.owner?.phone ?? "", b.contact_phone ?? ""].join(" ").replace(/\D/g, "");
      return phoneHay.includes(qDigits);
    });
  }, [businesses, search]);

  const totalRevenue   = businesses.reduce((s, b) => s + b.totalRevenue, 0);
  const totalCustomers = businesses.reduce((s, b) => s + b.customerCount, 0);
  const totalOrders    = businesses.reduce((s, b) => s + b.orderCount, 0);
  const totalSMS       = businesses.reduce((s, b) => s + b.smsSent, 0);

  async function toggleModule(moduleId: ModuleId) {
    if (!active) return;
    const next = { ...active.modules, [moduleId]: !active.modules[moduleId] };
    // Optimistic
    setBusinesses(prev => prev.map(b => b.id === active.id ? { ...b, modules: next } : b));
    setSaving(true);
    try {
      const res = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: active.id, modules: { [moduleId]: next[moduleId] } }),
      });
      if (!res.ok) throw new Error(await res.text());
      const label = MODULE_CATALOGUE.find(m => m.id === moduleId)?.label ?? moduleId;
      toast(`${label} ${next[moduleId] ? "enabled" : "disabled"} for ${active.name}`);
    } catch (err) {
      // Roll back
      setBusinesses(prev => prev.map(b => b.id === active.id ? { ...b, modules: active.modules } : b));
      toast("Couldn't save module change", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleImpersonate(b: AdminBiz) {
    setImpersonating(b.id);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: b.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Now viewing CRM as ${b.name}`, "warn");
      // Give the cookie a tick, then land on their dashboard
      setTimeout(() => { window.location.href = "/dashboard"; }, 400);
    } catch {
      toast("Impersonation failed", "error");
      setImpersonating(null);
    }
  }

  if (authLoading || (loading && isSuperAdmin)) {
    return <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", padding: 80, fontFamily: "var(--font-inter)" }}>Loading super admin…</div>;
  }
  if (!isSuperAdmin) return null;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🔐</span>
            <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl }}>Super Admin</h2>
            <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,71,87,.12)", border: "1px solid rgba(255,71,87,.2)", fontSize: 11, fontWeight: 600, color: C.r, fontFamily: "var(--font-outfit)" }}>
              PLATFORM CONTROL
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: C.st }}>
            Every tenant on ZentraBite. Flip modules, impersonate owners, see usage live.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/onboarding/new")}
          style={{
            padding: "10px 18px",
            background: C.g,
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "var(--font-outfit)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> New business onboarding
        </button>
      </div>

      {/* Platform KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }} className="sa-kpis">
        <Kpi label="Tenants"        value={String(businesses.length)} sub={`${businesses.filter(b => b.stripe_account_id).length} stripe-connected`} />
        <Kpi label="Total revenue"  value={`$${totalRevenue.toLocaleString()}`} sub="all-time across tenants" accent />
        <Kpi label="Orders"         value={totalOrders.toLocaleString()} sub="platform-wide" />
        <Kpi label="Customers"      value={totalCustomers.toLocaleString()} sub="CRM records" />
        <Kpi label="SMS sent"       value={totalSMS.toLocaleString()} sub="since launch" />
      </div>

      {businesses.length === 0 ? (
        <div className="gc" style={{ padding: 40, textAlign: "center", color: C.st, fontFamily: "var(--font-inter)" }}>
          No businesses yet. Once a merchant signs up, they'll show up here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }} className="sa-layout">
          {/* Tenant list */}
          <aside
            className="gc"
            style={{
              overflow: "hidden",
              height: "fit-content",
              position: "sticky",
              top: 80,
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.mist}` }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.cl }}>
                Tenants ({businesses.length})
              </div>
              <input
                placeholder="Search by name, email, or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 11px",
                  borderRadius: 8,
                  background: "rgba(28,45,72,.5)",
                  border: `1px solid ${C.mist}`,
                  color: C.cl,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ maxHeight: 640, overflowY: "auto" }}>
              {filtered.map(b => {
                const on = b.id === activeId;
                const enabledCount = Object.values(b.modules).filter(Boolean).length;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveId(b.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      alignItems: "center",
                      width: "100%",
                      padding: "12px 14px",
                      background: on ? "rgba(0,182,122,0.10)" : "transparent",
                      border: "none",
                      borderBottom: `1px solid ${C.mist}`,
                      borderLeft: `3px solid ${on ? C.g : "transparent"}`,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.cl }}>{b.name}</div>
                      <div style={{ fontSize: 11.5, color: C.st, marginTop: 2 }}>
                        {b.type}{b.suburb ? ` · ${b.suburb}` : ""} · {enabledCount} modules on
                      </div>
                    </div>
                    <span
                      title={b.stripe_account_id ? "Stripe connected" : "No Stripe"}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: b.stripe_account_id ? C.g : C.st,
                        flexShrink: 0,
                      }}
                    />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: C.st }}>No matches</div>
              )}
            </div>
          </aside>

          {/* Tenant detail */}
          {active && (
            <div>
              {/* Tenant header */}
              <div
                className="gc"
                style={{
                  padding: 22,
                  marginBottom: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: C.st, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>
                    Tenant
                  </div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 24, color: C.cl }}>
                    {active.name}
                  </div>
                  <div style={{ fontSize: 13, color: C.st, marginTop: 4 }}>
                    {active.type}{active.suburb ? ` · ${active.suburb}` : ""}{active.owner?.name ? ` · ${active.owner.name}` : ""}
                  </div>
                  {active.subdomain && (
                    <div style={{ fontSize: 12, color: C.st, marginTop: 6, fontFamily: "var(--font-mono)" }}>
                      {active.subdomain}.zentrabite.com.au
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => router.push(`/admin/businesses/${active.id}`)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      background: "rgba(0,182,122,0.12)",
                      border: "1px solid rgba(0,182,122,0.35)",
                      color: C.g,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    About →
                  </button>
                  <button
                    onClick={() => handleImpersonate(active)}
                    disabled={impersonating === active.id}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      background: "rgba(255,107,53,0.14)",
                      border: "1px solid rgba(255,107,53,0.35)",
                      color: C.o,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: impersonating === active.id ? "wait" : "pointer",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {impersonating === active.id ? "Impersonating…" : "Impersonate →"}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(["modules", "usage", "ops"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: tab === t ? "rgba(0,182,122,0.14)" : "transparent",
                      color: tab === t ? C.g : C.st,
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {t === "modules" ? "Modules" : t === "usage" ? "Usage & billing" : "Ops"}
                  </button>
                ))}
              </div>

              {tab === "modules" && (
                <div className="gc" style={{ padding: 22 }}>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: C.cl }}>
                      Module toggles
                    </div>
                    <div style={{ fontSize: 12.5, color: C.st, marginTop: 2 }}>
                      Toggles write to <code style={{ color: C.g }}>businesses.settings.modules</code> and the merchant's CRM re-hydrates next load.
                      {saving && <span style={{ marginLeft: 8, color: C.y }}> · saving…</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                    {MODULE_CATALOGUE.map(m => {
                      const on = !!active.modules[m.id];
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleModule(m.id)}
                          disabled={saving}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: 10,
                            border: `1px solid ${on ? C.g : C.mist}`,
                            background: on ? "rgba(0,182,122,0.10)" : "rgba(28,45,72,.5)",
                            cursor: saving ? "wait" : "pointer",
                            textAlign: "left",
                            fontFamily: "var(--font-inter)",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.cl }}>{m.label}</div>
                            <div style={{ fontSize: 12, color: C.st, marginTop: 2 }}>{m.desc}</div>
                            {m.cost > 0 && (
                              <div style={{ fontSize: 11.5, color: C.g, marginTop: 6, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                +${m.cost}/mo when enabled
                              </div>
                            )}
                          </div>
                          <Toggle on={on} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === "usage" && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div className="gc" style={{ padding: 22 }}>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: C.cl, marginBottom: 14 }}>
                      This tenant at a glance
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }} className="sa-usage-kpis">
                      <Kpi label="Revenue"   value={`$${active.totalRevenue.toLocaleString()}`} sub="all-time" accent />
                      <Kpi label="Orders"    value={active.orderCount.toLocaleString()} sub="lifetime" />
                      <Kpi label="Customers" value={active.customerCount.toLocaleString()} sub="in CRM" />
                      <Kpi label="Stripe"    value={active.stripe_account_id ? "Connected" : "Not set"} sub="Connect account" />
                    </div>
                    <div style={{ marginTop: 16, fontSize: 12.5, color: C.st }}>
                      Last order:{" "}
                      {active.lastOrder
                        ? new Date(active.lastOrder).toLocaleString()
                        : "—"}{" · "}
                      Signed up: {new Date(active.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {tab === "ops" && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div className="gc" style={{ padding: 22 }}>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: C.cl, marginBottom: 14 }}>
                      Owner & contact
                    </div>
                    <div style={{ display: "grid", gap: 8, fontSize: 13.5, fontFamily: "var(--font-inter)", color: C.cl }}>
                      <Row k="Owner name"     v={active.owner?.name ?? "—"} />
                      <Row k="Owner email"    v={active.owner?.email ?? "—"} />
                      <Row k="Owner phone"    v={active.owner?.phone ?? "—"} />
                      <Row k="Business phone" v={active.contact_phone ?? "—"} />
                      <Row k="Business email" v={active.contact_email ?? "—"} />
                      <Row k="Subdomain"      v={active.subdomain ? `${active.subdomain}.zentrabite.com.au` : "—"} />
                      <Row k="Stripe acc."    v={active.stripe_account_id ?? "—"} />
                      <Row k="Business ID"    v={active.id} mono />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => router.push(`/admin/businesses/${active.id}`)}
                        style={{
                          padding: "8px 14px", borderRadius: 8,
                          background: "rgba(0,182,122,0.12)", color: C.g,
                          border: "1px solid rgba(0,182,122,0.35)",
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                          fontFamily: "var(--font-inter)",
                        }}
                      >
                        Open About page →
                      </button>
                    </div>
                  </div>

                  <div
                    className="gc"
                    style={{
                      padding: 22,
                      border: "1px solid rgba(255,107,53,0.3)",
                      background: "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(28,45,72,0.55))",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: C.o, marginBottom: 6 }}>
                      Danger zone
                    </div>
                    <div style={{ color: C.st, fontSize: 13, marginBottom: 14, fontFamily: "var(--font-inter)" }}>
                      Suspend halts CRM login and queues a data export. Deletion is 30-day delayed.
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={() => toast("Suspension not implemented yet — coming soon", "warn")}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", color: C.o, border: `1px solid ${C.o}`, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-inter)" }}
                      >
                        Suspend tenant
                      </button>
                      <button
                        onClick={() => toast("Deletion not implemented yet — coming soon", "warn")}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", color: "#FF6B6B", border: "1px solid #FF6B6B", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-inter)" }}
                      >
                        Queue deletion
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          .sa-layout { grid-template-columns: 1fr !important; }
          .sa-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .sa-usage-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: accent ? "rgba(0,182,122,0.08)" : "rgba(28,45,72,.5)",
        border: `1px solid ${accent ? "rgba(0,182,122,0.28)" : C.mist}`,
        fontFamily: "var(--font-inter)",
      }}
    >
      <div style={{ fontSize: 11, color: C.st, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: accent ? C.g : C.cl, marginTop: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.st, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 38,
        height: 22,
        borderRadius: 999,
        background: on ? C.g : "rgba(226,232,240,.2)",
        position: "relative",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "white",
          transition: "left 0.15s",
        }}
      />
    </span>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.mist}` }}>
      <span style={{ color: C.st, fontSize: 12.5 }}>{k}</span>
      <span style={{ color: C.cl, fontSize: 13, fontFamily: mono ? "var(--font-mono)" : "var(--font-inter)" }}>{v}</span>
    </div>
  );
}
