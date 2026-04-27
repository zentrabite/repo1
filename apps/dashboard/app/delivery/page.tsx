"use client";

// ─── /delivery — Smart Delivery Routing Dashboard ────────────────────────────
// Shows:
//   1. Live routing test tool — enter an address, get a real-time provider comparison
//   2. 7-day delivery plan (volume predictions + recommended provider mix)
//   3. Delivery analytics — margin, provider breakdown, success rate
//   4. Recent jobs feed

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { supabase } from "@/lib/supabase";
import type { DeliveryPrediction, RoutingDecision, ProviderQuote, ProviderId } from "@/lib/delivery-types";

const C = { g:"#00B67A", o:"#FF6B35", b:"#3B82F6", r:"#FF4757", am:"#F59E0B", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(255,255,255,.07)" };

const PROVIDER_META: Record<string, { label:string; color:string; flag:string }> = {
  uber_direct: { label:"Uber Direct",   color:"#3B82F6",  flag:"🚗" },
  doordash:    { label:"DoorDash Drive", color:"#FF3008",  flag:"🔴" },
  sherpa:      { label:"Sherpa",         color:"#7C3AED",  flag:"📦" },
  zoom2u:      { label:"Zoom2u",         color:"#059669",  flag:"⚡" },
  gopeople:    { label:"GoPeople",       color:"#F59E0B",  flag:"🏃" },
  none:        { label:"No providers",   color:"#6B7C93",  flag:"⛔" },
};

function QuoteCard({ q, selected }: { q: ProviderQuote; selected: boolean }) {
  const meta = PROVIDER_META[q.provider] ?? PROVIDER_META.none!;
  return (
    <div style={{
      padding:"12px 14px", borderRadius:10,
      background: selected ? `${meta.color}18` : "rgba(255,255,255,.03)",
      border:`1px solid ${selected ? meta.color : "rgba(255,255,255,.08)"}`,
      opacity: q.available ? 1 : 0.45,
      position:"relative",
    }}>
      {selected && <div style={{ position:"absolute", top:8, right:8, fontSize:10, fontWeight:700, color:meta.color, background:`${meta.color}22`, padding:"2px 7px", borderRadius:999 }}>SELECTED</div>}
      <div style={{ fontSize:18, marginBottom:4 }}>{meta.flag}</div>
      <div style={{ fontWeight:700, fontSize:13, color:"#fff", marginBottom:3 }}>{meta.label}</div>
      {!q.available ? (
        <div style={{ fontSize:11, color:C.st }}>{q.error ?? "Unavailable"}</div>
      ) : (
        <>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:20, color:meta.color, marginBottom:2 }}>${q.cost.toFixed(2)}</div>
          <div style={{ fontSize:11, color:C.st }}>ETA {q.deliveryEtaMin} min · pickup in {q.pickupEtaMin} min</div>
        </>
      )}
    </div>
  );
}

