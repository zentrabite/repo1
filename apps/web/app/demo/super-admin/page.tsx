"use client";

// ─── /demo/super-admin ────────────────────────────────────────────────────────
// Static interactive demo of the ZentraBite platform admin console.
// Shows: tenant list → tenant detail (3 tabs) → platform health.
// All data is fake. Nothing is saved or sent.

import { useState, useMemo } from "react";
import Link from "next/link";

// ─── Design tokens (matching web app CSS vars) ────────────────────────────────
const G   = "var(--green)";
const ST  = "var(--steel)";
const CL  = "var(--cloud)";
const N40 = "var(--navy-40)";
const M9  = "var(--mist-9)";

// ─── Static data ──────────────────────────────────────────────────────────────
const ALL_MODULES = [
  { key:"loyalty",            label:"Rewards & Loyalty",    icon:"⭐", price:49,  desc:"Points, tiers, redemption catalogue",                    deps:[] },
  { key:"ai_calls",           label:"AI Voice Calls",       icon:"📞", price:79,  desc:"Inbound IVR + AI-handled calls via Twilio",              deps:[] },
  { key:"driver_dispatch",    label:"Driver Dispatch",      icon:"🛵", price:39,  desc:"In-house drivers, shift scheduling, live tracking",       deps:[] },
  { key:"stock",              label:"Stock & Inventory",    icon:"📦", price:29,  desc:"Par levels, expiry alerts, AI reorder suggestions",       deps:[] },
  { key:"campaigns",          label:"Campaigns & Zentra Rewards", icon:"🎯", price:49,  desc:"Automated SMS/email retention rules",                deps:["loyalty"] },
  { key:"sms",                label:"SMS",                  icon:"💬", price:19,  desc:"Twilio SMS send / receive",                              deps:[] },
  { key:"email",              label:"Email",                icon:"📧", price:14,  desc:"Resend transactional + marketing email",                  deps:[] },
  { key:"reviews",            label:"Reviews",              icon:"⭐", price:0,   desc:"Monitor and respond to customer reviews",                 deps:[] },
  { key:"custom_website",     label:"Custom Storefront",    icon:"🌐", price:59,  desc:"White-label ordering site on merchant subdomain",         deps:[] },
  { key:"ordering_app",       label:"Mobile App",           icon:"📱", price:99,  desc:"Branded iOS/Android app for the merchant's customers",    deps:["custom_website"] },
  { key:"advanced_analytics", label:"Advanced Analytics",   icon:"📊", price:39,  desc:"Cohorts, LTV modelling, channel attribution deep-dive",   deps:[] },
  { key:"premium_support",    label:"Priority Support",     icon:"🛟", price:49,  desc:"Dedicated Slack channel, 4-hour SLA",                    deps:[] },
];

type Modules = Record<string, boolean>;

type Tenant = {
  id: string;
  name: string;
  type: string;
  plan: "Starter" | "Growth" | "Scale";
  mrr: number;
  orders30d: number;
  aiCredits: number;
  health: "Healthy" | "Warning" | "Critical";
  lastActive: string;
  owner: string;
  email: string;
  subdomain: string;
  modules: Modules;
};

