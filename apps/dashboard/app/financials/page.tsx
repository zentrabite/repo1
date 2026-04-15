"use client";
import { useState } from "react";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { BIZ } from "@/lib/data";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", vi:"#A855F7", st:"#6B7C93" };

const INVOICES = [
  { id:"INV-001", desc:"Mar Revenue", amount:"—" },
  { id:"INV-002", desc:"Feb Revenue", amount:"—" },
  { id:"INV-003", desc:"Jan Revenue", amount:"—" },
];
const QUARTERS = [
  { q:"Q1 2026", amount:"—" },
  { q:"Q4 2025", amount:"—" },
  { q:"Q3 2025", amount:"—" },
];

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
  const [xero, setXero] = useState(true);

  const totalRev  = BIZ.revenue;
  const totalFees = BIZ.uberFees + BIZ.menulogFees;
  const margin    = totalRev - totalFees;
  const aiSpend   = (BIZ.aiUsed * BIZ.aiCost).toFixed(2);
  const roi       = BIZ.aiUsed > 0 ? Math.round(BIZ.winbackRev / (BIZ.aiUsed * BIZ.aiCost)) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Financials</h2>
        <p style={{ color:C.st, fontSize:12, marginTop:2 }}>Revenue, margins & ROI · Subscription: $500/mo</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <StatCard label="Revenue"           value={totalRev  > 0 ? `$${totalRev.toLocaleString()}`  : "—"} accent icon="💰" />
        <StatCard label="Platform Fees"     value={totalFees > 0 ? `$${totalFees.toLocaleString()}` : "—"} icon="🔴" delay={50} />
        <StatCard label="Retained Margin"   value={margin    > 0 ? `$${margin.toLocaleString()}`   : "—"} accent icon="🛡️" delay={100} />
        <StatCard label="Subscription"      value="$500/mo" icon="📋" delay={150} />
      </div>

      {/* Revenue breakdown + margin */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {/* Revenue by source */}
        <div className="gc" style={{ padding:22 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:18 }}>
            Revenue by Source
          </div>
          <SourceRow label="Uber Eats" rev={BIZ.uberRev}    fee={BIZ.uberFees}    color={C.o}  total={totalRev} />
          <SourceRow label="Menulog"   rev={BIZ.menulogRev}  fee={BIZ.menulogFees} color={C.vi} total={totalRev} />
          <SourceRow label="Direct"    rev={BIZ.directRev}   fee={0}               color={C.g}  total={totalRev} />

          {BIZ.winbackRev > 0 && (
            <div style={{ marginTop:4, padding:"10px 14px", background:"rgba(0,182,122,.06)", borderRadius:10, border:"1px solid rgba(0,182,122,.15)" }}>
              <div style={{ fontSize:13, color:C.g, fontWeight:600 }}>Win-back revenue: ${BIZ.winbackRev.toLocaleString()}</div>
              <div style={{ fontSize:11, color:C.st, marginTop:2 }}>Recovered via automated SMS + AI calls</div>
            </div>
          )}

          {totalRev === 0 && (
            <div style={{ textAlign:"center", padding:"16px 0", color:"rgba(255,255,255,.2)", fontSize:13 }}>
              Connect Supabase to see revenue breakdown
            </div>
          )}
        </div>

        {/* Margin comparison + AI ROI */}
        <div className="gc" style={{ padding:22 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:14 }}>
            Margin Comparison
          </div>

          {BIZ.directPct > 0 ? (
            <>
              <div style={{ display:"flex", borderRadius:10, overflow:"hidden", marginBottom:8, height:36 }}>
                <div style={{ flex:BIZ.directPct, background:`linear-gradient(90deg,${C.g},${C.g}bb)`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>
                  {BIZ.directPct}%
                </div>
                {BIZ.directPct < 100 && (
                  <div style={{ flex:100-BIZ.directPct, background:`linear-gradient(90deg,${C.o}99,${C.vi})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>
                    {100-BIZ.directPct}%
                  </div>
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.st, marginBottom:20 }}>
                <span>🟢 Direct (full margin)</span>
                <span>🟠 Uber / 🟣 Menulog (−30%)</span>
              </div>
            </>
          ) : (
            <div style={{ height:36, borderRadius:10, background:"rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.2)" }}>No data yet</span>
            </div>
          )}

          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>AI ROI</div>
          {[
            ["AI spend",          aiSpend !== "0.00" ? `$${aiSpend}` : "—"],
            ["Revenue recovered", BIZ.winbackRev > 0 ? `$${BIZ.winbackRev.toLocaleString()}` : "—"],
            ["ROI",               roi > 0 ? `${roi}x return` : "—"],
          ].map(([l, v], i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:i<2?"1px solid rgba(255,255,255,.05)":"", fontSize:13 }}>
              <span style={{ color:C.st }}>{l}</span>
              <span style={{ fontWeight:600, color:C.g }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Xero integration */}
      <div className="gc" style={{ padding:22, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: xero ? 18 : 0 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:22 }}>📗</span>
            <div>
              <div style={{ fontWeight:600, color:"#fff", fontSize:14 }}>Xero Accounting — {xero ? "Synced" : "Disconnected"}</div>
              <div style={{ fontSize:11, color:C.st, marginTop:2 }}>Revenue reports auto-exported</div>
            </div>
          </div>
          {/* Toggle */}
          <div onClick={() => { setXero(!xero); show(xero ? "Xero disconnected" : "Xero connected ✓"); }}
            style={{ width:44, height:24, borderRadius:12, background:xero?"rgba(0,182,122,.3)":"rgba(255,255,255,.08)", cursor:"pointer", position:"relative", border:`1px solid ${xero?"rgba(0,182,122,.4)":"rgba(255,255,255,.1)"}`, flexShrink:0, transition:"all .2s" }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:xero?C.g:"#6B7C93", position:"absolute", top:2.5, left:xero?22:2.5, transition:"all .2s", boxShadow:"0 1px 4px rgba(0,0,0,.3)" }} />
          </div>
        </div>

        {xero && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:C.st, fontFamily:"var(--font-outfit)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Synced Invoices</div>
              {INVOICES.map((inv, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<2?"1px solid rgba(255,255,255,.05)":"", fontSize:13 }}>
                  <span style={{ color:"#fff" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:C.st }}>{inv.id} </span>
                    {inv.desc}
                  </span>
                  <span style={{ fontWeight:600, color:C.g }}>{inv.amount}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:C.st, fontFamily:"var(--font-outfit)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Quarterly Reports</div>
              {QUARTERS.map((q, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<2?"1px solid rgba(255,255,255,.05)":"", fontSize:13 }}>
                  <span style={{ color:"#fff" }}>{q.q}</span>
                  <span style={{ fontWeight:600, color:C.g }}>{q.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <button className="bg-btn" style={{ width:"100%", padding:"13px", fontSize:13, justifyContent:"center" }} onClick={() => show("Exported to CSV ✓")}>
        📊 Export Full Financial Report
      </button>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
