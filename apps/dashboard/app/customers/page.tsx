"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getCustomers, getCustomerOrders } from "@/lib/queries";
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custOrders, setCustOrders] = useState<Order[]>([]);
  const [seg,      setSeg]      = useState("All");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!businessId) return;
    getCustomers(businessId).then(data => { setCustomers(data); setLoading(false); });
  }, [businessId]);

  useEffect(() => {
    if (!selected) return;
    getCustomerOrders(selected.id).then(setCustOrders);
  }, [selected]);

  const filtered = customers
    .filter(c => seg === "All" || c.segment === seg)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search));

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
            <button className="bp" style={{ flex:1, justifyContent:"center", fontSize:12, padding:"8px 0" }} onClick={() => show("SMS sent ✓")}>SMS</button>
            <button className="bg-btn" style={{ flex:1, justifyContent:"center" }} onClick={() => show("AI call started ✓")}>🤖 Call</button>
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
        <button className="bp" onClick={() => show("Add customer — coming soon")}>+ Add</button>
      </div>

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
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
