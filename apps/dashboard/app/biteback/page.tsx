"use client";
import { useState } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { BITEBACK_OFFERS, BIZ } from "@/lib/data";

const C = { g:"#00B67A", r:"#DC3545", be:"#63B3FF", st:"#6B7C93" };
type Offer = { title:string; desc:string; status:string; redemptions:number; expires:string; type:string };

export default function BiteBackPage() {
  const { toast, show } = useToast();
  const [offers, setOffers] = useState<Offer[]>(BITEBACK_OFFERS as Offer[]);
  const [form, setForm] = useState({ title:"", type:"Discount ($)", value:"", minOrder:"", expires:"7 days", desc:"" });

  const toggleOffer = (title: string) => {
    setOffers(prev => prev.map(o => o.title === title ? { ...o, status: o.status==="active"?"paused":"active" } : o));
    show("Offer updated ✓");
  };

  const publish = () => {
    if (!form.title) return show("Please enter an offer title");
    setOffers(prev => [...prev, { title:form.title, desc:form.desc||"Direct orders", status:"active", redemptions:0, expires:form.expires, type:form.type.split(" ")[0] }]);
    setForm({ title:"", type:"Discount ($)", value:"", minOrder:"", expires:"7 days", desc:"" });
    show("Offer published to BiteBack ✓");
  };

  const activeCount = offers.filter(o => o.status==="active").length;
  const totalRedemptions = offers.reduce((a,o) => a+o.redemptions, 0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:19, color:"#fff" }}>BiteBack — Manage Offers</h2>
          <p style={{ color:C.st, fontSize:11 }}>Create and update your offers on the BiteBack consumer network</p>
        </div>
        <button className="bp" onClick={() => show("Scroll down to create a new offer")}>+ New Offer</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Active Offers"      value={String(activeCount)} accent icon="🎫" />
        <StatCard label="Redemptions"        value={String(totalRedemptions)} icon="🎁" delay={50} />
        <StatCard label="BB Members Reached" value={String(Math.round(BIZ.customers*.35))} icon="👥" delay={100} />
        <StatCard label="Revenue from BB"    value={`$${Math.round(BIZ.rewardsIssued/100*1.4).toLocaleString()}`} accent icon="💰" delay={150} />
      </div>

      {/* Active offers */}
      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff", marginBottom:10 }}>Your Active Offers</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {offers.map((offer, i) => (
          <div key={i} className="gc" style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", gap:5, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>{offer.title}</span>
                  <Badge type={offer.status}>{offer.status === "active" ? "Active" : "Paused"}</Badge>
                  <Badge type={offer.type==="Discount"?"Direct":offer.type==="Freebie"?"Loyal":"New"}>{offer.type}</Badge>
                </div>
                <div style={{ fontSize:11, color:C.st }}>{offer.desc} · Expires in {offer.expires}</div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:700, fontSize:18, fontFamily:"var(--font-outfit)", color:C.g }}>{offer.redemptions}</div>
                  <div style={{ fontSize:8, color:C.st }}>Redeemed</div>
                </div>
                <button className="bg-btn" onClick={() => show("Edit offer — coming soon")}>Edit</button>
                <button className="bg-btn" style={{ color:C.r, borderColor:"rgba(220,53,69,.2)" }} onClick={() => toggleOffer(offer.title)}>
                  {offer.status==="active"?"Pause":"Resume"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create new offer form */}
      <div className="gc" style={{ padding:20 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff", marginBottom:12 }}>Create New Offer</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Offer Title</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. $10 off direct order" /></div>
          <div><label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Type</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              <option>Discount ($)</option><option>Discount (%)</option><option>Freebie</option><option>Welcome Offer</option>
            </select></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Value</label>
            <input value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} placeholder="e.g. 10" /></div>
          <div><label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Min. Order</label>
            <input value={form.minOrder} onChange={e=>setForm(f=>({...f,minOrder:e.target.value}))} placeholder="e.g. $30" /></div>
          <div><label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Expires In</label>
            <select value={form.expires} onChange={e=>setForm(f=>({...f,expires:e.target.value}))}>
              <option>7 days</option><option>14 days</option><option>30 days</option><option>No expiry</option>
            </select></div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Description</label>
          <input value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="e.g. Valid on direct orders only" />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button className="bp" onClick={publish}>Publish Offer</button>
        </div>
      </div>

      {/* BiteBack network info */}
      <div className="gc" style={{ padding:16, marginTop:12, background:"linear-gradient(135deg,rgba(47,109,246,.04),rgba(99,179,255,.02))", border:"1px solid rgba(99,179,255,.08)" }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:16, color:"#fff" }}>Bite<span style={{ color:C.be }}>Back</span></span>
          <Badge type="BiteBack Active">Network</Badge>
        </div>
        <p style={{ fontSize:11.5, color:"#8ba0bd", lineHeight:1.6 }}>Your offers are visible to all BiteBack subscribers in your area. As the network grows, more customers discover your business through partner cross-referrals.</p>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
