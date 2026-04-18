"use client";
import { useState } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { REWARDS_TABLE } from "@/lib/data";

const C = { g:"#00B67A", am:"#F59E0B", st:"#6B7C93" };

const goldCount   = REWARDS_TABLE.filter(c => c.tier==="Gold").length;
const silverCount = REWARDS_TABLE.filter(c => c.tier==="Silver").length;
const bronzeCount = REWARDS_TABLE.filter(c => c.tier==="Bronze").length;
const totalPts    = REWARDS_TABLE.reduce((a,c) => a+c.pts, 0);

function Av({ n }: { n:string }) {
  return (
    <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1C2D48,#0F1F2D)", border:"1px solid rgba(255,255,255,.08)", color:"#8B9DB5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, fontFamily:"var(--font-outfit)", flexShrink:0 }}>
      {n.split(" ").map(x=>x[0]).join("")}
    </div>
  );
}

export default function RewardsPage() {
  const { toast, show } = useToast();
  const [payPts, setPayPts] = useState(false);

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:19, color:"#fff" }}>Client Rewards</h2>
        <p style={{ color:C.st, fontSize:11 }}>Track which customers have points, their tiers, and redemption history</p>
      </div>

      {/* Tier stat cards */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <StatCard label="Gold Members"    value={String(goldCount)}   accent icon="🥇" />
        <StatCard label="Silver Members"  value={String(silverCount)} icon="🥈" delay={50} />
        <StatCard label="Bronze Members"  value={String(bronzeCount)} icon="🥉" delay={100} />
        <StatCard label="Total Points Held" value={totalPts.toLocaleString()} accent icon="⭐" delay={150} />
      </div>

      {/* Tier cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
        {[
          { icon:"🥉", label:"Bronze", count:bronzeCount, range:"0–299 pts",   perk:"5% off orders",           bg:"rgba(205,127,50,.06)",  bd:"rgba(205,127,50,.15)", c:"#CD7F32" },
          { icon:"🥈", label:"Silver", count:silverCount, range:"300–999 pts", perk:"10% off + free delivery", bg:"rgba(192,192,192,.06)", bd:"rgba(192,192,192,.15)",c:"#C0C0C0" },
          { icon:"🥇", label:"Gold",   count:goldCount,   range:"1,000+ pts",  perk:"15% off + priority",      bg:"rgba(245,158,11,.06)",  bd:"rgba(245,158,11,.15)", c:C.am },
        ].map((t, i) => (
          <div key={i} className="gc" style={{ padding:14, background:t.bg, borderColor:t.bd }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ fontSize:20, fontWeight:700, fontFamily:"var(--font-outfit)", color:t.c }}>{t.count}</span>
            </div>
            <h3 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:15, color:t.c }}>{t.label}</h3>
            <div style={{ fontSize:10, color:C.st }}>{t.range} — {t.perk}</div>
          </div>
        ))}
      </div>

      {/* Points table */}
      <div className="gc" style={{ padding:0, overflow:"hidden", marginBottom:12 }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff" }}>Client Points & Tiers</span>
          <button className="bp" style={{ fontSize:10, padding:"5px 12px" }} onClick={() => show("Points exported ✓")}>Export</button>
        </div>
        <table>
          <thead>
            <tr>{["","Client","Points","Cash Value","Tier","Last Redemption","Status"].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {REWARDS_TABLE.map((c, i) => (
              <tr key={i}>
                <td><Av n={c.name} /></td>
                <td><div style={{ fontWeight:600, color:"#fff", fontSize:11.5 }}>{c.name}</div><div style={{ fontSize:9, color:C.st }}>{c.email}</div></td>
                <td style={{ fontWeight:700, color:C.am, fontSize:12 }}>{c.pts}</td>
                <td style={{ color:C.g, fontWeight:600, fontSize:11 }}>${(c.pts/100).toFixed(2)}</td>
                <td><Badge type={c.tier}>{c.tier}</Badge></td>
                <td style={{ fontSize:10.5, color:C.st }}>{c.last}</td>
                <td><Badge type="active">Active</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Earn rules + pay with points */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div className="gc" style={{ padding:16 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:8 }}>Earn Rules</div>
          {[["Per $1 spent","10 pts"],["Referral bonus","500 pts"],["Birthday","200 pts"],["Direct order","x1.2 multiplier"],["5-order streak","100 bonus"]].map(([l,v], i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<4?"1px solid rgba(255,255,255,.04)":"", fontSize:11.5 }}>
              <span style={{ color:C.st }}>{l}</span>
              <span style={{ fontWeight:600, color:C.g }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="gc" style={{ padding:16 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:8 }}>💳 Pay With Points — Checkout Preview</div>
          <div style={{ background:"rgba(0,182,122,.04)", border:"1px solid rgba(0,182,122,.08)", borderRadius:10, padding:12 }}>
            <div style={{ fontSize:10, color:C.g, fontWeight:600, marginBottom:4 }}>EXAMPLE · Silver Tier Customer</div>
            {[["Order total","$44.90"],["Points balance","405 pts ($4.05)"]].map(([l,v],i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, marginBottom:3 }}>
                <span style={{ color:C.st }}>{l}</span><span style={{ color:"#fff", fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
              <div onClick={() => setPayPts(!payPts)} style={{ width:36, height:20, borderRadius:10, background:payPts?"rgba(0,182,122,.25)":"rgba(255,255,255,.08)", cursor:"pointer", position:"relative", border:`1px solid ${payPts?"rgba(0,182,122,.3)":"rgba(255,255,255,.06)"}` }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:payPts?C.g:"#6B7C93", position:"absolute", top:2.5, left:payPts?19:2, transition:"all .2s" }} />
              </div>
              <span style={{ fontSize:11.5, color:payPts?C.g:C.st }}>Apply points</span>
            </div>
            {payPts && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", color:C.g, fontSize:11.5 }}><span>Points applied</span><span>-$4.05 (405 pts)</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, color:"#fff", fontSize:14, marginTop:4 }}><span>Customer pays</span><span>$40.85</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
