"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Modal from "@/components/modal";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getOrders, updateOrderStatus } from "@/lib/queries";
import type { Order } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", r:"#DC3545", st:"#6B7C93" };
const FILTERS = ["All","direct","uber_eats","menulog"];
const FILTER_LABELS: Record<string,string> = { All:"All", direct:"Direct", uber_eats:"Uber Eats", menulog:"Menulog" };

export default function OrdersPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [orders,   setOrders]   = useState<Order[]>([]);
  const [filter,   setFilter]   = useState("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!businessId) return;
    getOrders(businessId).then(data => { setOrders(data); setLoading(false); });
  }, [businessId]);

  const filtered = filter === "All" ? orders : orders.filter(o => o.source === filter);
  const totalRev    = filtered.reduce((a, o) => a + o.total, 0);
  const totalOrders = filtered.length;

  const advance = async (order: Order) => {
    const next: Record<string,string> = { New:"Preparing", Preparing:"Ready", Ready:"Delivered" };
    if (!next[order.status]) return;
    await updateOrderStatus(order.id, next[order.status]);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next[o.status] } : o));
    show(`→ ${next[order.status]}`);
    setSelected(null);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Orders</h2>
          <p style={{ color:C.st, fontSize:12 }}>Revenue & margin tracking by source</p>
        </div>
        <button className="bp" onClick={() => show("Exported ✓")}>Export</button>
      </div>

      {/* Source filters */}
      <div style={{ display:"flex", gap:5, marginBottom:12 }}>
        {FILTERS.map(f => (
          <button key={f} className={`bg-btn ${filter===f?"on":""}`} onClick={() => setFilter(f)}>
            {FILTER_LABELS[f]} ({f==="All" ? orders.length : orders.filter(o=>o.source===f).length})
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
        <StatCard label="Orders"   value={String(totalOrders)} icon="📋" />
        <StatCard label="Revenue"  value={totalRev > 0 ? `$${totalRev.toLocaleString()}` : "—"} accent icon="💰" delay={50} />
        <StatCard label="Fees"     value="—" icon="🔴" delay={100} />
        <StatCard label="Margin"   value={totalRev > 0 ? `$${totalRev.toLocaleString()}` : "—"} accent icon="✅" delay={150} />
      </div>

      {/* Table */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <table>
          <thead>
            <tr>{["ID","Items","Source","Total","Status"].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5}>{loading ? "Loading…" : "No orders yet"}</td>
              </tr>
            ) : filtered.map((o, i) => (
              <tr key={i} onClick={() => setSelected(o)}>
                <td style={{ fontFamily:"var(--font-mono)", fontSize:10, color:C.st }}>{o.id.slice(0,8)}…</td>
                <td>{Array.isArray(o.items) ? `${(o.items as any[]).length} item(s)` : "—"}</td>
                <td><Badge type={o.source}>{FILTER_LABELS[o.source] ?? o.source}</Badge></td>
                <td style={{ fontWeight:600, color:"#fff" }}>${o.total}</td>
                <td><Badge type={o.status === "New" ? "New_order" : o.status}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order ${selected.id.slice(0,8)}…` : ""}>
        {selected && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {[["Total",`$${selected.total}`],["Status",selected.status],["Source",selected.source],["Created",new Date(selected.created_at).toLocaleString()]].map(([l,v]) => (
                <div key={l}><div style={{ fontSize:11, color:C.st, marginBottom:2 }}>{l}</div><div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display:"flex", gap:5 }}>
              {selected.status !== "Delivered" && (
                <button className="bp" onClick={() => advance(selected)}>
                  → {{ New:"Prepare", Preparing:"Mark Ready", Ready:"Deliver" }[selected.status] ?? "Next"}
                </button>
              )}
              <button className="bg-btn" onClick={() => { setSelected(null); show("Receipt sent ✓"); }}>Receipt</button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
