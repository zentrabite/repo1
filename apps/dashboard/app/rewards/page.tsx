"use client";

// ─── /rewards — Points, Tiers & Rewards Catalogue ────────────────────────────
// Earn → unlock → redeem model.
// Removed "pay with points" (was UX noise) — points now redeem for catalogue
// items (free coffee, $10 voucher, free main, etc.), not as checkout currency.

import { useState, useEffect, useMemo } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getCustomersByPoints,
  getRewardsCatalogue,
  getRecentRedemptions,
  createCatalogueItem,
  updateCatalogueItem,
  deleteCatalogueItem,
} from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", am:"#F59E0B", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

// ─── Tier thresholds (cumulative points) ─────────────────────────────────────
function tierOf(pts: number): "Gold" | "Silver" | "Bronze" {
  if (pts >= 1000) return "Gold";
  if (pts >= 300)  return "Silver";
  return "Bronze";
}

type Customer = { id:string; name:string; email:string|null; pts:number; tier:"Gold"|"Silver"|"Bronze" };
type CatalogueItem = { id:string; name:string; description?:string|null; points_cost:number; category?:string|null; is_active:boolean };
type Redemption = { id:string; redeemed_at:string; points_spent:number; customers?:{name:string}|null; rewards_catalogue?:{name:string; points_cost:number}|null };

const BLANK_ITEM: Omit<CatalogueItem,"id"|"is_active"> = { name:"", description:"", points_cost:100, category:"" };

