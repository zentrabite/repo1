"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getCustomers, getCustomerOrders, createCustomer } from "@/lib/queries";
import type { Customer, Order } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", am:"#F59E0B", st:"#6B7C93" };
const SEGS = ["All","VIP","Regular","New","At Risk"];

function Av({ n, sz=28 }: { n:string; sz?:number }) {
  return (
    <div style={{ width:sz, height:sz, borderRadius:sz*.3, background:"linear-gradient(135deg,#1C2D48,#0F1F2D)", border:"1px solid rgba(255,255,255,.08)", color:"#8B9DB5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*.36, fontWeight:600, fontFamily:"var(--font-outfit)", flexShrink:0 }}>
      {n.split(" ").map(x=>x[0]).join("").slice(0,2)}
    </div>
  );
}

export default function CustomersPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [customers,      setCustomers]      = useState<Customer[]>([]);
  const [custOrders,     setCustOrders]     = useState<Order[]>([]);
  const [seg,            setSeg]            = useState("All");
  const [segmentsEmpty,  setSegmentsEmpty]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Customer | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [addingCust, setAddingCust] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [newCust,    setNewCust]    = useState({ name:"", phone:"", email:"" });
  const [smsOpen,    setSmsOpen]    = useState(false);
  const [smsText,    setSmsText]    = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [aiCalling,  setAiCalling]  = useState(false);

  useEffect(() => {
    if (!businessId) return;
    getCustomers(businessId).then(data => {
      setCustomers(data);
      setLoading(false);
      // Check if all customers have null segments — if so, warn the merchant
      if (data.length > 0 && data.every((c: Customer) => !c.segment)) {
        setSegmentsEmpty(true);
      }
    });
  }, [businessId]);

  useEffect(() => {
    if (!selected) return;
    getCustomerOrders(selected.id).then(setCustOrders);
  }, [selected]);

  const saveNewCustomer = async () => {
    if (!businessId || !newCust.name.trim()) return show("Name is required");
    setSaving(true);
    try {
      const c = await createCustomer(businessId, newCust);
      setCustomers(prev => [c, ...prev]);
      setNewCust({ name:"", phone:"", email:"" });
      setAddingCust(false);
      show("Customer added ✓");
    } catch { show("Failed to add customer"); }
    finally { setSaving(false); }
  };

  const filtered = customers
    .filter(c => seg === "All" || c.segment === seg)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search));

  const sendSms = async () => {
    if (!businessId || !selected) return;
    if (!selected.phone) return show("No phone number on file");
    if (!smsText.trim())  return show("Write a message first");
    setSmsSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to:         selected.phone,
          message:    smsText.replace(/\{name\}/g, selected.name),
          businessId,
          customerId: selected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      show("SMS sent ✓");
      setSmsOpen(false);
      setSmsText("");
    } catch (e: any) {
      show(e?.message ?? "SMS send failed");
    } finally {
      setSmsSending(false);
    }
  };

  const startAiCall = async () => {
    if (!businessId || !selected) return;
    if (!selected.phone) return show("No phone number on file");
    setAiCalling(true);
    try {
      const res = await fetch("/api/ai-calls/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          customerId: selected.id,
          phone:      selected.phone,
          reason:     "followup",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Call failed");
      show(`AI call started ✓ (${data.status ?? "queued"})`);
    } catch (e: any) {
      show(e?.message ?? "AI call failed");
    } finally {
      setAiCalling(false);
    }
  };

  if (selected) return (
    <div>
      <button className="bg-btn" onClick={() => setSelected(null)} style={{ marginBottom:16 }}>← Back</button>
      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:12 }}>
        <div className="gc" style={{ padding:20 }}>
          <Av n={selected.name} sz={48} />
          <h3 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:17, color:"#fff", margin:"10px 0 6px" }}>{selected.name}</h3>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
            <Badge type={selected.segment}>{selected.segment}</Badge>
          </div>
          <div style={{ fontSize:13, color:C.st, display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
            {selected.email && <div>📧 {selected.email}</div>}
            {selected.phone && <div>📱 {selected.phone}</div>}
            <div>⭐ {selected.points_balance} points</div>
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:12 }}>
            {[["Orders",selected.total_orders],["Lifetime Value",`$${selected.total_spent}`]].map(([l,v]) => (
              <div key={String(l)} style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
                <span style={{ color:C.st }}>{l}</span><span style={{ fontWeight:600, color:"#fff" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:14 }}>
            <button className="bp" style={{ flex:1, justifyContent:"center", fontSize:12, padding:"8px 0" }} onClick={() => { setSmsText(`Hi {name}, `); setSmsOpen(true); }} disabled={!selected.phone}>SMS</button>
            <button className="bg-btn" style={{ flex:1, justifyContent:"center" }} onClick={startAiCall} disabled={!selected.phone || aiCalling}>{aiCalling ? "Calling…" : "🤖 Call"}</button>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div className="gc" style={{ padding:18 }}>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:10 }}>Order History</div>
            {custOrders.length === 0 ? (
              <p style={{ fontSize:13, color:"rgba(255,255,255,.2)", textAlign:"center", padding:"12px 0" }}>No orders yet</p>
            ) : custOrders.map((o, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<custOrders.length-1?"1px solid rgba(255,255,255,.05)":"", fontSize:13 }}>
                <span style={{ color:"#fff" }}>{new Date(o.created_at).toLocaleDateString()}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Badge type={o.source}>{o.source}</Badge>
                  <span style={{ fontWeight:600, color:"#fff" }}>${o.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title={`SMS to ${selected.name}`}>
        <div style={{ marginBottom:10, fontSize:12, color:C.st }}>
          Going to: <span style={{ color:"#fff" }}>{selected.phone ?? "—"}</span>
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Message</label>
          <textarea
            value={smsText}
            onChange={e => setSmsText(e.target.value)}
            rows={4}
            placeholder="Use {name} to personalise"
            style={{ width:"100%" }}
          />
          <div style={{ fontSize:11, color:C.st, marginTop:4 }}>{smsText.length} chars · {`{name}`} will be replaced with "{selected.name}"</div>
        </div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setSmsOpen(false)}>Cancel</button>
          <button className="bp" onClick={sendSms} disabled={smsSending || !selected.phone}>{smsSending ? "Sending…" : "Send SMS"}</button>
        </div>
      </Modal>
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Customers</h2>
          <p style={{ color:C.st, fontSize:12 }}>CRM database · {customers.length} total</p>
        </div>
        <button className="bp" onClick={() => { setNewCust({ name:"", phone:"", email:"" }); setAddingCust(true); }}>+ Add</button>
      </div>

      {segmentsEmpty && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:10,
          padding:"12px 16px", marginBottom:12, borderRadius:10,
          background:"rgba(245,158,11,.08)",
          border:"1px solid rgba(245,158,11,.2)",
        }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:"#F59E0B", lineHeight:1.6 }}>
            <strong>Segments haven&apos;t been calculated yet.</strong> The VIP, Regular, New, and At Risk filters
            won&apos;t work until the nightly analytics job runs. Make sure the{" "}
            <code style={{ fontFamily:"monospace", fontSize:11 }}>nightly-analytics</code>{" "}
            edge function is scheduled in Supabase.
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…" style={{ width:200 }} />
        {SEGS.map(s => <button key={s} className={`bg-btn ${seg===s?"on":""}`} onClick={() => setSeg(s)}>{s}</button>)}
      </div>

      <div className="gc" style={{ overflow:"hidden" }}>
        <table>
          <thead>
            <tr>{["","Name","LTV","Points","Segment","Last Order","Source"].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>{loading ? "Loading…" : customers.length === 0 ? "No customers yet — they'll appear as orders come in" : "No customers match this filter"}</td>
              </tr>
            ) : filtered.map((c, i) => (
              <tr key={i} onClick={() => setSelected(c)}>
                <td><Av n={c.name} /></td>
                <td><div style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{c.name}</div><div style={{ fontSize:10, color:C.st }}>{c.email}</div></td>
                <td style={{ fontWeight:600, color:C.g, fontSize:13 }}>${c.total_spent.toLocaleString()}</td>
                <td style={{ fontWeight:600, color:C.am, fontSize:12 }}>{c.points_balance}</td>
                <td><Badge type={c.segment}>{c.segment}</Badge></td>
                <td style={{ fontSize:12, color:C.st }}>{c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "—"}</td>
                <td><Badge type={c.source}>{c.source}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={addingCust} onClose={() => setAddingCust(false)} title="Add Customer">
        <div style={{ marginBottom:12 }}><label>Full Name *</label><input value={newCust.name} onChange={e=>setNewCust(n=>({...n,name:e.target.value}))} placeholder="Jane Smith" autoFocus /></div>
        <div style={{ marginBottom:12 }}><label>Phone</label><input value={newCust.phone} onChange={e=>setNewCust(n=>({...n,phone:e.target.value}))} placeholder="+61 400 000 000" /></div>
        <div style={{ marginBottom:18 }}><label>Email</label><input type="email" value={newCust.email} onChange={e=>setNewCust(n=>({...n,email:e.target.value}))} placeholder="jane@email.com" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setAddingCust(false)}>Cancel</button>
          <button className="bp" onClick={saveNewCustomer} disabled={saving}>{saving ? "Saving…" : "Add Customer"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
