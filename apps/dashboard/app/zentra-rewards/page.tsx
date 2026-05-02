"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getWinbackRules, createWinbackRule, updateWinbackRule, deleteWinbackRule,
} from "@/lib/queries";
import type { WinbackRule } from "@/lib/database.types";

const C = { g:"#00B67A", r:"#DC3545", be:"#63B3FF", st:"#6B7C93" };

const BLANK_FORM = {
  name: "",
  inactive_days: 14,
  offer_type: "percent",
  offer_value: 20,
  channel: "sms",
  template: "Hey {name}, we miss you — here's {offer} off your next order at {business}. Tap the link to redeem: {link}",
  cooldown_days: 30,
  is_active: true,
};

export default function WinBackPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [rules, setRules] = useState<WinbackRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => {
    if (!businessId) return;
    getWinbackRules(businessId)
      .then(rs => { setRules(rs); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [businessId]);

  const loadFromRule = (r: WinbackRule) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      inactive_days: r.inactive_days,
      offer_type: r.offer_type,
      offer_value: Number(r.offer_value),
      channel: r.channel,
      template: r.template,
      cooldown_days: r.cooldown_days,
      is_active: r.is_active,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const reset = () => { setEditingId(null); setForm(BLANK_FORM); };

  const save = async () => {
    if (!businessId) return;
    if (!form.name.trim()) { show("Please name this rule"); return; }
    try {
      if (editingId) {
        await updateWinbackRule(editingId, form);
        show("Rule saved ✓");
      } else {
        const created = await createWinbackRule(businessId, form);
        setRules(prev => [created, ...prev]);
        show("Rule created ✓");
      }
      const rs = await getWinbackRules(businessId);
      setRules(rs);
      reset();
    } catch (e: any) {
      show(`Error: ${e.message ?? e}`);
    }
  };

  const toggle = async (r: WinbackRule) => {
    await updateWinbackRule(r.id, { is_active: !r.is_active });
    setRules(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
    show(r.is_active ? "Rule paused" : "Rule activated ✓");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule? It stops running immediately.")) return;
    await deleteWinbackRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
    show("Rule deleted");
  };

  const active = rules.filter(r => r.is_active).length;
  const redemptions = rules.reduce((a,r) => a + r.redemptions, 0);
  const revenue = rules.reduce((a,r) => a + Number(r.revenue), 0);

  const formatOffer = (r: WinbackRule) => {
    if (r.offer_type === "percent")       return `${r.offer_value}% off`;
    if (r.offer_type === "dollar")        return `$${r.offer_value} off`;
    if (r.offer_type === "free_delivery") return `Free delivery`;
    if (r.offer_type === "free_item")     return `Free item`;
    return r.offer_type;
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:19, color:"#fff" }}>Zentra Rewards</h2>
          <p style={{ color:C.st, fontSize:11 }}>Automated retention offers sent to customers who go quiet</p>
        </div>
        <button className="bp" onClick={() => { reset(); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }}>+ New rule</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Active rules"       value={String(active)} accent icon="🎫" />
        <StatCard label="Redemptions"        value={String(redemptions)} icon="🎁" delay={50} />
        <StatCard label="Revenue recovered"  value={`$${Math.round(revenue).toLocaleString()}`} accent icon="💰" delay={100} />
        <StatCard label="Rules total"        value={String(rules.length)} icon="📋" delay={150} />
      </div>

      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff", marginBottom:10 }}>Rules</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {loading ? (
          <div className="gc" style={{ padding:16, color:C.st, fontSize:12 }}>Loading…</div>
        ) : rules.length === 0 ? (
          <div className="gc" style={{ padding:20, color:C.st, fontSize:12, textAlign:"center" }}>
            No Zentra Rewards rules yet. Create one below — a common first rule is &ldquo;SMS 20% off after 14 days of no orders&rdquo;.
          </div>
        ) : rules.map(r => (
          <div key={r.id} className="gc" style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>{r.name}</span>
                  <Badge type={r.is_active ? "active" : "paused"}>{r.is_active ? "Active" : "Paused"}</Badge>
                  <Badge type="Direct">{r.channel.toUpperCase()}</Badge>
                  <Badge type="Loyal">{formatOffer(r)}</Badge>
                </div>
                <div style={{ fontSize:11, color:C.st, marginBottom:6 }}>
                  Fires when a customer goes <b style={{ color:"#fff" }}>{r.inactive_days} days</b> without ordering · cooldown {r.cooldown_days}d
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.55)", fontStyle:"italic", lineHeight:1.5 }}>&ldquo;{r.template}&rdquo;</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end", minWidth:120 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, fontSize:18, fontFamily:"var(--font-outfit)", color:C.g }}>{r.redemptions}</div>
                  <div style={{ fontSize:9, color:C.st }}>Redeemed · ${Math.round(Number(r.revenue))}</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="bg-btn" onClick={() => loadFromRule(r)}>Edit</button>
                  <button className="bg-btn" onClick={() => toggle(r)} style={{ color: r.is_active ? C.r : C.g, borderColor: r.is_active ? "rgba(220,53,69,.2)" : "rgba(0,182,122,.2)" }}>
                    {r.is_active ? "Pause" : "Resume"}
                  </button>
                  <button className="bg-btn" onClick={() => remove(r.id)} style={{ color:C.r }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / edit form */}
      <div className="gc" style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff" }}>
            {editingId ? "Edit rule" : "Create new rule"}
          </div>
          {editingId && <button className="bg-btn" onClick={reset}>Cancel</button>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Rule name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} placeholder="e.g. 14-day lapsed customer re-engagement" />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Channel</label>
            <select value={form.channel} onChange={e=>setForm(f=>({...f, channel:e.target.value}))}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="push">Push notification</option>
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Inactive for (days)</label>
            <input type="number" value={form.inactive_days} onChange={e=>setForm(f=>({...f, inactive_days:Number(e.target.value)}))} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Offer type</label>
            <select value={form.offer_type} onChange={e=>setForm(f=>({...f, offer_type:e.target.value}))}>
              <option value="percent">% off</option>
              <option value="dollar">$ off</option>
              <option value="free_delivery">Free delivery</option>
              <option value="free_item">Free item</option>
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Value</label>
            <input type="number" value={form.offer_value} onChange={e=>setForm(f=>({...f, offer_value:Number(e.target.value)}))} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Cooldown (days)</label>
            <input type="number" value={form.cooldown_days} onChange={e=>setForm(f=>({...f, cooldown_days:Number(e.target.value)}))} />
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>
            Message template — use <code>{"{name}"}</code>, <code>{"{offer}"}</code>, <code>{"{business}"}</code>, <code>{"{link}"}</code>
          </label>
          <textarea
            value={form.template}
            onChange={e=>setForm(f=>({...f, template:e.target.value}))}
            rows={3}
            style={{ width:"100%", fontFamily:"inherit", fontSize:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:6, padding:"10px 12px", color:"#fff", resize:"vertical" }}
          />
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:C.st, cursor:"pointer" }}>
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f, is_active:e.target.checked}))} />
            Active on save
          </label>
          <button className="bp" onClick={save}>{editingId ? "Save changes" : "Publish rule"}</button>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