const TENANTS: Tenant[] = [
  {
    id:"t01", name:"Harbour Lane Pizza Co", type:"Restaurant", plan:"Growth", mrr:249, orders30d:1842, aiCredits:340, health:"Healthy", lastActive:"2 min ago",
    owner:"Marco Bellini", email:"marco@harbourlane.com.au", subdomain:"harbourlane",
    modules:{ loyalty:true, ai_calls:true, driver_dispatch:true, stock:true, campaigns:true, sms:true, email:true, reviews:true, custom_website:true, ordering_app:false, advanced_analytics:false, premium_support:false },
  },
  {
    id:"t02", name:"Bondi Bloom Florist", type:"Retail", plan:"Starter", mrr:89, orders30d:214, aiCredits:20, health:"Healthy", lastActive:"1 hr ago",
    owner:"Priya Sharma", email:"priya@bondibloom.com.au", subdomain:"bondibloom",
    modules:{ loyalty:true, ai_calls:false, driver_dispatch:false, stock:true, campaigns:false, sms:true, email:false, reviews:false, custom_website:true, ordering_app:false, advanced_analytics:false, premium_support:false },
  },
  {
    id:"t03", name:"Surry Hills Espresso Bar", type:"Café", plan:"Growth", mrr:189, orders30d:4102, aiCredits:510, health:"Warning", lastActive:"6 hr ago",
    owner:"Aiden Clarke", email:"aiden@surcafe.com.au", subdomain:"surcafe",
    modules:{ loyalty:true, ai_calls:true, driver_dispatch:false, stock:true, campaigns:true, sms:true, email:true, reviews:true, custom_website:false, ordering_app:false, advanced_analytics:true, premium_support:false },
  },
  {
    id:"t04", name:"Newtown Noodle House", type:"Restaurant", plan:"Scale", mrr:449, orders30d:3280, aiCredits:920, health:"Healthy", lastActive:"Just now",
    owner:"Lin Wei", email:"lin@newtownnoodle.com.au", subdomain:"newtownnoodle",
    modules:{ loyalty:true, ai_calls:true, driver_dispatch:true, stock:true, campaigns:true, sms:true, email:true, reviews:true, custom_website:true, ordering_app:true, advanced_analytics:true, premium_support:true },
  },
  {
    id:"t05", name:"Glebe Health & Juice Co", type:"Health / Wellness", plan:"Starter", mrr:89, orders30d:388, aiCredits:0, health:"Critical", lastActive:"3 days ago",
    owner:"Sophie Grant", email:"sophie@glebejuice.com.au", subdomain:"glebejuice",
    modules:{ loyalty:false, ai_calls:false, driver_dispatch:false, stock:false, campaigns:false, sms:true, email:false, reviews:false, custom_website:false, ordering_app:false, advanced_analytics:false, premium_support:false },
  },
  {
    id:"t06", name:"Manly Surf Burger", type:"Fast Food", plan:"Growth", mrr:219, orders30d:2650, aiCredits:180, health:"Healthy", lastActive:"30 min ago",
    owner:"Jake Donovan", email:"jake@manlyburger.com.au", subdomain:"manlyburger",
    modules:{ loyalty:true, ai_calls:false, driver_dispatch:true, stock:true, campaigns:true, sms:true, email:true, reviews:true, custom_website:true, ordering_app:false, advanced_analytics:false, premium_support:false },
  },
];

const PLAN_COLORS: Record<Tenant["plan"], { color:string; bg:string }> = {
  Starter: { color:"#6BB1FF", bg:"rgba(107,177,255,0.14)" },
  Growth:  { color:"#00B67A", bg:"rgba(0,182,122,0.14)" },
  Scale:   { color:"#FFC14B", bg:"rgba(255,193,75,0.14)" },
};

