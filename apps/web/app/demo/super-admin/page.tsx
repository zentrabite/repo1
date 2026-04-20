"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/logo";
import {
  MODULE_CATALOGUE,
  tenants as seedTenants,
  tenantHealthColor,
  tenantHealthLabel,
  platformKpis,
  type ModuleId,
  type Tenant,
} from "./data";

function toast(text: string, kind: "success" | "warn" = "success") {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: ${kind === "success" ? "rgba(0,182,122,0.94)" : "rgba(255,193,75,0.94)"}; color: #0F1F2D;
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>(seedTenants);
  const [activeId, setActiveId] = useState<string>(seedTenants[0]!.id);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"modules" | "usage" | "ops">("modules");

  const active = tenants.find((t) => t.id === activeId)!;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter((t) =>
      [t.name, t.category, t.owner, t.subdomain, t.plan].join(" ").toLowerCase().includes(q)
    );
  }, [tenants, search]);

  function toggleModule(moduleId: ModuleId) {
    setTenants((prev) =>
      prev.map((t) =>
        t.id !== active.id
          ? t
          : { ...t, modules: { ...t.modules, [moduleId]: !t.modules[moduleId] } }
      )
    );
    const label = MODULE_CATALOGUE.find((m) => m.id === moduleId)?.label ?? moduleId;
    const nowOn = !active.modules[moduleId];
    toast(`${label} ${nowOn ? "enabled" : "disabled"} for ${active.name}`);
  }

  function setPlan(plan: Tenant["plan"]) {
    setTenants((prev) => prev.map((t) => (t.id !== active.id ? t : { ...t, plan })));
    toast(`${active.name} moved to ${plan} plan`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--near-black)", color: "var(--cloud)" }}>
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(15,25,42,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--mist-9)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/"><Logo size={30} /></Link>
          <div style={{ height: 24, width: 1, background: "var(--mist-9)" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
              Super Admin
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15 }}>
              Platform control plane
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              background: "rgba(255,107,53,0.18)",
              color: "var(--orange)",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            DEMO · fake data
          </span>
          <Link href="/demo" className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
            ← Demo hub
          </Link>
        </div>
      </header>

      {/* Platform KPIs */}
      <section style={{ padding: "28px 28px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }} className="sa-kpis">
          <Kpi label="Tenants" value={String(platformKpis.tenants)} sub={`${platformKpis.activeTenants} active`} />
          <Kpi label="MRR" value={`$${platformKpis.mrr.toLocaleString()}`} sub="ZentraBite monthly" accent />
          <Kpi label="Orders this mo." value={platformKpis.ordersThisMonth.toLocaleString()} sub="across all tenants" />
          <Kpi label="AI credits used" value={`${Math.round((platformKpis.creditsUsed / platformKpis.creditsCap) * 100)}%`} sub={`${platformKpis.creditsUsed.toLocaleString()} / ${platformKpis.creditsCap.toLocaleString()}`} />
          <Kpi label="Platform health" value="98.4%" sub="Uptime last 30d" accent />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, padding: "12px 28px 60px" }} className="sa-layout">
        {/* Tenant list */}
        <aside
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
            height: "fit-content",
            position: "sticky",
            top: 92,
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--mist-9)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 14 }}>
                Tenants ({tenants.length})
              </div>
              <button
                onClick={() => toast("New tenant wizard would open here", "warn")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  background: "var(--green)",
                  color: "var(--navy)",
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + New
              </button>
            </div>
            <input
              placeholder="Search tenants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 11px",
                borderRadius: 8,
                background: "var(--navy-40)",
                border: "1px solid var(--mist-9)",
                color: "var(--cloud)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          <div style={{ maxHeight: 640, overflowY: "auto" }}>
            {filtered.map((t) => {
              const on = t.id === activeId;
              const enabledCount = Object.values(t.modules).filter(Boolean).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "center",
                    width: "100%",
                    padding: "12px 14px",
                    background: on ? "rgba(0,182,122,0.10)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--mist-6)",
                    borderLeft: `3px solid ${on ? "var(--green)" : "transparent"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--cloud)" }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>
                      {t.category} · {t.plan} · {enabledCount} modules on
                    </div>
                  </div>
                  <span
                    title={tenantHealthLabel(t.health)}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: tenantHealthColor(t.health),
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Tenant detail */}
        <div>
          <div
            className="glass"
            style={{
              padding: 22,
              marginBottom: 16,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>
                Tenant
              </div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 26, color: "var(--cloud)" }}>
                {active.name}
              </div>
              <div style={{ fontSize: 13, color: "var(--steel)", marginTop: 4 }}>
                {active.category} · {active.locations} location{active.locations > 1 ? "s" : ""} · {active.owner}
              </div>
              <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                {active.subdomain}.zentrabite.store
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => toast(`Opening ${active.name} CRM as owner — would set impersonation cookie and redirect`, "warn")}
                className="btn-secondary"
                style={{ padding: "9px 14px", fontSize: 13 }}
              >
                Impersonate →
              </button>
              <Link
                href="/demo/live"
                className="btn-primary"
                style={{ padding: "9px 14px", fontSize: 13 }}
              >
                Open CRM
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["modules", "usage", "ops"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === t ? "rgba(0,182,122,0.14)" : "transparent",
                  color: tab === t ? "var(--green)" : "var(--steel)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t === "modules" ? "Modules & plan" : t === "usage" ? "Usage & billing" : "Ops & branding"}
              </button>
            ))}
          </div>

          {tab === "modules" && (
            <div className="glass" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)" }}>
                    Module toggles
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
                    Flip any module. The change writes to <code style={{ color: "var(--green)" }}>businesses.modules_json</code> and the merchant's CRM re-hydrates instantly.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["Starter", "Growth", "Scale"] as const).map((p) => {
                    const on = active.plan === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: `1px solid ${on ? "var(--green)" : "var(--mist-9)"}`,
                          background: on ? "rgba(0,182,122,0.12)" : "var(--navy-40)",
                          color: on ? "var(--green)" : "var(--cloud)",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {MODULE_CATALOGUE.map((m) => {
                  const on = !!active.modules[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModule(m.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: `1px solid ${on ? "var(--green)" : "var(--mist-9)"}`,
                        background: on ? "rgba(0,182,122,0.10)" : "var(--navy-40)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cloud)" }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>{m.desc}</div>
                        {m.cost > 0 && (
                          <div style={{ fontSize: 11.5, color: "var(--green)", marginTop: 6, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
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
              <div className="glass" style={{ padding: 22 }}>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginBottom: 14 }}>
                  This month at a glance
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }} className="sa-usage-kpis">
                  <Kpi label="MRR" value={`$${active.mrr}`} sub={active.plan + " plan"} accent />
                  <Kpi label="Orders" value={active.ordersMonth.toLocaleString()} sub="this month" />
                  <Kpi label="AI credits" value={`${active.aiCredits.used} / ${active.aiCredits.cap}`} sub={`${Math.round((active.aiCredits.used / active.aiCredits.cap) * 100)}% used`} />
                  <Kpi label="Stripe" value={active.stripeStatus === "active" ? "Active" : active.stripeStatus === "past_due" ? "Past due" : "Incomplete"} sub="Connect status" />
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
                    Credit usage
                  </div>
                  <div style={{ height: 10, background: "var(--navy-40)", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((active.aiCredits.used / active.aiCredits.cap) * 100))}%`,
                        height: "100%",
                        background: active.aiCredits.used / active.aiCredits.cap > 0.85 ? "var(--orange)" : "var(--green)",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="glass" style={{ padding: 22 }}>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginBottom: 14 }}>
                  Recent invoices
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Period</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { d: "Apr 1, 2026",  p: "Mar 1 – Mar 31",  a: active.mrr, s: "Paid" },
                      { d: "Mar 1, 2026",  p: "Feb 1 – Feb 28",  a: active.mrr, s: "Paid" },
                      { d: "Feb 1, 2026",  p: "Jan 1 – Jan 31",  a: active.mrr, s: "Paid" },
                    ].map((r) => (
                      <tr key={r.d} style={{ borderTop: "1px solid var(--mist-9)" }}>
                        <td style={tdStyle}>{r.d}</td>
                        <td style={{ ...tdStyle, color: "var(--steel)" }}>{r.p}</td>
                        <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", color: "var(--green)" }}>${r.a}.00</td>
                        <td style={tdStyle}>
                          <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(0,182,122,0.14)", color: "var(--green)", fontSize: 11, fontWeight: 700 }}>
                            {r.s}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "ops" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="glass" style={{ padding: 22 }}>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginBottom: 14 }}>
                  Branding & domain
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sa-ops-grid">
                  <Field label="Subdomain">
                    <input
                      defaultValue={`${active.subdomain}.zentrabite.store`}
                      style={opsInput}
                    />
                  </Field>
                  <Field label="Custom domain">
                    <input placeholder="harbourlane.com.au" style={opsInput} />
                  </Field>
                  <Field label="Brand name">
                    <input defaultValue={active.name} style={opsInput} />
                  </Field>
                  <Field label="Support tier">
                    <select style={opsInput}>
                      <option>Standard</option>
                      <option>Priority</option>
                      <option>Dedicated manager</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="glass" style={{ padding: 22 }}>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginBottom: 10 }}>
                  Audit log (last 10)
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {[
                    { t: "09:14 AM", a: "Module 'stock' re-enabled", who: "platform@zentrabite" },
                    { t: "Yesterday 14:22", a: "Stripe webhook signature rotated", who: "system" },
                    { t: "Yesterday 09:05", a: "Ordering app pushed to iOS TestFlight", who: "deploy-bot" },
                    { t: "2 days ago", a: "Owner invited new manager", who: active.owner },
                    { t: "3 days ago", a: "Credit cap raised from 1000 → 2500", who: "platform@zentrabite" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ fontSize: 12, color: "var(--steel)", fontFamily: "var(--font-mono)" }}>{r.t}</div>
                      <div style={{ fontSize: 13, color: "var(--cloud)" }}>{r.a}</div>
                      <div style={{ fontSize: 12, color: "var(--steel)" }}>{r.who}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass" style={{ padding: 22, border: "1px solid rgba(255,107,53,0.3)", background: "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(28,45,72,0.55))" }}>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--orange)", marginBottom: 6 }}>
                  Danger zone
                </div>
                <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 14 }}>
                  Suspending a tenant halts their CRM login and queues a data export. Deletion is 30-day delayed.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => toast("Tenant suspended — export queued", "warn")}
                    style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", color: "var(--orange)", border: "1px solid var(--orange)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    Suspend tenant
                  </button>
                  <button
                    onClick={() => toast("Confirmation modal would open", "warn")}
                    style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", color: "#FF6B6B", border: "1px solid #FF6B6B", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    Queue deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .sa-layout { grid-template-columns: 1fr !important; }
          .sa-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .sa-usage-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .sa-ops-grid { grid-template-columns: 1fr !important; }
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
        background: accent ? "rgba(0,182,122,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(0,182,122,0.28)" : "var(--mist-9)"}`,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: accent ? "var(--green)" : "var(--cloud)", marginTop: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>{sub}</div>}
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
        background: on ? "var(--green)" : "var(--mist-12)",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const opsInput: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  background: "var(--navy-40)",
  border: "1px solid var(--mist-9)",
  color: "var(--cloud)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  color: "var(--steel)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  fontSize: 13.5,
  color: "var(--cloud)",
  verticalAlign: "top",
};
