"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getAnalytics } from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", vi:"#A855F7", st:"#6B7C93" };

function SourceRow({ label, rev, fee, color, total }: { label:string; rev:number; fee:number; color:string; total:number }) {
  const pct = total > 0 ? Math.round(rev / total * 100) : 0;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
        <span style={{ fontWeight:600, fontSize:14, color:"#fff" }}>{label}</span>
        <span style={{ fontWeight:700, fontSize:16, color }}>{rev > 0 ? `$${rev.toLocaleString()}` : "—"}</span>
      </div>
      <div className="pb-track" style={{ marginBottom: fee > 0 ? 6 : 0 }}>
        {pct > 0 && <div className="pb-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}88)` }} />}
      </div>
      {fee > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(255,71,87,.08)", border:"1px solid rgba(255,71,87,.15)", borderRadius:7 }}>
          <span style={{ fontSize:12, color:C.r, fontWeight:600 }}>Fees: −${fee.toLocaleString()}</span>
          <span style={{ fontSize:11, color:"rgba(255,71,87,.6)" }}>(30% platform cut)</span>
        </div>
      )}
    </div>
  );
}

export default function FinancialsPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    getAnalytics(businessId, 90)
      .then(data => { setAnalytics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [businessId]);

  // Subscription fee — read from business settings, fall back sensibly.
  const subscriptionFee = (() => {
    const s = (business?.settings ?? {}) as Record<string, any>;
    if (typeof s.subscription_fee === "number" && s.subscription_fee > 0) return s.subscription_fee;
    return null;
  })();

  const exportCsv = () => {
    if (analytics.length === 0) { show("No data to export"); return; }
    const headers = ["date","total_orders","total_revenue","direct_orders","agg_orders","new_customers","sms_sent","sms_converted"];
    const rows = analytics.map(a => headers.map(h => a[h] ?? 0).join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financials-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("CSV downloaded ✓");
  };

  // Aggregate from analytics_daily
  const totalRev    = analytics.reduce((s, d) => s + Number(d.total_revenue ?? 0), 0);
  const directRev   = analytics.reduce((s, d) => s + Number(d.total_revenue ?? 0) * (d.total_orders > 0 ? d.direct_orders / d.total_orders : 0), 0);
  const aggRev      = totalRev - directRev;
  const aggFees     = Math.round(aggRev * 0.30); // 30% aggregator cut
  const margin      = totalRev - aggFees;
  const directPct   = totalRev > 0 ? Math.round(directRev / totalRev * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Financials</h2>
        <p style={{ color:C.st, fontSize:12, marginTop:2 }}>Revenue, margins & ROI · Last 90 days</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <StatCard label="Revenue (90d)"     value={totalRev > 0 ? `$${totalRev.toLocaleString()}` : "—"} accent icon="💰" />
        <StatCard label="Aggregator Fees"   value={aggFees  > 0 ? `$${aggFees.toLocaleString()}`  : "—"} icon="🔴" delay={50} />
        <StatCard label="Retained Margin"   value={margin   > 0 ? `$${margin.toLocaleString()}`   : "—"} accent icon="🛡️" delay={100} />
        <StatCard label="Subscription"      value={subscriptionFee ? `$${subscriptionFee}/mo` : "—"} subtitle={subscriptionFee ? undefined : "Set in billing"} icon="📋" delay={150} />
      </div>

      {/* Revenue breakdown + margin */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {/* Revenue by source */}
        <div className="gc" style={{ padding:22 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:18 }}>
            Revenue by Source (estimated)
          </div>
          <SourceRow label="Direct Orders" rev={Math.round(directRev)} fee={0}       color={C.g} total={totalRev} />
          <SourceRow label="Aggregators"   rev={Math.round(aggRev)}    fee={aggFees} color={C.o} total={totalRev} />

          {totalRev === 0 && (
            <div style={{ textAlign:"center", padding:"16px 0", color:"rgba(255,255,255,.2)", fontSize:13 }}>
              {loading ? "Loading…" : "No revenue data yet — orders will populate this"}
            </div>
          )}
        </div>

        {/* Margin comparison */}
        <div className="gc" style={{ padding:22 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:14 }}>
            Direct vs Aggregator Split
          </div>

          {directPct > 0 ? (
            <>
              <div style={{ display:"flex", borderRadius:10, overflow:"hidden", marginBottom:8, height:36 }}>
                <div style={{ flex:directPct, background:`linear-gradient(90deg,${C.g},${C.g}bb)`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>
                  {directPct}%
                </div>
                {directPct < 100 && (
                  <div style={{ flex:100-directPct, background:`linear-gradient(90deg,${C.o}99,${C.vi})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>
                    {100-directPct}%
                  </div>
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.st, marginBottom:20 }}>
                <span>🟢 Direct (full margin)</span>
                <span>🟠 Aggregators (−30%)</span>
              </div>
            </>
          ) : (
            <div style={{ height:36, borderRadius:10, background:"rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No data yet</span>
            </div>
          )}

          <div style={{ padding:"14px", background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.15)", borderRadius:10 }}>
            <div style={{ fontSize:13, color:C.g, fontWeight:600, marginBottom:4 }}>
              💡 Save ${aggFees > 0 ? aggFees.toLocaleString() : "—"} in fees
            </div>
            <div style={{ fontSize:11, color:C.st }}>
              Moving aggregator orders to direct saves you ~30% in platform fees
            </div>
          </div>
        </div>
      </div>

      {/* Xero — coming soon */}
      <div className="gc" style={{ padding:22, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:22 }}>📗</span>
            <div>
              <div style={{ fontWeight:600, color:"#fff", fontSize:14 }}>Xero Accounting</div>
              <div style={{ fontSize:11, color:C.st, marginTop:2 }}>Auto-export revenue reports to Xero — coming soon</div>
            </div>
          </div>
          <span style={{ padding:"4px 12px", borderRadius:999, background:"rgba(107,124,147,.14)", color:C.st, fontSize:11, fontWeight:600, fontFamily:"var(--font-outfit)", border:"1px solid rgba(107,124,147,.2)" }}>
            Coming Soon
          </span>
        </div>
      </div>

      {/* Export */}
      <button className="bg-btn" style={{ width:"100%", padding:"13px", fontSize:13, justifyContent:"center" }} onClick={exportCsv}>
        📊 Export Full Financial Report (CSV)
      </button>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
