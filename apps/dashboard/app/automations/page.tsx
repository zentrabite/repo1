"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Modal from "@/components/modal";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getCampaigns, updateCampaign, createCampaign, getSmsStats } from "@/lib/queries";
import type { Campaign } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", st:"#6B7C93" };

export default function AutomationsPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [camps,   setCamps]   = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [isNew,   setIsNew]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name:"", trigger:"", template:"", type:"SMS", active:true, trigger_days:14, discount_amount:10, cooldown_days:30 });
  const [smsSent, setSmsSent] = useState(0);
  const [smsConv, setSmsConv] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      getCampaigns(businessId),
      getSmsStats(businessId),
    ]).then(([camps, stats]) => {
      setCamps(camps);
      setSmsSent(stats.sent);
      setSmsConv(stats.converted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [businessId]);

  const [running, setRunning] = useState(false);

  const totalActive = camps.filter(c => c.active).length;

  const runNow = async () => {
    if (!businessId) return;
    setRunning(true);
    try {
      const res  = await fetch("/api/automations/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ businessId }),
      });
      const data = await res.json();
      show(data.sent > 0 ? `✅ Sent ${data.sent} messages` : "No customers due right now");
    } catch {
      show("❌ Failed to run automations");
    } finally {
      setRunning(false);
    }
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({ name:c.name??"", trigger:String(c.trigger_days??14)+" days inactive", template:c.template??"", type:c.type??"SMS", active:c.active, trigger_days:c.trigger_days, discount_amount:c.discount_amount, cooldown_days:c.cooldown_days });
    setIsNew(false);
  };

  const openNew = () => {
    setEditing({} as Campaign);
    setForm({ name:"", trigger:"", template:"", type:"SMS", active:true, trigger_days:14, discount_amount:10, cooldown_days:30 });
    setIsNew(true);
  };

  const save = async () => {
    if (!businessId) return;
    if (isNew) {
      await createCampaign(businessId, { type:"custom", name:form.name, template:form.template, active:form.active, trigger_days:form.trigger_days, discount_amount:form.discount_amount, cooldown_days:form.cooldown_days });
      const fresh = await getCampaigns(businessId);
      setCamps(fresh);
    } else if (editing?.id) {
      await updateCampaign(editing.id, { name:form.name, template:form.template, active:form.active });
      setCamps(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
    }
    setEditing(null);
    show("Saved ✓");
  };

  const toggle = async (camp: Campaign) => {
    await updateCampaign(camp.id, { active: !camp.active });
    setCamps(prev => prev.map(c => c.id === camp.id ? { ...c, active: !c.active } : c));
    show(!camp.active ? "Campaign activated ✓" : "Campaign paused");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Automations</h2>
          <p style={{ color:C.st, fontSize:12 }}>SMS & email with triggers & attribution</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="bg-btn" onClick={runNow} disabled={running}>
            {running ? "Running…" : "▶ Run Now"}
          </button>
          <button className="bp" onClick={openNew}>+ New</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
        <StatCard label="Active"    value={String(totalActive)} icon="⚡" />
        <StatCard label="SMS Sent"  value={smsSent.toLocaleString()} icon="📤" delay={50} />
        <StatCard label="Converted" value={String(smsConv)} accent icon="✅" delay={100} />
        <StatCard label="Conv Rate" value={smsSent > 0 ? `${Math.round(smsConv/smsSent*100)}%` : "—"} accent icon="📊" delay={150} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {loading ? (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:32 }}>Loading…</div>
        ) : camps.length === 0 ? (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:32, fontSize:13 }}>
            No campaigns yet — connect Twilio then click + New to create one
          </div>
        ) : camps.map((c, i) => (
          <div key={i} className="gc" style={{ padding:20, cursor:"pointer" }} onClick={() => openEdit(c)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ display:"flex", gap:5, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:15, color:"#fff" }}>{c.name ?? c.type}</span>
                  <Badge type={c.active ? "active" : "paused"}>{c.active ? "active" : "paused"}</Badge>
                  <Badge type={c.type}>{c.type}</Badge>
                </div>
                <div style={{ fontSize:12, color:C.st }}>Trigger: every {c.trigger_days} days inactive · ${c.discount_amount} discount</div>
              </div>
              <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                {[["Sent","—","#fff"],["Conv","—",C.g],["Rev","—",C.g]].map(([l,v,col]) => (
                  <div key={String(l)} style={{ textAlign:"center" }}>
                    <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-outfit)", color: col as string }}>{v}</div>
                    <div style={{ fontSize:9, color:C.st }}>{l}</div>
                  </div>
                ))}
                <button className="bg-btn" style={{ fontSize:11 }} onClick={e => { e.stopPropagation(); toggle(c); }}>
                  {c.active ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "New Automation" : `Edit: ${editing?.name ?? editing?.type}`} wide>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Win-Back" /></div>
          <div><label>Type</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option>SMS</option><option>Email</option></select></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label>Trigger after (days)</label><input type="number" value={form.trigger_days} onChange={e=>setForm(f=>({...f,trigger_days:Number(e.target.value)}))} /></div>
          <div><label>Discount ($)</label><input type="number" value={form.discount_amount} onChange={e=>setForm(f=>({...f,discount_amount:Number(e.target.value)}))} /></div>
          <div><label>Cooldown (days)</label><input type="number" value={form.cooldown_days} onChange={e=>setForm(f=>({...f,cooldown_days:Number(e.target.value)}))} /></div>
        </div>
        <div style={{ marginBottom:14 }}><label>SMS Template</label><textarea value={form.template} onChange={e=>setForm(f=>({...f,template:e.target.value}))} placeholder="Hey {name}, we miss you! $10 off: {link}" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setEditing(null)}>Cancel</button>
          <button className="bp" onClick={save}>Save</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
