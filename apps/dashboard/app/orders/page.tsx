"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import Modal from "@/components/modal";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getOrders, saveSettings, updateOrderStatus } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/database.types";
import { Icon, type IconName } from "@/components/zb-icon";
import { optionsLabel } from "@/lib/menu-options";
import { readOrderingRules, shopTime } from "@/lib/pickup-times";

const C = { g:"#00AD82", o:"#FF6B35", r:"#DC3545", st:"#6B7C93" };

type SourceFilter = "All" | "direct" | "uber_eats" | "menulog" | "pos";
type FulfillFilter = "All" | "delivery";

const SOURCE_FILTERS: SourceFilter[] = ["All","direct","uber_eats","menulog","pos"];
const SOURCE_LABELS: Record<string, string> = {
  All:"All", direct:"Direct", uber_eats:"Uber Eats", menulog:"Menulog", pos:"POS",
};
const FULFILL_ICON: Record<string, IconName> = { delivery:"delivery", takeaway:"takeaway", dine_in:"dine-in", pickup:"takeaway" };

export default function OrdersPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [orders,         setOrders]         = useState<Order[]>([]);
  const [sourceFilter,   setSourceFilter]   = useState<SourceFilter>("All");
  const [fulfillFilter,  setFulfillFilter]  = useState<FulfillFilter>("All");
  const [selected,       setSelected]       = useState<Order | null>(null);
  const [loading,        setLoading]        = useState(true);
  // Online orders on or paused. Starts from the saved setting.
  const rules = readOrderingRules(business?.settings);
  const [pausedNow,      setPausedNow]      = useState<boolean | null>(null);
  const paused = pausedNow ?? rules.paused;
  const [pausing,        setPausing]        = useState(false);

  const togglePause = async () => {
    if (!businessId) return;
    setPausing(true);
    try {
      await saveSettings(businessId, { ordering: { paused: !paused } });
      setPausedNow(!paused);
      show(paused ? "Online orders are on again ✓" : "Online orders paused");
    } catch { show("Couldn't change online orders. Try again."); }
    finally { setPausing(false); }
  };

  /** "6:30pm", or "ASAP 6:20pm" for as soon as possible. */
  const pickupText = (o: Order) =>
    o.pickup_at ? `${o.pickup_asap ? "ASAP " : ""}${shopTime(new Date(o.pickup_at), rules.timezone)}` : null;

  // ── Web Audio beep ──────────────────────────────────────────────────────
  function playBeep() {
    if (typeof window === "undefined") return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx  = new Ctx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2,      ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,   ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => ctx.close();
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    getOrders(businessId).then(data => {
      if (cancelled) return;
      setOrders(data);
      setLoading(false);
    });

    // Realtime: new + updated orders
    const channel = supabase
      .channel(`orders:${businessId}`)
      .on(
        "postgres_changes",
        { event:"INSERT", schema:"public", table:"orders", filter:`business_id=eq.${businessId}` },
        (payload: any) => {
          const newOrder = payload.new as Order;
          setOrders(prev => prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]);
          playBeep();
          show(`New order — $${newOrder.total}`);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("New order", { body:`Order for $${newOrder.total}`, tag:newOrder.id });
          }
        }
      )
      .on(
        "postgres_changes",
        { event:"UPDATE", schema:"public", table:"orders", filter:`business_id=eq.${businessId}` },
        (payload: any) => {
          const updated = payload.new as Order;
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        }
      )
      .subscribe();

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [businessId, show]);

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = orders
    .filter(o => sourceFilter  === "All" || o.source           === sourceFilter)
    .filter(o => fulfillFilter === "All" || o.fulfillment_type === fulfillFilter);

  const deliveryOrders = filtered.filter(o => o.fulfillment_type === "delivery");
  const totalRev       = filtered.reduce((a, o) => a + o.total, 0);
  const totalFees      = deliveryOrders.reduce((a, o) => a + (o.delivery_fee ?? 0), 0);
  const totalOrders    = filtered.length;

  // ── Status advance ──────────────────────────────────────────────────────
  const advance = async (order: Order) => {
    const next: Record<string, string> = { New:"Preparing", Preparing:"Ready", Ready:"Delivered" };
    if (!next[order.status]) return;
    await updateOrderStatus(order.id, next[order.status]);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next[o.status] } : o));
    show(`→ ${next[order.status]}`);
    setSelected(null);
  };

  // ── Helper: fulfilment badge ────────────────────────────────────────────
  function fulfillLabel(o: Order) {
    if (o.fulfillment_type === "delivery") return "Delivery";
    if (o.fulfillment_type === "takeaway") return "Takeaway";
    if (o.fulfillment_type === "dine_in")  return "Dine-in";
    if (o.fulfillment_type === "pickup")   return "Pick-up";
    return null;
  }

  return (
    <div>
      <div className="zb-head" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Orders</h2>
          <p style={{ color:C.st, fontSize:12 }}>Revenue & margin tracking by source</p>
        </div>
        <div className="zb-wrap" style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button className="bg-btn" onClick={togglePause} disabled={pausing || !businessId} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} size={14} />{paused ? "Turn online orders back on" : "Pause online orders"}
          </button>
          <button className="bp" onClick={() => show("Exported ✓")}>Export</button>
        </div>
      </div>

      {paused && (
        <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:10, background:"rgba(255,107,53,.1)", border:"1px solid rgba(255,107,53,.3)", color:C.o, fontSize:13 }}>
          Online orders are paused. Customers can see your menu but can&apos;t order until you turn them back on.
        </div>
      )}

      {/* ── Filters row ─────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
        {SOURCE_FILTERS.map(f => (
          <button
            key={f}
            className={`bg-btn ${sourceFilter===f ? "on" : ""}`}
            onClick={() => setSourceFilter(f)}
          >
            {SOURCE_LABELS[f]} ({f==="All" ? orders.length : orders.filter(o=>o.source===f).length})
          </button>
        ))}
        <div style={{ width:1, background:"rgba(255,255,255,.1)", margin:"0 4px" }} />
        <button
          className={`bg-btn ${fulfillFilter==="delivery" ? "on" : ""}`}
          onClick={() => setFulfillFilter(f => f==="delivery" ? "All" : "delivery")}
        >
          <Icon name="delivery" size={14} />Delivery only ({orders.filter(o=>o.fulfillment_type==="delivery").length})
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
        <StatCard label="Orders"        value={String(totalOrders)}   icon="orders" />
        <StatCard label="Revenue"       value={totalRev > 0 ? `$${totalRev.toLocaleString("en-AU", { minimumFractionDigits:2, maximumFractionDigits:2 })}` : "—"} accent icon="money" delay={50} />
        <StatCard label="Delivery Fees" value={totalFees > 0 ? `$${totalFees.toFixed(2)}` : "—"} icon="delivery" delay={100} />
        <StatCard
          label="Net Revenue"
          value={(totalRev > 0) ? `$${(totalRev - totalFees).toLocaleString("en-AU", { minimumFractionDigits:2, maximumFractionDigits:2 })}` : "—"}
          accent
          icon="done"
          delay={150}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <table className="zb-table">
          <thead>
            <tr>
              {["ID","Items","Source","Fulfilment","When","Total","Delivery Fee","Status"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8}>{loading ? "Loading…" : "No orders yet"}</td>
              </tr>
            ) : filtered.map((o, i) => (
              <tr key={i} onClick={() => setSelected(o)}>
                <td data-label="ID" style={{ fontFamily:"var(--font-mono)", fontSize:10, color:C.st }}>{o.id.slice(0,8)}…</td>
                <td data-label="Items">
                  {Array.isArray(o.items) ? `${(o.items as any[]).length} item(s)` : "—"}
                  {o.notes && <span title={o.notes} style={{ marginLeft:6, fontSize:10, fontWeight:700, color:C.o, background:"rgba(255,107,53,.12)", borderRadius:999, padding:"1px 7px" }}>Note</span>}
                </td>
                <td data-label="Source"><Badge type={o.source}>{SOURCE_LABELS[o.source] ?? o.source}</Badge></td>
                <td data-label="Fulfilment" style={{ fontSize:12 }}>
                  {fulfillLabel(o)
                    ? <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Icon name={FULFILL_ICON[o.fulfillment_type ?? ""] ?? "delivery"} size={14} />{fulfillLabel(o)}</span>
                    : <span style={{ color:C.st }}>—</span>}
                </td>
                <td data-label="When" style={{ fontSize:12, color: o.pickup_at ? "#fff" : C.st }}>{pickupText(o) ?? "—"}</td>
                <td data-first style={{ fontWeight:600, color:"#fff" }}>${Number(o.total).toFixed(2)}</td>
                <td data-label="Delivery fee" style={{ fontSize:12, color: o.delivery_fee ? C.g : C.st }}>
                  {o.delivery_fee ? `$${Number(o.delivery_fee).toFixed(2)}` : "—"}
                </td>
                <td data-first data-end><Badge type={o.status === "New" ? "New_order" : o.status}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Order detail modal ───────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order ${selected.id.slice(0,8)}…` : ""}>
        {selected && (
          <div>
            {/* Core fields */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {([
                ["Total",       `$${Number(selected.total).toFixed(2)}`],
                ["Status",      selected.status],
                ["Source",      SOURCE_LABELS[selected.source] ?? selected.source],
                ["Fulfilment",  fulfillLabel(selected) ?? "—"],
                [selected.fulfillment_type === "delivery" ? "Delivery time" : "Pick-up", pickupText(selected) ?? "—"],
                ["Created",     new Date(selected.created_at).toLocaleString("en-AU", { dateStyle:"short", timeStyle:"short" })],
              ] as [string,string][]).map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:11, color:C.st, marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Delivery breakdown (only for delivery orders with a fee) */}
            {selected.fulfillment_type === "delivery" && (
              <div style={{ background:"rgba(0,173,130,.06)", border:"1px solid rgba(0,173,130,.15)", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.g, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:".4px", display:"flex", alignItems:"center", gap:6 }}><Icon name="delivery" size={14} />Delivery</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:C.st, marginBottom:2 }}>Address</div>
                    <div style={{ fontSize:12, color:"#fff" }}>
                      {selected.ship_to
                        ? ((selected.ship_to as any).address ?? JSON.stringify(selected.ship_to))
                        : "—"
                      }
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.st, marginBottom:2 }}>Delivery fee (customer)</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.g }}>
                      {selected.delivery_fee ? `$${Number(selected.delivery_fee).toFixed(2)}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* The customer's note */}
            {selected.notes && (
              <div style={{ background:"rgba(255,107,53,.08)", border:"1px solid rgba(255,107,53,.25)", borderRadius:10, padding:"10px 12px", marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.o, fontWeight:700, marginBottom:4 }}>Note</div>
                <div style={{ fontSize:13, color:"#fff", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{selected.notes}</div>
              </div>
            )}

            {/* Items list */}
            {Array.isArray(selected.items) && (selected.items as any[]).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.st, marginBottom:6, textTransform:"uppercase", letterSpacing:".4px" }}>Items</div>
                {(selected.items as any[]).map((it: any, idx: number) => (
                  <div key={idx} style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:12, color:"rgba(255,255,255,.7)", marginBottom:4 }}>
                    <span>
                      {it.name} × {it.qty ?? 1}
                      {Array.isArray(it.options) && it.options.length > 0 && (
                        <span style={{ display:"block", fontSize:11, color:C.st }}>{optionsLabel(it.options)}</span>
                      )}
                    </span>
                    <span>${(Number(it.price) * (it.qty ?? 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="zb-wrap" style={{ display:"flex", gap:8 }}>
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