const HEALTH_COLORS: Record<Tenant["health"], { color:string; bg:string; dot:string }> = {
  Healthy:  { color:"#00B67A", bg:"rgba(0,182,122,0.12)",  dot:"#00B67A" },
  Warning:  { color:"#F59E0B", bg:"rgba(245,158,11,0.12)", dot:"#F59E0B" },
  Critical: { color:"#FF4757", bg:"rgba(255,71,87,0.12)",  dot:"#FF4757" },
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Pill({ color, bg, children }: { color:string; bg:string; children:React.ReactNode }) {
  return (
    <span style={{ padding:"3px 10px", borderRadius:999, background:bg, color, fontSize:11, fontWeight:700, letterSpacing:"0.04em", display:"inline-block", flexShrink:0 }}>
      {children}
    </span>
  );
}

function toast(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `position:fixed;top:60px;right:20px;z-index:9999;background:rgba(0,182,122,.94);color:#0F1F2D;padding:10px 16px;border-radius:10px;font-weight:600;font-family:var(--font-inter);font-size:13px;box-shadow:0 12px 32px rgba(0,0,0,.4);`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ─── Platform health data ─────────────────────────────────────────────────────
const HEALTH_METRICS = [
  { label:"API latency (p95)",  value:"112 ms",   status:"ok",   detail:"SLA ≤ 300 ms" },
  { label:"Order queue depth",  value:"3 jobs",    status:"ok",   detail:"Processing in real-time" },
  { label:"Webhook failures",   value:"2",         status:"warn", detail:"Last failure: DoorDash, 11:42 am" },
  { label:"AI credit burn",     value:"$14.20/hr", status:"ok",   detail:"Across 4 active tenants" },
  { label:"SMS delivery rate",  value:"98.4%",     status:"ok",   detail:"Twilio gateway" },
  { label:"DB connections",     value:"12 / 60",   status:"ok",   detail:"PG pool healthy" },
  { label:"Edge fn errors",     value:"0",         status:"ok",   detail:"Last 24 hours" },
  { label:"Storage bucket",     value:"4.1 GB",    status:"ok",   detail:"business-logos · 48 GB limit" },
];

const STATUS_COL: Record<string,string> = { ok:"#00B67A", warn:"#F59E0B", error:"#FF4757" };

// ─── Page ─────────────────────────────────────────────────────────────────────
type Screen = "list" | "detail" | "health" | "catalogue";
type DetailTab = "modules" | "usage" | "ops";

export default function SuperAdminPage() {
  const [screen,      setScreen]      = useState<Screen>("list");
  const [detailId,    setDetailId]    = useState<string>("t01");
  const [detailTab,   setDetailTab]   = useState<DetailTab>("modules");
  const [search,      setSearch]      = useState("");
  const [planFilter,  setPlanFilter]  = useState("All");
  const [healthFilter,setHealthFilter]= useState("All");
  const [tenants,     setTenants]     = useState<Tenant[]>(TENANTS);

  const tenant = useMemo(() => tenants.find(t => t.id === detailId) ?? tenants[0]!, [tenants, detailId]);

  const filtered = tenants.filter(t =>
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase())) &&
    (planFilter   === "All" || t.plan   === planFilter) &&
    (healthFilter === "All" || t.health === healthFilter)
  );

  const totalMrr   = tenants.reduce((s, t) => s + t.mrr, 0);
  const totalOrders = tenants.reduce((s, t) => s + t.orders30d, 0);

  const openDetail = (id: string) => { setDetailId(id); setDetailTab("modules"); setScreen("detail"); };

  const toggleModule = (key: string) => {
    setTenants(prev => prev.map(t => t.id === detailId
      ? { ...t, modules: { ...t.modules, [key]: !t.modules[key] } }
      : t
    ));
    const current = tenant.modules[key];
    toast(`${current ? "Disabled" : "Enabled"} ${ALL_MODULES.find(m=>m.key===key)?.label} for ${tenant.name}`);
  };

  const moduleMrr = useMemo(() => {
    const base: Record<string,{enabled:number;disabled:number}> = {};
    ALL_MODULES.forEach(m => { base[m.key] = {enabled:0,disabled:0}; });
    tenants.forEach(t => ALL_MODULES.forEach(m => {
      if (t.modules[m.key]) base[m.key]!.enabled++;
      else base[m.key]!.disabled++;
    }));
    return base;
  }, [tenants]);

  return (
    <div style={{ minHeight:"100vh", background:"var(--near-black)", fontFamily:"var(--font-inter)" }}>

      {/* ── Demo banner ── */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:60, background:"linear-gradient(90deg,rgba(201,162,74,.94),rgba(255,150,75,.94))", color:"white", padding:"8px 16px", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:999, background:"white" }} aria-hidden />
          SUPER ADMIN DEMO — Read-only view. Module toggles reset on page reload.
        </div>
        <Link href="/" style={{ color:"white", fontWeight:600, fontSize:12.5, padding:"4px 12px", borderRadius:8, background:"rgba(0,0,0,.18)", textDecoration:"none" }}>
          ← Back to site
        </Link>
      </div>

      <div style={{ display:"flex", paddingTop:40, minHeight:"100vh" }}>

        {/* ── Left sidebar ── */}
        <aside style={{ width:220, background:"rgba(15,25,42,.96)", borderRight:`1px solid ${M9}`, position:"fixed", top:40, bottom:0, display:"flex", flexDirection:"column", zIndex:40 }}>
          {/* Brand */}
          <div style={{ padding:"18px 16px 14px", borderBottom:`1px solid ${M9}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:G, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:13, color:"var(--navy)" }}>ZB</div>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14 }}>
                <span style={{ color:CL }}>Zentra</span><span style={{ color:G }}>Bite</span>
              </div>
            </div>
            <div style={{ fontSize:11, color:"var(--green)", fontWeight:600, marginTop:8, padding:"3px 8px", borderRadius:6, background:"rgba(0,182,122,.12)", display:"inline-block" }}>🔐 Super Admin</div>
          </div>

          {/* Platform stats */}
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${M9}` }}>
            {[
              { label:"Active tenants", value:tenants.length },
              { label:"Platform MRR",   value:`$${totalMrr.toLocaleString()}` },
              { label:"Orders (30d)",   value:totalOrders.toLocaleString() },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
                <span style={{ color:ST }}>{s.label}</span>
                <span style={{ color:CL, fontWeight:600 }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"10px 8px" }}>
            {([
              { id:"list",      label:"Tenants",         emoji:"🏢" },
              { id:"health",    label:"Platform Health", emoji:"📡" },
              { id:"catalogue", label:"Module Catalogue",emoji:"🧩" },
            ] as const).map(n => (
              <button key={n.id} onClick={() => setScreen(n.id)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 11px", borderRadius:9, marginBottom:2, border:"none", cursor:"pointer", fontSize:13, fontWeight: screen===n.id ? 600 : 400, color: screen===n.id ? G : ST, background: screen===n.id ? "rgba(0,182,122,.11)" : "transparent", borderLeft:`2px solid ${screen===n.id ? G : "transparent"}`, textAlign:"left" }}>
                <span style={{ fontSize:14 }}>{n.emoji}</span>{n.label}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ padding:14, borderTop:`1px solid ${M9}` }}>
            <Link href="/contact" style={{ display:"block", padding:"10px 12px", borderRadius:10, background:"rgba(0,182,122,.10)", border:"1px solid rgba(0,182,122,.28)", color:G, fontSize:12, fontWeight:600, textAlign:"center", textDecoration:"none" }}>
              Start your 1-month free trial →
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ marginLeft:220, flex:1, padding:"28px 32px", maxWidth:"calc(100vw - 220px)" }}>

          {/* ══ TENANT LIST ══════════════════════════════════════════════════ */}
          {screen === "list" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:26, color:CL, margin:0 }}>Tenants</h1>
                <p style={{ color:ST, fontSize:13, marginTop:4 }}>{tenants.length} businesses on platform · ${totalMrr}/mo MRR</p>
              </div>

              {/* Filters */}
              <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or type…"
                  style={{ padding:"8px 12px", borderRadius:8, background:N40, border:`1px solid ${M9}`, color:CL, fontSize:13, width:220 }}
                />
                {["All","Starter","Growth","Scale"].map(p => (
                  <button key={p} onClick={() => setPlanFilter(p)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${planFilter===p?"rgba(0,182,122,.4)":M9}`, background:planFilter===p?"rgba(0,182,122,.10)":N40, color:planFilter===p?G:ST, fontSize:12.5, fontWeight:planFilter===p?700:400, cursor:"pointer" }}>{p}</button>
                ))}
                {["All","Healthy","Warning","Critical"].map(h => {
                  const hc = h !== "All" ? HEALTH_COLORS[h as Tenant["health"]] : null;
                  return (
                    <button key={h} onClick={() => setHealthFilter(h)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${healthFilter===h?(hc?.color ?? G)+"66":M9}`, background:healthFilter===h?(hc?.bg ?? "rgba(0,182,122,.10)"):"transparent", color:healthFilter===h?(hc?.color ?? G):ST, fontSize:12.5, fontWeight:healthFilter===h?700:400, cursor:"pointer" }}>{h}</button>
                  );
                })}
                <button onClick={() => toast("Tenant created ✓ (demo only)")} style={{ marginLeft:"auto", padding:"7px 16px", borderRadius:8, background:G, border:"none", color:"var(--navy)", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>+ New Tenant</button>
              </div>

              {/* Table */}
              <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${M9}` }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${M9}` }}>
                      {["Business","Type","Plan","MRR","Orders (30d)","Health","Last Active",""].map(h => (
                        <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, color:ST, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => {
                      const pc = PLAN_COLORS[t.plan];
                      const hc = HEALTH_COLORS[t.health];
                      return (
                        <tr key={t.id} style={{ borderBottom: i<filtered.length-1?`1px solid ${M9}`:"none", cursor:"pointer", background:"rgba(255,255,255,.01)" }}
                          onClick={() => openDetail(t.id)}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,182,122,.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.01)")}
                        >
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ fontWeight:700, fontSize:14, color:CL }}>{t.name}</div>
                            <div style={{ fontSize:11, color:ST }}>{t.subdomain}.zentrabite.com.au</div>
                          </td>
                          <td style={{ padding:"12px 16px", fontSize:13, color:ST }}>{t.type}</td>
                          <td style={{ padding:"12px 16px" }}><Pill color={pc.color} bg={pc.bg}>{t.plan}</Pill></td>
                          <td style={{ padding:"12px 16px", fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:15, color:G }}>${t.mrr}</td>
                          <td style={{ padding:"12px 16px", fontSize:13, color:CL }}>{t.orders30d.toLocaleString()}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ width:7, height:7, borderRadius:999, background:hc.dot, boxShadow:`0 0 6px ${hc.dot}` }} />
                              <span style={{ fontSize:12, color:hc.color }}>{t.health}</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:ST }}>{t.lastActive}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <button onClick={e => { e.stopPropagation(); openDetail(t.id); }} style={{ padding:"5px 12px", borderRadius:7, background:N40, border:`1px solid ${M9}`, color:G, fontSize:12, fontWeight:600, cursor:"pointer" }}>Manage →</button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} style={{ padding:"32px", textAlign:"center", color:ST, fontSize:13 }}>No tenants match this filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ TENANT DETAIL ════════════════════════════════════════════════ */}
          {screen === "detail" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <button onClick={() => setScreen("list")} style={{ padding:"6px 14px", borderRadius:8, background:N40, border:`1px solid ${M9}`, color:ST, fontSize:13, cursor:"pointer" }}>← All Tenants</button>
                <div>
                  <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:24, color:CL, margin:0 }}>{tenant.name}</h1>
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <Pill color={PLAN_COLORS[tenant.plan].color} bg={PLAN_COLORS[tenant.plan].bg}>{tenant.plan}</Pill>
                    <Pill color={HEALTH_COLORS[tenant.health].color} bg={HEALTH_COLORS[tenant.health].bg}>{tenant.health}</Pill>
                    <span style={{ fontSize:12, color:ST, lineHeight:"22px" }}>Last active: {tenant.lastActive}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:"flex", gap:2, marginBottom:20, borderBottom:`1px solid ${M9}`, paddingBottom:0 }}>
                {([
                  { id:"modules", label:"📦 Modules & Plan" },
                  { id:"usage",   label:"📊 Usage & Billing" },
                  { id:"ops",     label:"🔧 Ops" },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setDetailTab(t.id)} style={{ padding:"10px 18px", border:"none", borderRadius:"8px 8px 0 0", background:detailTab===t.id?"rgba(0,182,122,.12)":"transparent", color:detailTab===t.id?G:ST, fontSize:13.5, fontWeight:detailTab===t.id?700:400, cursor:"pointer", borderBottom:`2px solid ${detailTab===t.id?G:"transparent"}`, marginBottom:-1 }}>{t.label}</button>
                ))}
              </div>

              {/* ─ Modules & Plan tab ─ */}
              {detailTab === "modules" && (
                <div>
                  <div style={{ marginBottom:16, padding:"12px 16px", borderRadius:10, background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.18)", fontSize:13, color:G }}>
                    Toggle any module on or off below. Changes take effect immediately for the merchant.
                    <strong> Demo: </strong>toggles are interactive but reset on reload.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
                    {ALL_MODULES.map(m => {
                      const on = tenant.modules[m.key] ?? false;
                      const depBlocked = m.deps.some(d => !tenant.modules[d]);
                      return (
                        <div key={m.key} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.02)", border:`1px solid ${on?"rgba(0,182,122,.25)":M9}`, opacity: depBlocked ? 0.5 : 1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                            <div style={{ fontSize:20, marginBottom:2 }}>{m.icon}</div>
                            {/* Toggle */}
                            <div onClick={() => !depBlocked && toggleModule(m.key)} style={{ width:40, height:22, borderRadius:11, background:on?"rgba(0,182,122,.3)":"rgba(255,255,255,.08)", cursor:depBlocked?"not-allowed":"pointer", position:"relative", border:`1px solid ${on?"rgba(0,182,122,.4)":"rgba(255,255,255,.06)"}`, flexShrink:0 }}>
                              <div style={{ width:16, height:16, borderRadius:"50%", background:on?G:ST, position:"absolute", top:2, left:on?20:2, transition:"all .2s" }} />
                            </div>
                          </div>
                          <div style={{ fontWeight:600, fontSize:13.5, color:on?CL:ST, marginBottom:3 }}>{m.label}</div>
                          <div style={{ fontSize:11.5, color:ST, lineHeight:1.4, marginBottom:6 }}>{m.desc}</div>
                          {m.price > 0 && <div style={{ fontSize:11, color:on?G:ST, fontWeight:600 }}>+${m.price}/mo</div>}
                          {m.price === 0 && <div style={{ fontSize:11, color:ST }}>Included</div>}
                          {depBlocked && <div style={{ fontSize:10, color:"#F59E0B", marginTop:4 }}>Requires: {m.deps.join(", ")}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:16, padding:"12px 16px", borderRadius:10, background:N40, border:`1px solid ${M9}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, color:ST }}>Current plan</div>
                      <div style={{ fontSize:16, fontWeight:700, color:CL, fontFamily:"var(--font-outfit)" }}>{tenant.plan} · ${tenant.mrr}/mo</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      {["Starter","Growth","Scale"].filter(p=>p!==tenant.plan).map(p => (
                        <button key={p} onClick={() => toast(`Plan changed to ${p} (demo only)`)} style={{ padding:"7px 14px", borderRadius:8, background:N40, border:`1px solid ${M9}`, color:ST, fontSize:12.5, cursor:"pointer" }}>Move to {p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─ Usage & Billing tab ─ */}
              {detailTab === "usage" && (
                <div style={{ display:"grid", gap:14 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                    {[
                      { label:"Orders this month",  value:tenant.orders30d.toLocaleString(), sub:"vs 1,640 prev month" },
                      { label:"AI credits used",    value:`${tenant.aiCredits} credits`,    sub:"~$${(tenant.aiCredits * 0.015).toFixed(2)} cost" },
                      { label:"Monthly revenue",    value:`$${tenant.mrr}`,                  sub:"via Stripe Connect" },
                    ].map(s => (
                      <div key={s.label} style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${M9}` }}>
                        <div style={{ fontSize:11, color:ST, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>{s.label}</div>
                        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:24, color:G, marginTop:4 }}>{s.value}</div>
                        <div style={{ fontSize:11, color:ST, marginTop:2 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${M9}` }}>
                    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:15, color:CL, marginBottom:10 }}>Invoice history (demo)</div>
                    {["Apr 2026","Mar 2026","Feb 2026"].map((month, i) => (
                      <div key={month} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<2?`1px solid ${M9}`:"none", fontSize:13 }}>
                        <span style={{ color:CL }}>{month}</span>
                        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                          <Pill color="#00B67A" bg="rgba(0,182,122,.12)">Paid</Pill>
                          <span style={{ color:G, fontWeight:600 }}>${tenant.mrr}</span>
                          <button onClick={() => toast("Invoice downloaded (demo only)")} style={{ padding:"3px 10px", borderRadius:6, background:"transparent", border:`1px solid ${M9}`, color:ST, fontSize:11, cursor:"pointer" }}>PDF</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.2)", fontSize:13, color:"#F59E0B" }}>
                    <strong>Stripe Connect</strong> — Payouts for this tenant go to their connected Stripe account. All {tenant.orders30d.toLocaleString()} orders processed directly to merchant.
                  </div>
                </div>
              )}

              {/* ─ Ops tab ─ */}
              {detailTab === "ops" && (
                <div style={{ display:"grid", gap:14 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${M9}` }}>
                      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:CL, marginBottom:10 }}>Account info</div>
                      {[
                        ["Owner",     tenant.owner],
                        ["Email",     tenant.email],
                        ["Subdomain", tenant.subdomain + ".zentrabite.com.au"],
                        ["Business",  tenant.type],
                      ].map(([l,v]) => (
                        <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13 }}>
                          <span style={{ color:ST }}>{l}</span><span style={{ color:CL }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${M9}` }}>
                      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:CL, marginBottom:10 }}>Actions</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        <button onClick={() => toast(`Impersonating ${tenant.name} (demo only)`)} style={{ padding:"10px 14px", borderRadius:9, background:"rgba(0,182,122,.10)", border:"1px solid rgba(0,182,122,.28)", color:G, fontSize:13, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
                          👤 Impersonate merchant →
                        </button>
                        <button onClick={() => toast("Password reset email sent (demo only)")} style={{ padding:"10px 14px", borderRadius:9, background:N40, border:`1px solid ${M9}`, color:CL, fontSize:13, cursor:"pointer", textAlign:"left" }}>
                          🔑 Send password reset
                        </button>
                        <button onClick={() => toast("Support ticket opened (demo only)")} style={{ padding:"10px 14px", borderRadius:9, background:N40, border:`1px solid ${M9}`, color:CL, fontSize:13, cursor:"pointer", textAlign:"left" }}>
                          🛟 Open support ticket
                        </button>
                        <button onClick={() => toast("Tenant suspended (demo only)")} style={{ padding:"10px 14px", borderRadius:9, background:"rgba(255,71,87,.06)", border:"1px solid rgba(255,71,87,.2)", color:"#FF4757", fontSize:13, cursor:"pointer", textAlign:"left" }}>
                          ⚠️ Suspend account
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${M9}` }}>
                    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:CL, marginBottom:10 }}>Audit log (last 5 events)</div>
                    {[
                      { ts:"Today 11:42 am", ev:`Module 'ai_calls' enabled by super admin` },
                      { ts:"Today 09:15 am", ev:`Owner logged in from Sydney, NSW` },
                      { ts:"Yesterday 3:22 pm", ev:`SMS campaign sent to 42 customers` },
                      { ts:"Yesterday 1:01 pm", ev:`Plan changed: Starter → Growth` },
                      { ts:"Apr 20, 9:00 am", ev:`Win-back edge function ran — 3 messages sent` },
                    ].map((e, i) => (
                      <div key={i} style={{ display:"flex", gap:14, padding:"7px 0", borderBottom:i<4?`1px solid ${M9}`:"none", fontSize:13 }}>
                        <span style={{ color:ST, flexShrink:0, fontSize:11, fontFamily:"var(--font-mono)", lineHeight:"19px" }}>{e.ts}</span>
                        <span style={{ color:CL }}>{e.ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ PLATFORM HEALTH ══════════════════════════════════════════════ */}
          {screen === "health" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:26, color:CL, margin:0 }}>Platform Health</h1>
                <p style={{ color:ST, fontSize:13, marginTop:4 }}>Live service status across all infrastructure</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12, marginBottom:20 }}>
                {HEALTH_METRICS.map(m => {
                  const col = STATUS_COL[m.status]!;
                  return (
                    <div key={m.label} style={{ padding:"14px 16px", borderRadius:12, background:N40, border:`1px solid ${m.status==="warn"?"rgba(245,158,11,.3)":M9}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ fontSize:11, color:ST, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>{m.label}</div>
                        <span style={{ width:8, height:8, borderRadius:999, background:col, boxShadow:`0 0 6px ${col}`, flexShrink:0, marginTop:2 }} />
                      </div>
                      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:22, color:col, marginTop:4 }}>{m.value}</div>
                      <div style={{ fontSize:11, color:ST, marginTop:3 }}>{m.detail}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.2)" }}>
                <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:"#F59E0B", marginBottom:6 }}>⚠️ 2 Webhook failures — DoorDash integration</div>
                <p style={{ fontSize:13, color:CL, margin:"0 0 8px" }}>DoorDash webhook endpoint returned 503 at 11:42 am and 11:43 am. Retried once automatically. No orders were dropped — fallback to Uber Direct succeeded. Investigate DoorDash API status.</p>
                <button onClick={() => toast("Ticket opened with DoorDash (demo only)")} style={{ padding:"7px 14px", borderRadius:8, background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)", color:"#F59E0B", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Open incident ticket</button>
              </div>
            </div>
          )}

          {/* ══ MODULE CATALOGUE ═════════════════════════════════════════════ */}
          {screen === "catalogue" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:26, color:CL, margin:0 }}>Module Catalogue</h1>
                <p style={{ color:ST, fontSize:13, marginTop:4 }}>All modules available across the platform · toggle per-tenant from tenant detail</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
                {ALL_MODULES.map(m => {
                  const stats = moduleMrr[m.key]!;
                  return (
                    <div key={m.key} style={{ padding:"16px 18px", borderRadius:14, background:"rgba(255,255,255,.02)", border:`1px solid ${M9}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ fontSize:24 }}>{m.icon}</div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:16, fontWeight:800, color:G, fontFamily:"var(--font-outfit)" }}>{m.price > 0 ? `+$${m.price}/mo` : "Included"}</div>
                          <div style={{ fontSize:11, color:ST }}>{stats.enabled} tenants enabled</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:14, color:CL, marginBottom:4 }}>{m.label}</div>
                      <div style={{ fontSize:12.5, color:ST, lineHeight:1.5, marginBottom:8 }}>{m.desc}</div>
                      {m.deps.length > 0 && (
                        <div style={{ fontSize:11, color:"#F59E0B" }}>Requires: {m.deps.join(", ")}</div>
                      )}
                      {/* Adoption bar */}
                      <div style={{ marginTop:10 }}>
                        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
                          <div style={{ height:"100%", borderRadius:2, background:G, width:`${Math.round(stats.enabled/tenants.length*100)}%`, transition:"width .3s" }} />
                        </div>
                        <div style={{ fontSize:10, color:ST, marginTop:3 }}>{Math.round(stats.enabled/tenants.length*100)}% adoption across tenants</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