function todayString() { const d = new Date(); return d.toISOString().slice(0,10); }
function nextNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() + i); days.push(d.toISOString().slice(0,10)); }
  return days;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function DeliveryPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [tab,          setTab]          = useState<"route"|"plan"|"analytics"|"jobs">("route");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [weekPlan,     setWeekPlan]     = useState<DeliveryPrediction[]>([]);
  const [weekLoading,  setWeekLoading]  = useState(false);

  // Live route test
  const [pickupAddr,   setPickupAddr]   = useState("");
  const [dropoffAddr,  setDropoffAddr]  = useState("");
  const [distanceKm,   setDistanceKm]   = useState("");
  const [orderValue,   setOrderValue]   = useState("");
  const [tier,         setTier]         = useState<"standard"|"priority">("standard");
  const [isPeak,       setIsPeak]       = useState(false);
  const [isHighDemand, setIsHighDemand] = useState(false);
  const [isBadWeather, setIsBadWeather] = useState(false);
  const [routing,      setRouting]      = useState(false);
  const [decision,     setDecision]     = useState<RoutingDecision | null>(null);

  // Analytics
  const [analytics,    setAnalytics]    = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Recent jobs
  const [jobs,        setJobs]          = useState<any[]>([]);
  const [jobsLoading, setJobsLoading]   = useState(false);

  const fetchWeekPlan = useCallback(async () => {
    if (!businessId) return;
    setWeekLoading(true);
    try {
      const dates = nextNDays(7);
      const results = await Promise.all(
        dates.map(d => fetch(`/api/delivery/predict?business_id=${businessId}&date=${d}`).then(r => r.json()).catch(() => null))
      );
      setWeekPlan(results.filter(Boolean));
    } finally { setWeekLoading(false); }
  }, [businessId]);

  const fetchAnalytics = useCallback(async () => {
    if (!businessId) return;
    setAnalyticsLoading(true);
    try {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: jobData } = await supabase
        .from("delivery_jobs")
        .select("selected_provider, provider_cost, customer_fee, service_fee, delivery_margin, estimated_delivery_eta_min, status")
        .eq("business_id", businessId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (!jobData || jobData.length === 0) { setAnalytics(null); return; }

      const total    = jobData.length;
      const success  = jobData.filter(j => j.status === "delivered").length;
      const totalMrg = jobData.reduce((s, j) => s + Number(j.delivery_margin ?? 0), 0);
      const avgMrg   = total > 0 ? totalMrg / total : 0;
      const avgEta   = total > 0 ? jobData.reduce((s, j) => s + Number(j.estimated_delivery_eta_min ?? 0), 0) / total : 0;

      const provMap: Record<string, { count:number; totalCost:number; totalEta:number }> = {};
      for (const j of jobData) {
        const p = j.selected_provider as string;
        if (!provMap[p]) provMap[p] = { count:0, totalCost:0, totalEta:0 };
        provMap[p]!.count++;
        provMap[p]!.totalCost += Number(j.provider_cost ?? 0);
        provMap[p]!.totalEta  += Number(j.estimated_delivery_eta_min ?? 0);
      }
      const providerBreakdown = Object.entries(provMap).map(([provider, v]) => ({
        provider,
        count:    v.count,
        avgCost:  v.totalCost / v.count,
        avgEtaMin: v.totalEta / v.count,
        share:    Math.round(v.count / total * 100),
      })).sort((a, b) => b.count - a.count);

      setAnalytics({ total, success, successRate: total > 0 ? Math.round(success/total*100) : 0, totalMargin: totalMrg, avgMargin: avgMrg, avgDeliveryMin: avgEta, providerBreakdown });
    } finally { setAnalyticsLoading(false); }
  }, [businessId]);

  const fetchJobs = useCallback(async () => {
    if (!businessId) return;
    setJobsLoading(true);
    try {
      const { data } = await supabase
        .from("delivery_jobs")
        .select("id, selected_provider, provider_cost, customer_fee, delivery_margin, status, delivery_tier, estimated_delivery_eta_min, created_at, dropoff_address")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);
      setJobs(data ?? []);
    } finally { setJobsLoading(false); }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    fetchWeekPlan();
  }, [businessId, fetchWeekPlan]);

  useEffect(() => {
    if (tab === "analytics") fetchAnalytics();
    if (tab === "jobs")      fetchJobs();
  }, [tab, fetchAnalytics, fetchJobs]);

  const runRouting = async () => {
    if (!businessId) return;
    if (!pickupAddr.trim() || !dropoffAddr.trim()) return show("Enter both pickup and drop-off addresses");
    if (!distanceKm || isNaN(parseFloat(distanceKm))) return show("Enter a valid distance in km");
    setRouting(true);
    setDecision(null);
    try {
      const res = await fetch("/api/delivery/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          orderValue:    parseFloat(orderValue) || 0,
          distanceKm:    parseFloat(distanceKm),
          pickupAddress:  pickupAddr,
          dropoffAddress: dropoffAddr,
          deliveryTier:  tier,
          isPeakHour:    isPeak,
          isHighDemand,
          isBadWeather,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Routing failed");
      setDecision(data.decision);
    } catch (e: any) {
      show(e?.message ?? "Routing failed");
    } finally {
      setRouting(false);
    }
  };

  const feeTotal = decision ? decision.customerFee + decision.serviceFee : null;

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Smart Delivery Routing</h2>
        <p style={{ color:C.st, fontSize:12, marginTop:2 }}>Real-time provider selection · dynamic pricing · margin optimisation</p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {(["route","plan","analytics","jobs"] as const).map(t => (
          <button key={t} className={`bg-btn ${tab===t?"on":""}`} onClick={() => setTab(t)} style={{ textTransform:"capitalize" }}>
            {{ route:"🔀 Route Test", plan:"📅 7-Day Plan", analytics:"📊 Analytics", jobs:"📋 Recent Jobs" }[t]}
          </button>
        ))}
      </div>

      {/* ══ ROUTE TEST ════════════════════════════════════════════════════ */}
      {tab === "route" && (
        <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:16 }}>
          {/* Input panel */}
          <div className="gc" style={{ padding:20 }}>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:14 }}>Route Parameters</div>

            <div style={{ marginBottom:10 }}>
              <label>Pickup Address</label>
              <input value={pickupAddr} onChange={e=>setPickupAddr(e.target.value)} placeholder="123 George St, Sydney NSW 2000" />
            </div>
            <div style={{ marginBottom:10 }}>
              <label>Drop-off Address</label>
              <input value={dropoffAddr} onChange={e=>setDropoffAddr(e.target.value)} placeholder="456 Crown St, Surry Hills NSW 2010" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              <div>
                <label>Distance (km)</label>
                <input type="number" step="0.1" min="0" value={distanceKm} onChange={e=>setDistanceKm(e.target.value)} placeholder="4.2" />
              </div>
              <div>
                <label>Order Value ($)</label>
                <input type="number" step="0.01" min="0" value={orderValue} onChange={e=>setOrderValue(e.target.value)} placeholder="35.90" />
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label>Delivery Tier</label>
              <div style={{ display:"flex", gap:6 }}>
                {(["standard","priority"] as const).map(t => (
                  <button key={t} className={`bg-btn ${tier===t?"on":""}`} onClick={() => setTier(t)} style={{ flex:1, justifyContent:"center", textTransform:"capitalize" }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ marginBottom:6, display:"block" }}>Conditions</label>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  { key:"isPeak",       label:"Peak hour",   state:isPeak,       set:setIsPeak },
                  { key:"isHighDemand", label:"High demand", state:isHighDemand, set:setIsHighDemand },
                  { key:"isBadWeather", label:"Bad weather", state:isBadWeather, set:setIsBadWeather },
                ].map(c => (
                  <label key={c.key} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.cl }}>
                    <input type="checkbox" checked={c.state} onChange={e=>c.set(e.target.checked)} style={{ width:14, height:14, accentColor:C.g }} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <button className="bp" onClick={runRouting} disabled={routing} style={{ width:"100%", justifyContent:"center" }}>
              {routing ? "Fetching quotes…" : "🔀 Get Optimal Route"}
            </button>
            <div style={{ fontSize:11, color:C.st, marginTop:8, textAlign:"center" }}>Queries all providers · logs decision to analytics</div>
          </div>

          {/* Results panel */}
          <div>
            {!decision && !routing && (
              <div className="gc" style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🔀</div>
                <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:16, color:"#fff", marginBottom:6 }}>Enter route details to test the engine</div>
                <p style={{ fontSize:13, color:C.st, maxWidth:340, margin:"0 auto" }}>The engine will query all configured providers simultaneously, apply cost-vs-ETA logic, and return the optimal selection with full quote comparison.</p>
              </div>
            )}
            {routing && (
              <div className="gc" style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:13, color:C.st }}>Querying providers…</div>
              </div>
            )}
            {decision && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {/* Decision banner */}
                <div className="gc" style={{ padding:"16px 20px", borderLeft:`3px solid ${PROVIDER_META[decision.selectedProvider]?.color ?? C.st}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:11, color:C.st, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Selected provider</div>
                      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:22, color:"#fff" }}>
                        {PROVIDER_META[decision.selectedProvider]?.flag} {PROVIDER_META[decision.selectedProvider]?.label ?? decision.selectedProvider}
                      </div>
                      <div style={{ fontSize:12, color:C.st, marginTop:4 }}>{decision.rationale}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <Badge type={decision.selectedProvider === "none" ? "inactive" : tier}>{tier}</Badge>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:14 }}>
                    {[
                      { label:"Provider cost",   value:`$${decision.providerCost.toFixed(2)}`,   color:C.r },
                      { label:"Customer fee",    value:`$${decision.customerFee.toFixed(2)}`,    color:C.cl },
                      { label:"Service fee",     value:`$${decision.serviceFee.toFixed(2)}`,     color:C.cl },
                      { label:"Delivery margin", value:`$${decision.deliveryMargin.toFixed(2)}`, color: decision.deliveryMargin >= 0 ? C.g : C.r },
                    ].map(s => (
                      <div key={s.label} style={{ padding:"10px 12px", borderRadius:8, background:"rgba(255,255,255,.04)" }}>
                        <div style={{ fontSize:10, color:C.st }}>{s.label}</div>
                        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:18, color:s.color, marginTop:2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:12, marginTop:10, fontSize:12, color:C.st }}>
                    <span>🕐 Pickup in {decision.pickupEtaMin} min</span>
                    <span>🏠 Delivery in {decision.deliveryEtaMin} min</span>
                    <span>💰 Customer total: ${feeTotal?.toFixed(2)} (delivery + service fee)</span>
                  </div>
                </div>

                {/* All quotes grid */}
                <div>
                  <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff", marginBottom:10 }}>All Provider Quotes</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
                    {decision.allQuotes.map(q => (
                      <QuoteCard key={q.provider} q={q} selected={q.provider === decision.selectedProvider} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ 7-DAY PLAN ════════════════════════════════════════════════════ */}
      {tab === "plan" && (
        <div>
          <p style={{ fontSize:12, color:C.st, marginBottom:16 }}>Based on last 8 weeks of order history per day-of-week. Provider recommendation uses your configured delivery_settings rates.</p>
          {weekLoading ? (
            <div style={{ fontSize:13, color:C.st }}>Loading…</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
              {weekPlan.map((day, i) => {
                const rec = day.recommendation;
                const col = rec.provider === "none" ? C.st : rec.provider === "uber_direct" ? C.b : rec.provider === "tasker" ? C.g : C.o;
                const isToday = day.date === todayString();
                return (
                  <div key={i} onClick={() => setSelectedDate(day.date)} className="gc" style={{ padding:"12px 10px", textAlign:"center", cursor:"pointer", border:`1px solid ${selectedDate===day.date?col:C.mist}`, background:selectedDate===day.date?`${col}18`:undefined }}>
                    <div style={{ fontSize:11, fontWeight:700, color:isToday?C.g:C.st, marginBottom:4 }}>{isToday?"Today":DAYS[new Date(day.date).getDay()]}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:8 }}>{day.date.slice(5)}</div>
                    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:20, color:C.cl, marginBottom:4 }}>{day.predictedVolume}</div>
                    <div style={{ fontSize:9, color:C.st, marginBottom:6 }}>orders</div>
                    <div style={{ padding:"3px 0", borderRadius:6, background:`${col}22`, color:col, fontSize:9, fontWeight:700 }}>
                      {rec.provider==="none"?"—": rec.provider==="uber_direct"?"Uber": rec.provider==="tasker"?`${rec.taskersNeeded}× Driver`:`${rec.taskersNeeded}T+Uber`}
                    </div>
                    <div style={{ fontSize:10, color:C.st, marginTop:6 }}>${rec.estimatedCost.toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop:20, padding:"12px 16px", borderRadius:10, background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.16)", fontSize:12, color:C.g }}>
            This plan uses the historical volume prediction engine. Once you run live routes through the routing test, the analytics tab will show actual provider performance data.
          </div>
        </div>
      )}

      {/* ══ ANALYTICS ════════════════════════════════════════════════════ */}
      {tab === "analytics" && (
        <div>
          {analyticsLoading && <div style={{ fontSize:13, color:C.st }}>Loading analytics…</div>}
          {!analyticsLoading && !analytics && (
            <div className="gc" style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:16, color:"#fff", marginBottom:6 }}>No routing data yet</div>
              <p style={{ fontSize:13, color:C.st, maxWidth:340, margin:"0 auto" }}>Analytics populate as you use the route test tool or as orders are dispatched via the routing engine. Run your first route to see data here.</p>
            </div>
          )}
          {!analyticsLoading && analytics && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {[
                  { label:"Total Jobs (30d)",  value:analytics.total,                         color:"#fff" },
                  { label:"Total Margin",       value:`$${analytics.totalMargin.toFixed(2)}`,  color:analytics.totalMargin>=0?C.g:C.r },
                  { label:"Avg Margin/Job",     value:`$${analytics.avgMargin.toFixed(2)}`,    color:analytics.avgMargin>=0?C.g:C.r },
                  { label:"Success Rate",        value:`${analytics.successRate}%`,             color:analytics.successRate>=90?C.g:C.am },
                ].map(s => (
                  <div key={s.label} className="gc" style={{ padding:"14px 16px" }}>
                    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:C.st, marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="gc" style={{ padding:"16px 20px" }}>
                <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>Provider Breakdown</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                  {analytics.providerBreakdown.map((p: any) => {
                    const meta = PROVIDER_META[p.provider] ?? PROVIDER_META.none!;
                    return (
                      <div key={p.provider} style={{ padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,.03)", border:`1px solid rgba(255,255,255,.08)` }}>
                        <div style={{ fontSize:18, marginBottom:4 }}>{meta.flag}</div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#fff" }}>{meta.label}</div>
                        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:18, color:meta.color, margin:"4px 0" }}>{p.share}% <span style={{ fontSize:11, color:C.st }}>({p.count} jobs)</span></div>
                        <div style={{ fontSize:11, color:C.st }}>Avg ${p.avgCost.toFixed(2)} · {Math.round(p.avgEtaMin)} min avg ETA</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ RECENT JOBS ════════════════════════════════════════════════════ */}
      {tab === "jobs" && (
        <div className="gc" style={{ overflow:"hidden" }}>
          <table>
            <thead>
              <tr>{["Provider","Address","Tier","Provider Cost","Customer Fee","Margin","ETA","Status","Time"].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {jobs.length===0 ? (
                <tr className="empty-row">
                  <td colSpan={9}>{jobsLoading?"Loading…":"No delivery jobs yet — run a route test or dispatch an order"}</td>
                </tr>
              ) : jobs.map((j, i) => {
                const meta = PROVIDER_META[j.selected_provider] ?? PROVIDER_META.none!;
                const margin = Number(j.delivery_margin ?? 0);
                return (
                  <tr key={i}>
                    <td><span style={{ fontSize:13 }}>{meta.flag}</span> <span style={{ fontSize:12, color:meta.color, fontWeight:600 }}>{meta.label}</span></td>
                    <td style={{ fontSize:11, color:C.st, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.dropoff_address ?? "—"}</td>
                    <td><Badge type={j.delivery_tier}>{j.delivery_tier}</Badge></td>
                    <td style={{ fontSize:13, color:C.r, fontWeight:600 }}>${Number(j.provider_cost??0).toFixed(2)}</td>
                    <td style={{ fontSize:13, color:C.cl, fontWeight:600 }}>${Number(j.customer_fee??0).toFixed(2)}</td>
                    <td style={{ fontSize:13, fontWeight:700, color:margin>=0?C.g:C.r }}>${margin.toFixed(2)}</td>
                    <td style={{ fontSize:12, color:C.st }}>{j.estimated_delivery_eta_min} min</td>
                    <td><Badge type={j.status}>{j.status}</Badge></td>
                    <td style={{ fontSize:11, color:C.st }}>{new Date(j.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
