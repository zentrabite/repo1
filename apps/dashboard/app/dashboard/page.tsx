"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getDashboardStats, getOrders, getRecoveredRevenue, getRepeatRate,
  getRevenueByDay, getRevenueByChannel, getTopCustomer,
  getTopWinbacks, getRecommendations, dismissRecommendation,
} from "@/lib/queries";
import type { Order, AiRecommendation } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", am:"#F59E0B", st:"#6B7C93", r:"#DC3545", b:"#63B3FF" };

interface Stats {
  todayOrders: number; todayRevenue: number; directPct: number;
  totalCustomers: number; vip: number; atRisk: number; newCust: number;
}

// Kanban columns — in order
const KANBAN = [
  { key: "new",               label: "Ordered",        color: C.b  },
  { key: "preparing",         label: "Being made",     color: C.am },
  { key: "ready",             label: "Ready",          color: C.g  },
  { key: "out_for_delivery",  label: "Out for delivery", color: C.o  },
];

export default function DashboardPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recoveredRevenue, setRecoveredRevenue] = useState(0);
  const [repeat, setRepeat] = useState({ repeatRate: 0, totalCustomers: 0, repeatCustomers: 0 });
  const [revByDay, setRevByDay] = useState<{ date: string; revenue: number }[]>([]);
  const [channels, setChannels] = useState<{ channel: string; revenue: number }[]>([]);
  const [topCust, setTopCust] = useState<any | null>(null);
  const [topWinbacks, setTopWinbacks] = useState<any[]>([]);
  const [recs, setRecs] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      getDashboardStats(businessId),
      getOrders(businessId),
      getRecoveredRevenue(businessId, 30),
      getRepeatRate(businessId, 30),
      getRevenueByDay(businessId, 14),
      getRevenueByChannel(businessId, 30),
      getTopCustomer(businessId),
      getTopWinbacks(businessId, 3),
      getRecommendations(businessId, 5),
    ])
      .then(([s, o, rec, rp, rd, ch, tc, tw, rc]) => {
        setStats(s);
        setOrders(o);
        setRecoveredRevenue(rec);
        setRepeat(rp);
        setRevByDay(rd);
        setChannels(ch);
        setTopCust(tc);
        setTopWinbacks(tw);
        setRecs(rc);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [businessId]);

  // 14-day revenue chart
  const chart14 = useMemo(() => {
    if (!revByDay.length) return null;
    const max = Math.max(...revByDay.map(d => d.revenue), 1);
    return revByDay.map(d => ({
      label: new Date(d.date).getDate().toString(),
      height: Math.round((d.revenue / max) * 72) || 2,
      revenue: d.revenue,
    }));
  }, [revByDay]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const col of KANBAN) map.set(col.key, []);
    for (const o of orders) {
      const key = (o.status || "new").toLowerCase();
      if (map.has(key)) map.get(key)!.push(o);
    }
    return map;
  }, [orders]);

  const dismiss = async (id: string) => {
    await dismissRecommendation(id);
    setRecs(prev => prev.filter(r => r.id !== id));
    show("Recommendation dismissed");
  };

  const totalChannelRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const channelColors = [C.g, C.b, C.am, C.o, C.r];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>
            {business?.name ?? "Dashboard"}
          </h2>
          <p style={{ color:C.st, fontSize:12, marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
            Live overview <span className="ld" />
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Link href="/orders" className="bg-btn" style={{ textDecoration:"none" }}>All orders →</Link>
          <button className="bp" onClick={() => show("Report exported ✓")}>Export</button>
        </div>
      </div>

      {/* Row 1 — headline stats */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Today's Revenue"      value={stats ? `$${stats.todayRevenue.toLocaleString()}` : "—"} accent icon="💰" />
        <StatCard label="Today's Orders"       value={stats ? String(stats.todayOrders) : "—"} icon="📋" delay={50} />
        <StatCard label="Recovered (30d)"      value={recoveredRevenue ? `$${Math.round(recoveredRevenue).toLocaleString()}` : "—"} subtitle="Win-back revenue" icon="↩️" delay={100} />
        <StatCard label="Repeat rate (30d)"    value={`${repeat.repeatRate}%`} subtitle={`${repeat.repeatCustomers}/${repeat.totalCustomers} customers`} icon="🔁" delay={150} accent={repeat.repeatRate > 30} />
        <StatCard label="Direct %"             value={stats?.directPct ? `${stats.directPct}%` : "—"} accent={stats ? stats.directPct > 60 : false} icon="📊" delay={200} />
      </div>

      {/* Row 2 — Live kanban */}
      <div className="gc" style={{ padding:18, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>
            Live orders <span className="ld" style={{ marginLeft:6 }} />
          </span>
          <Link href="/orders" className="bg-btn" style={{ textDecoration:"none" }}>Open board →</Link>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${KANBAN.length}, 1fr)`, gap:10 }}>
          {KANBAN.map(col => {
            const cards = ordersByStatus.get(col.key) ?? [];
            return (
              <div key={col.key} style={{ background:"rgba(255,255,255,.02)", borderRadius:8, padding:10, minHeight:140 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:col.color, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{col.label}</span>
                  <span style={{ fontSize:11, color:C.st }}>{cards.length}</span>
                </div>
                {cards.length === 0 ? (
                  <p style={{ fontSize:10, color:"rgba(255,255,255,.22)", margin:"16px 0 0" }}>—</p>
                ) : cards.slice(0, 4).map(o => (
                  <div key={o.id} style={{ background:"rgba(255,255,255,.03)", borderRadius:6, padding:"8px 10px", marginBottom:6 }}>
                    <div style={{ fontSize:11, color:"#fff", fontWeight:600 }}>
                      {(o as any).customers?.name ?? `#${o.id.slice(0,6)}`}
                    </div>
                    <div style={{ fontSize:10, color:C.st, display:"flex", justifyContent:"space-between", marginTop:2 }}>
                      <span>${o.total}</span>
                      <span>{new Date(o.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3 — 14d revenue + revenue by channel */}
      <div style={{ display:"grid", gridTemplateColumns:"5fr 3fr", gap:12, marginBottom:14 }}>
        <div className="gc" style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
            <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13.5, color:"#fff" }}>Revenue — last 14 days</span>
            <span style={{ fontSize:11, color:C.st }}>
              {revByDay.length > 0 ? `$${revByDay.reduce((s,d) => s+d.revenue, 0).toLocaleString()} total` : ""}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:90 }}>
            {chart14 ? chart14.map((d, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }} title={`$${d.revenue.toFixed(0)}`}>
                <div style={{ width:"100%", height:d.height, background:`linear-gradient(180deg,${C.g},${C.g}55)`, borderRadius:"3px 3px 0 0" }} />
                <div style={{ fontSize:8, color:C.st, marginTop:3 }}>{d.label}</div>
              </div>
            )) : <p style={{ color:"rgba(255,255,255,.2)", fontSize:11, margin:"auto" }}>Orders will populate this chart</p>}
          </div>
        </div>

        <div className="gc" style={{ padding:20 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13.5, color:"#fff", marginBottom:14 }}>
            Revenue by channel (30d)
          </div>
          {channels.length === 0 ? (
            <p style={{ fontSize:12, color:"rgba(255,255,255,.2)", textAlign:"center", padding:"12px 0" }}>No orders yet</p>
          ) : channels.map((ch, i) => {
            const pct = totalChannelRevenue === 0 ? 0 : Math.round((ch.revenue / totalChannelRevenue) * 100);
            return (
              <div key={ch.channel} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                  <span style={{ color:C.st, textTransform:"capitalize" }}>{ch.channel.replace("_"," ")}</span>
                  <span style={{ color:"#fff", fontWeight:600 }}>${ch.revenue.toLocaleString()}<span style={{ color:C.st, marginLeft:6 }}>{pct}%</span></span>
                </div>
                <div className="pb-track">
                  <div className="pb-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${channelColors[i % channelColors.length]},${channelColors[i % channelColors.length]}66)` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4 — top customer + top 3 winbacks + segments */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
        <div className="gc" style={{ padding:18 }}>
          <div style={{ fontSize:11, color:C.st, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Top customer</div>
          {topCust ? (
            <>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:16, color:"#fff", marginBottom:4 }}>{topCust.name}</div>
              <div style={{ fontSize:11, color:C.st, marginBottom:10 }}>{topCust.phone ?? "—"}</div>
              <div style={{ display:"flex", gap:14 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:C.g }}>${Number(topCust.total_spent).toLocaleString()}</div>
                  <div style={{ fontSize:10, color:C.st }}>Spent</div>
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>{topCust.total_orders}</div>
                  <div style={{ fontSize:10, color:C.st }}>Orders</div>
                </div>
              </div>
            </>
          ) : <p style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No customer data yet</p>}
        </div>

        <div className="gc" style={{ padding:18 }}>
          <div style={{ fontSize:11, color:C.st, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Top win-back campaigns</div>
          {topWinbacks.length === 0 ? (
            <p style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No win-back rules configured</p>
          ) : topWinbacks.map((w, i) => (
            <div key={w.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < topWinbacks.length-1 ? "1px solid rgba(255,255,255,.05)" : undefined }}>
              <div>
                <div style={{ fontSize:13, color:"#fff", fontWeight:600 }}>{w.name}</div>
                <div style={{ fontSize:10, color:C.st }}>{w.redemptions} redemptions</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.g }}>${Math.round(Number(w.revenue)).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="gc" style={{ padding:18 }}>
          <div style={{ fontSize:11, color:C.st, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Customer segments</div>
          {stats && stats.totalCustomers > 0 ? [
            ["VIPs",    stats.vip,    C.am],
            ["At Risk", stats.atRisk, C.o],
            ["New",     stats.newCust, C.g],
          ].map(([l, v, c]) => (
            <div key={String(l)} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <span style={{ color:C.st }}>{l}</span>
                <span style={{ color:c as string, fontWeight:600 }}>{v as number}</span>
              </div>
              <div className="pb-track">
                <div className="pb-fill" style={{ width:`${Math.min(Math.round((v as number)/stats.totalCustomers*100), 100)}%`, background:`linear-gradient(90deg,${c},${c}66)` }} />
              </div>
            </div>
          )) : (
            <p style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No customer data yet</p>
          )}
        </div>
      </div>

      {/* Row 5 — AI copilot */}
      <div className="gc" style={{ padding:20, marginBottom:14, background:"linear-gradient(135deg,rgba(0,182,122,.04),rgba(99,179,255,.02))" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:"#fff" }}>🤖 AI copilot</div>
            <div style={{ fontSize:11, color:C.st }}>{recs.length === 0 ? "All clear — nothing needs your attention." : `${recs.length} recommendation${recs.length === 1 ? "" : "s"}`}</div>
          </div>
          <Link href="/automations" className="bg-btn" style={{ textDecoration:"none" }}>Rules →</Link>
        </div>
        {recs.length === 0 ? (
          <p style={{ fontSize:12, color:"rgba(255,255,255,.25)", margin:0 }}>
            The copilot will surface restock prompts, retention risks and staffing tips here as it learns your business.
          </p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recs.map(r => (
              <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, padding:"10px 12px", background:"rgba(255,255,255,.02)", borderRadius:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
                    <Badge type={r.priority === "urgent" ? "Direct" : r.priority === "high" ? "New" : "Loyal"}>{r.priority}</Badge>
                    <span style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{r.title}</span>
                  </div>
                  <p style={{ fontSize:11, color:C.st, lineHeight:1.5, margin:0 }}>{r.body}</p>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {r.action_url && (
                    <Link href={r.action_url} className="bg-btn" style={{ textDecoration:"none" }}>{r.action_label ?? "Review"}</Link>
                  )}
                  <button className="bg-btn" onClick={() => dismiss(r.id)}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>Recent orders</span>
          <Link href="/orders" className="bg-btn" style={{ textDecoration:"none" }}>View all →</Link>
        </div>
        <table>
          <thead>
            <tr>{["ID","Customer","Items","Source","Total","Status"].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6}>{loading ? "Loading…" : "No orders yet — they'll appear here in real time"}</td>
              </tr>
            ) : orders.slice(0, 6).map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily:"var(--font-mono)", fontSize:10, color:C.st }}>{o.id.slice(0,8)}…</td>
                <td style={{ fontWeight:600, color:"#fff" }}>{(o as any).customers?.name ?? "—"}</td>
                <td>{Array.isArray(o.items) ? `${(o.items as any[]).length} item(s)` : "—"}</td>
                <td><Badge type={o.source}>{o.source}</Badge></td>
                <td style={{ fontWeight:600, color:"#fff" }}>${o.total}</td>
                <td><Badge type={o.status}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
