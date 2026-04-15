"use client";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { BIZ, AI_LOG } from "@/lib/data";

const C = { g:"#00B67A", o:"#FF6B35", st:"#6B7C93" };
const creditsLeft = BIZ.aiCredits - BIZ.aiUsed;
const spend = (BIZ.aiUsed * BIZ.aiCost).toFixed(2);

const METRICS = [
  ["Connect",      "67.5%", 67.5],
  ["Booking",      "37%",   37  ],
  ["Satisfaction", "4.6/5", 92  ],
];

export default function AICallsPage() {
  const { toast, show } = useToast();

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:19, color:"#fff" }}>AI Call System</h2>
        <p style={{ color:C.st, fontSize:11 }}>Credit-based · $0.45/call</p>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <StatCard label="Credits Left" value={String(creditsLeft)} subtitle={`of ${BIZ.aiCredits}`} accent icon="🪙" />
        <StatCard label="Calls Made"   value={String(BIZ.aiUsed)} icon="📞" delay={50} />
        <StatCard label="Cost/Call"    value="$0.45" icon="💲" delay={100} />
        <StatCard label="Spend"        value={`$${spend}`} icon="💰" delay={150} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {/* Sarah agent card */}
        <div className="gc" style={{ padding:16 }}>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,rgba(0,182,122,.15),rgba(0,182,122,.04))", border:"1px solid rgba(0,182,122,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🤖</div>
            <div>
              <div style={{ fontWeight:600, color:"#fff", fontSize:13 }}>Sarah — AI Voice</div>
              <div style={{ fontSize:10, color:C.st }}>Australian · &lt;800ms · Natural</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
            <button className="bp" style={{ flex:1, justifyContent:"center", fontSize:11 }} onClick={() => show("Call started ✓")}>📞 Call</button>
            <button className="bg-btn" style={{ flex:1, justifyContent:"center" }} onClick={() => show("Auto follow-up on ✓")}>⚡ Auto</button>
            <button className="bg-btn" style={{ flex:1, justifyContent:"center" }} onClick={() => show("Reactivation queued ✓")}>🔄 Reactivate</button>
          </div>
          {METRICS.map(([l, v, p]) => (
            <div key={String(l)} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                <span style={{ color:C.st }}>{l}</span>
                <span style={{ fontWeight:600, color:C.g }}>{v}</span>
              </div>
              <div style={{ width:"100%", height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
                {(p as number) > 0 && <div style={{ width:`${p}%`, height:"100%", background:`linear-gradient(90deg,${C.g},${C.g}88)` }} />}
              </div>
            </div>
          ))}
        </div>

        {/* Transcript */}
        <div className="gc" style={{ padding:16 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10 }}>
            📝 Sample AI Transcript
          </div>
          <div style={{ maxHeight:260, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
            {AI_LOG.map((m, i) => (
              <div key={i} style={{ display:"flex", flexDirection:m.role==="AI"?"row":"row-reverse", gap:6, alignItems:"flex-start" }}>
                <div style={{ width:24, height:24, borderRadius:6, background:m.role==="AI"?"rgba(0,182,122,.12)":"rgba(99,102,241,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>
                  {m.role==="AI" ? "🤖" : "👤"}
                </div>
                <div style={{ background:m.role==="AI"?"rgba(0,182,122,.06)":"rgba(99,102,241,.06)", border:`1px solid ${m.role==="AI"?"rgba(0,182,122,.12)":"rgba(99,102,241,.12)"}`, borderRadius:8, padding:"6px 10px", fontSize:11, color:"#C8D6E5", lineHeight:1.5, maxWidth:"80%" }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