function Av({ n, sz=28 }: { n:string; sz?:number }) {
  return (
    <div style={{ width:sz, height:sz, borderRadius:sz*.3, background:"linear-gradient(135deg,#1C2D48,#0F1F2D)", border:"1px solid rgba(255,255,255,.08)", color:"#8B9DB5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*.36, fontWeight:600, fontFamily:"var(--font-outfit)", flexShrink:0 }}>
      {n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

function TierBar({ pts }: { pts: number }) {
  const next = pts < 300 ? 300 : pts < 1000 ? 1000 : null;
  const prev = pts < 300 ? 0   : pts < 1000 ? 300  : 1000;
  if (!next) return <div style={{ fontSize:10, color:C.am }}>Max tier — Gold ✦</div>;
  const pct = Math.min(100, Math.round((pts - prev) / (next - prev) * 100));
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
        <div style={{ width:`${pct}%`, height:"100%", borderRadius:2, background:C.g, transition:"width .3s" }} />
      </div>
      <span style={{ fontSize:10, color:C.st, flexShrink:0 }}>{next - pts} to next</span>
    </div>
  );
}

export default function RewardsPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [catalogue,    setCatalogue]    = useState<CatalogueItem[]>([]);
  const [redemptions,  setRedemptions]  = useState<Redemption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<"leaderboard"|"catalogue"|"redemptions">("leaderboard");
  const [modal,        setModal]        = useState<"add"|"edit"|null>(null);
  const [selected,     setSelected]     = useState<CatalogueItem | null>(null);
  const [form,         setForm]         = useState({ ...BLANK_ITEM });
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      getCustomersByPoints(businessId),
      getRewardsCatalogue(businessId),
      getRecentRedemptions(businessId),
    ]).then(([cust, cat, red]) => {
      setCustomers((cust ?? []).map((c: any) => ({
        id: c.id, name: c.name ?? "Customer", email: c.email ?? null,
        pts: Number(c.points_balance ?? 0), tier: tierOf(Number(c.points_balance ?? 0)),
      })));
      setCatalogue(cat as CatalogueItem[]);
      setRedemptions(red as Redemption[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [businessId]);

  const goldCount   = useMemo(() => customers.filter(r => r.tier === "Gold").length,   [customers]);
  const silverCount = useMemo(() => customers.filter(r => r.tier === "Silver").length, [customers]);
  const bronzeCount = useMemo(() => customers.filter(r => r.tier === "Bronze").length, [customers]);
  const totalPts    = useMemo(() => customers.reduce((a, c) => a + c.pts, 0), [customers]);

  const openAdd = () => { setForm({ ...BLANK_ITEM }); setSelected(null); setModal("add"); };
  const openEdit = (item: CatalogueItem) => {
    setSelected(item);
    setForm({ name: item.name, description: item.description ?? "", points_cost: item.points_cost, category: item.category ?? "" });
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) return show("Name is required");
    if (!form.points_cost || form.points_cost < 1) return show("Points cost must be at least 1");
    setSaving(true);
    try {
      if (modal === "add") {
        const item = await createCatalogueItem(businessId, { name: form.name.trim(), description: form.description || undefined, points_cost: Number(form.points_cost), category: form.category || undefined });
        setCatalogue(prev => [...prev, item as CatalogueItem].sort((a,b) => a.points_cost - b.points_cost));
        show("Reward added ✓");
      } else if (modal === "edit" && selected) {
        const item = await updateCatalogueItem(selected.id, { name: form.name.trim(), description: form.description || null, points_cost: Number(form.points_cost), category: form.category || null });
        setCatalogue(prev => prev.map(x => x.id === selected.id ? item as CatalogueItem : x).sort((a,b) => a.points_cost - b.points_cost));
        show("Reward updated ✓");
      }
      closeModal();
    } catch { show("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: CatalogueItem) => {
    try {
      await deleteCatalogueItem(item.id);
      setCatalogue(prev => prev.filter(x => x.id !== item.id));
      show("Reward removed ✓");
    } catch { show("Remove failed"); }
  };

  const handleToggle = async (item: CatalogueItem) => {
    try {
      const updated = await updateCatalogueItem(item.id, { is_active: !item.is_active });
      setCatalogue(prev => prev.map(x => x.id === item.id ? updated as CatalogueItem : x));
    } catch { show("Update failed"); }
  };

  const exportCsv = () => {
    if (customers.length === 0) { show("Nothing to export"); return; }
    const headers = ["id","name","email","points","tier"];
    const body = customers.map(r =>
      [r.id, r.name, r.email ?? "", r.pts, r.tier]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv  = headers.join(",") + "\n" + body.join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `rewards-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    show("Exported ✓");
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom:14 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Rewards</h2>
        <p style={{ color:C.st, fontSize:12 }}>Earn points · unlock tiers · redeem catalogue rewards</p>
      </div>

      {/* ── Stat row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
        {[
          { label:"Total Members",     value:customers.length,           color:"#fff" },
          { label:"Points In Circulation", value:totalPts.toLocaleString(), color:C.am },
          { label:"Catalogue Items",   value:catalogue.filter(c=>c.is_active).length, color:C.g },
          { label:"Redemptions",       value:redemptions.length,         color:C.o },
        ].map(s => (
          <div key={s.label} className="gc" style={{ padding:"14px 16px" }}>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.st, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tier ladder ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        {[
          { icon:"🥉", label:"Bronze", count:bronzeCount, range:"0–299 pts",   perk:"5% off every order",         bg:"rgba(205,127,50,.06)",  bd:"rgba(205,127,50,.18)", col:"#CD7F32" },
          { icon:"🥈", label:"Silver", count:silverCount, range:"300–999 pts", perk:"10% off + free delivery",    bg:"rgba(192,192,192,.06)", bd:"rgba(192,192,192,.18)",col:"#C0C0C0" },
          { icon:"🥇", label:"Gold",   count:goldCount,   range:"1,000+ pts",  perk:"15% off + priority service", bg:"rgba(245,158,11,.06)",  bd:"rgba(245,158,11,.18)", col:C.am },
        ].map((t, i) => (
          <div key={i} className="gc" style={{ padding:"14px 16px", background:t.bg, borderColor:t.bd }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:24 }}>{t.icon}</span>
              <span style={{ fontSize:22, fontWeight:700, fontFamily:"var(--font-outfit)", color:t.col }}>{t.count}</span>
            </div>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:t.col, marginBottom:2 }}>{t.label}</div>
            <div style={{ fontSize:10, color:C.st }}>{t.range}</div>
            <div style={{ fontSize:11, color:t.col, marginTop:4, opacity:.85 }}>{t.perk}</div>
          </div>
        ))}
      </div>

      {/* ── Earn rules strip ── */}
      <div className="gc" style={{ padding:"12px 16px", marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:8 }}>Earn Rules</div>
        <div style={{ display:"flex", gap:0, flexWrap:"wrap" }}>
          {[
            { trigger:"Per $1 spent", points:"10 pts", icon:"🛍️" },
            { trigger:"Leave a review", points:"50 pts", icon:"⭐" },
            { trigger:"Refer a friend", points:"200 pts", icon:"🤝" },
            { trigger:"Birthday order", points:"200 pts", icon:"🎂" },
            { trigger:"Direct order", points:"×1.2 multiplier", icon:"📱" },
            { trigger:"5-order streak", points:"100 bonus pts", icon:"🔥" },
          ].map((r, i, arr) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px 6px 0", borderRight: i<arr.length-1 ? "1px solid rgba(255,255,255,.06)" : "none", marginRight: i<arr.length-1 ? 16 : 0 }}>
              <span style={{ fontSize:16 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize:11, color:C.st }}>{r.trigger}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.g }}>{r.points}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:4, marginBottom:12 }}>
        {(["leaderboard","catalogue","redemptions"] as const).map(t => (
          <button key={t} className={`bg-btn ${tab===t?"on":""}`} onClick={() => setTab(t)} style={{ textTransform:"capitalize" }}>{t}</button>
        ))}
        {tab === "leaderboard" && (
          <button className="bg-btn" style={{ marginLeft:"auto" }} onClick={exportCsv}>Export CSV</button>
        )}
        {tab === "catalogue" && (
          <button className="bp" style={{ marginLeft:"auto", fontSize:12, padding:"6px 14px" }} onClick={openAdd}>+ Add Reward</button>
        )}
      </div>

      {/* ── Leaderboard tab ── */}
      {tab === "leaderboard" && (
        <div className="gc" style={{ overflow:"hidden" }}>
          <table>
            <thead>
              <tr>{["#","","Customer","Points","Tier","Progress"].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={6}>{loading ? "Loading…" : "No customers have earned points yet"}</td>
                </tr>
              ) : customers.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color:C.st, fontSize:12, fontWeight:600 }}>#{i+1}</td>
                  <td><Av n={c.name} /></td>
                  <td>
                    <div style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{c.name}</div>
                    {c.email && <div style={{ fontSize:10, color:C.st }}>{c.email}</div>}
                  </td>
                  <td style={{ fontWeight:700, color:C.am, fontSize:13 }}>{c.pts.toLocaleString()}</td>
                  <td><Badge type={c.tier}>{c.tier}</Badge></td>
                  <td style={{ minWidth:120 }}><TierBar pts={c.pts} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Catalogue tab ── */}
      {tab === "catalogue" && (
        <div>
          {catalogue.length === 0 && !loading ? (
            <div className="gc" style={{ padding:32, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎁</div>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:15, color:"#fff", marginBottom:6 }}>No rewards yet</div>
              <p style={{ fontSize:13, color:C.st, maxWidth:320, margin:"0 auto 16px" }}>Add rewards to the catalogue so customers know what they can unlock with their points.</p>
              <button className="bp" onClick={openAdd}>+ Add First Reward</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10 }}>
              {catalogue.map(item => (
                <div key={item.id} className="gc" style={{ padding:16, opacity: item.is_active ? 1 : 0.5 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:"#fff", flex:1 }}>{item.name}</div>
                    <Badge type={item.is_active ? "active" : "inactive"}>{item.is_active ? "Active" : "Off"}</Badge>
                  </div>
                  {item.description && <p style={{ fontSize:12, color:C.st, margin:"0 0 8px", lineHeight:1.5 }}>{item.description}</p>}
                  {item.category && <div style={{ fontSize:11, color:C.st, marginBottom:8 }}>{item.category}</div>}
                  <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:C.am, marginBottom:10 }}>
                    {item.points_cost.toLocaleString()} pts
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button className="bg-btn" style={{ flex:1, justifyContent:"center", fontSize:11 }} onClick={() => openEdit(item)}>Edit</button>
                    <button className="bg-btn" style={{ fontSize:11, padding:"5px 10px" }} onClick={() => handleToggle(item)}>{item.is_active ? "Disable" : "Enable"}</button>
                    <button className="bg-btn" style={{ fontSize:11, padding:"5px 8px", color:C.r, borderColor:"rgba(255,71,87,.2)" }} onClick={() => handleDelete(item)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Redemptions tab ── */}
      {tab === "redemptions" && (
        <div className="gc" style={{ overflow:"hidden" }}>
          <table>
            <thead>
              <tr>{["Customer","Reward","Points Spent","Date"].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={4}>{loading ? "Loading…" : "No redemptions yet"}</td>
                </tr>
              ) : redemptions.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{(r.customers as any)?.name ?? "—"}</td>
                  <td style={{ fontSize:13, color:C.cl }}>{(r.rewards_catalogue as any)?.name ?? "—"}</td>
                  <td style={{ fontWeight:700, color:C.am, fontSize:13 }}>{r.points_spent.toLocaleString()} pts</td>
                  <td style={{ fontSize:12, color:C.st }}>{new Date(r.redeemed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Catalogue Item Modal ── */}
      <Modal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add Reward" : "Edit Reward"}>
        <div style={{ marginBottom:12 }}>
          <label>Reward Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Free Coffee" autoFocus />
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Any coffee from our menu" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Points Cost *</label>
          <input
            type="number" min={1}
            value={form.points_cost}
            onChange={e => setForm(f => ({ ...f, points_cost: parseInt(e.target.value) || 0 }))}
            placeholder="e.g. 500"
          />
          <div style={{ fontSize:11, color:C.st, marginTop:4 }}>Points a customer needs to redeem this reward</div>
        </div>
        <div style={{ marginBottom:18 }}>
          <label>Category</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Drinks, Mains, Discounts" />
        </div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={closeModal}>Cancel</button>
          <button className="bp" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Add Reward" : "Save Changes"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
