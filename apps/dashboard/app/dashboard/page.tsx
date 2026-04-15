"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getDashboardStats, getOrders } from "@/lib/queries";
import type { Order } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", am:"#F59E0B", st:"#6B7C93" };
const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

interface Stats {
  todayOrders: number; todayRevenue: number; directPct: number;
  totalCustomers: number; vip: number; atRisk: number; newCust: number;
  analytics12mo: { date: string; total_revenue: number }[];
}

export default function DashboardPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [stats,  setStats]  = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      getDashboardStats(businessId),
      getOrders(businessId),
    ]).then(([s, o]) => {
      setStats(s);
      setOrders(o.slice(0, 5));
      setLoading(false);
    });
  }, [businessId]);

  // Build chart bars from real analytics data
  const chartData = (() => {
    if (!stats?.analytics12mo?.length) return null;
    const maxRev = Math.max(...stats.analytics12mo.map(d => d.total_revenue), 1);
    return stats.analytics12mo.slice(-12).map(d => ({
      label: new Date(d.date).toLocaleString("default", { month: "short" }).charAt(0),
      height: Math.round((d.total_revenue / maxRev) * 72),
    }));
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>
            🏪 {business?.name ?? "Dashboard"}
          </h2>
          <p style={{ color:C.st, fontSize:12, marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
            Dashboard <span className="ld" />
          </p>
        </div>
        <button className="bp" onClick={() => show("Report exported ✓")}>Export</button>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Today's Revenue"  value={stats ? `$${stats.todayRevenue.toLocaleString()}` : "—"} accent icon="💰" />
        <StatCard label="Today's Orders"   value={stats ? String(stats.todayOrders) : "—"} icon="📋" delay={50} />
        <StatCard label="Direct %"         value={stats?.directPct ? `${stats.directPct}%` : "—"} accent={stats ? stats.directPct > 60 : false} icon="📊" delay={100} />
        <StatCard label="AI Credits"       value={String(120)} subtitle="0 calls made" icon="🤖" delay={150} />
        <StatCard label="Total Customers"  value={stats ? String(stats.totalCustomers) : "—"} icon="👥" delay={200} />
      </div>

      {/* Chart + growth */}
      <div style={{ display:"grid", gridTemplateColumns:"5fr 3fr", gap:12, marginBottom:14 }}>
        <div className="gc" style={{ padding:20 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13.5, color:"#fff", marginBottom:14 }}>
            Revenue Trend (12mo)
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:90 }}>
            {chartData ? chartData.map((d, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:"100%", height:d.height, background:`linear-gradient(180deg,${C.g},${C.g}55)`, borderRadius:"3px 3px 0 0" }} />
                <div style={{ fontSize:8, color:C.st, marginTop:3 }}>{d.label}</div>
              </div>
            )) : MONTHS.map((m, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:"100%", height:8, background:"rgba(255,255,255,.06)", borderRadius:"3px 3px 0 0" }} />
                <div style={{ fontSize:8, color:C.st, marginTop:3 }}>{m}</div>
              </div>
            ))}
          </div>
          {!chartData && (
            <p style={{ fontSize:11, color:"rgba(255,255,255,.2)", marginTop:10, textAlign:"center" }}>
              Orders will populate this chart
            </p>
          )}
        </div>

        <div className="gc" style={{ padding:20 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13.5, color:"#fff", marginBottom:14 }}>
            Customer Segments
          </div>
          {stats ? [
            ["VIPs",     stats.vip,     C.am],
            ["At Risk",  stats.atRisk,  C.o],
            ["New",      stats.newCust, C.g],
          ].map(([l, v, c]) => (
            <div key={String(l)} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:5 }}>
                <span style={{ color:C.st }}>{l}</span>
                <span style={{ fontWeight:600, color: c as string }}>{v as number > 0 ? v : "—"}</span>
              </div>
              <div className="pb-track">
                {(v as number) > 0 && stats.totalCustomers > 0 && (
                  <div className="pb-fill" style={{ width:`${Math.min(Math.round((v as number)/stats.totalCustomers*100), 100)}%`, background:`linear-gradient(90deg,${c},${c}66)` }} />
                )}
              </div>
            </div>
          )) : (
            <p style={{ fontSize:12, color:"rgba(255,255,255,.2)", textAlign:"center", padding:"12px 0" }}>
              No customers yet
            </p>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>Recent Orders</span>
          <Link href="/orders" className="bg-btn" style={{ textDecoration:"none" }}>View All →</Link>
        </div>
        <table>
          <thead>
            <tr>{["ID","Customer","Items","Source","Total","Pts Earned"].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6}>{loading ? "Loading…" : "No orders yet — they'll appear here in real time"}</td>
              </tr>
            ) : orders.map((o, i) => (
              <tr key={i}>
                <td style={{ fontFamily:"var(--font-mono)", fontSize:10, color:C.st }}>{o.id.slice(0,8)}…</td>
                <td style={{ fontWeight:600, color:"#fff" }}>{(o as any).customers?.name ?? "—"}</td>
                <td>{Array.isArray(o.items) ? `${(o.items as any[]).length} item(s)` : "—"}</td>
                <td><Badge type={o.source}>{o.source}</Badge></td>
                <td style={{ fontWeight:600, color:"#fff" }}>${o.total}</td>
                <td style={{ color:C.g }}>+{Math.round(o.total * 10)} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
