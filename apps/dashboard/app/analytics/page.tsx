"use client";

import { useEffect, useState, useMemo } from "react";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getTopMenuItems, getRevenueByChannel, getRevenueByDay,
  getRepeatRate, getSmsStats, getAnalytics,
} from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", am:"#F59E0B", be:"#63B3FF", st:"#6B7C93", r:"#DC3545" };

const RANGES = [7, 30, 90] as const;

export default function AnalyticsPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  const [topItems, setTopItems] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [channels, setChannels] = useState<{ channel: string; revenue: number }[]>([]);
  const [byDay, setByDay]       = useState<{ date: string; revenue: number }[]>([]);
  const [repeat, setRepeat]     = useState({ repeatRate: 0, totalCustomers: 0, repeatCustomers: 0 });
  const [sms, setSms]           = useState({ sent: 0, converted: 0 });
  const [analytics, setAnalytics] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      getTopMenuItems(businessId, days),
      getRevenueByChannel(businessId, days),
      getRevenueByDay(businessId, days),
      getRepeatRate(businessId, days),
      getSmsStats(businessId),
      getAnalytics(businessId, days),
    ])
      .then(([ti, ch, bd, rp, s, an]) => {
        setTopItems(ti); setChannels(ch); setByDay(bd);
        setRepeat(rp); setSms(s); setAnalytics(an);
        setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, [businessId, days]);

  const totalRevenue = byDay.reduce((s, d) => s + d.revenue, 0);
  const totalOrders  = analytics.reduce((s, a) => s + (a.total_orders ?? 0), 0);
  const aov = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
  const smsConversion = sms.sent === 0 ? 0 : Math.round((sms.converted / sms.sent) * 100);

  const trend = useMemo(() => {
    if (!byDay.length) return null;
    const max = Math.max(...byDay.map(d => d.revenue), 1);
    return byDay.map(d => ({
      label: new Date(d.date).getDate().toString(),
      height: Math.round((d.revenue / max) * 80) || 2,
    }));
  }, [byDay]);

  const totalChannel = channels.reduce((s, c) => s + c.revenue, 0);
  const channelColors = [C.g, C.be, C.am, C.o, C.r];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Analytics</h2>
          <p style={{ color:C.st, fontSize:12 }}>Performance of menu, channels, customers and campaigns.</p>
        </div>
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,.03)", borderRadius:6, padding:3 }}>
          {RANGES.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={days === d ? "bp" : "bg-btn"}
              style={{ padding:"4px 12px", fontSize:11 }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Revenue"            value={`$${Math.round(totalRevenue).toLocaleString()}`} accent icon="💰" />
        <StatCard label="Orders"             value={String(totalOrders)} icon="📦" delay={50} />
        <StatCard label="Avg. order value"   value={`$${aov.toFixed(2)}`} icon="🧮" delay={100} />
        <StatCard label="Repeat rate"        value={`${repeat.repeatRate}%`} icon="🔁" delay={150} accent={repeat.repeatRate > 30} />
        <StatCard label="SMS conversion"     value={`${smsConversion}%`} subtitle={`${sms.converted}/${sms.sent}`} icon="💬" delay={200} />
      </div>

      {/* Trend */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>Revenue trend — last {days} days</div>
        {trend ? (
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:100 }}>
            {trend.map((d, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:"100%", height:d.height, background:`linear-gradient(180deg,${C.g},${C.g}55)`, borderRadius:"3px 3px 0 0" }} />
                {i % Math.max(1, Math.floor(trend.length / 14)) === 0 && (
                  <div style={{ fontSize:8, color:C.st, marginTop:3 }}>{d.label}</div>
                )}
              </div>
            ))}
          </div>
        ) : <p style={{ color:"rgba(255,255,255,.2)", fontSize:12 }}>{loading ? "Loading…" : "No data yet"}</p>}
      </div>

      {/* Top items + channels */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:12, marginBottom:14 }}>
        <div className="gc" style={{ overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>Top menu items — last {days}d</span>
          </div>
          <table>
            <thead>
              <tr><th>Item</th><th style={{ textAlign:"right" }}>Qty sold</th><th style={{ textAlign:"right" }}>Revenue</th></tr>
            </thead>
            <tbody>
              {topItems.length === 0 ? (
                <tr className="empty-row"><td colSpan={3}>{loading ? "Loading…" : "No sales in this period"}</td></tr>
              ) : topItems.slice(0, 10).map(it => (
                <tr key={it.name}>
                  <td style={{ fontWeight:600, color:"#fff" }}>{it.name}</td>
                  <td style={{ textAlign:"right", color:C.st }}>{it.qty}</td>
                  <td style={{ textAlign:"right", fontWeight:600, color:C.g }}>${Math.round(it.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gc" style={{ padding:18 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>Channel performance</div>
          {channels.length === 0 ? (
            <p style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No orders yet</p>
          ) : channels.map((ch, i) => {
            const pct = totalChannel === 0 ? 0 : Math.round((ch.revenue / totalChannel) * 100);
            return (
              <div key={ch.channel} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                  <span style={{ color:C.st, textTransform:"capitalize" }}>{ch.channel.replace("_"," ")}</span>
                  <span style={{ color:"#fff", fontWeight:600 }}>${ch.revenue.toLocaleString()} <span style={{ color:C.st, marginLeft:4 }}>{pct}%</span></span>
                </div>
                <div className="pb-track">
                  <div className="pb-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${channelColors[i % channelColors.length]},${channelColors[i % channelColors.length]}66)` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer retention block */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>Customer retention</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:"#fff" }}>{repeat.totalCustomers}</div>
            <div style={{ fontSize:11, color:C.st }}>Customers who ordered in the window</div>
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:C.g }}>{repeat.repeatCustomers}</div>
            <div style={{ fontSize:11, color:C.st }}>Customers with more than 1 order</div>
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:C.am }}>{repeat.repeatRate}%</div>
            <div style={{ fontSize:11, color:C.st }}>Repeat rate</div>
          </div>
        </div>
      </div>

      <p style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"center" }}>
        Margin analytics (cost of goods × quantity) requires ingredient recipes — <a href="/stock" style={{ color:C.g }}>add recipes on the stock page</a> to unlock them.
      </p>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
