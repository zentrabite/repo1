"use client";

import { useState, useEffect, useRef } from "react";
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
import { docketHtml, printDocument } from "@/lib/docket";
import { orderAlarm, setSoundPreferred, soundPreferred } from "@/lib/order-alarm";
import { money, netTotal, paidByStripe, refundLeft, refundedOf } from "@/lib/refunds";
import RefundPanel from "@/components/refund-panel";

// Only orders this recent ring. An old order nobody accepted still shows in
// the waiting list, but doesn't ring every time the page opens.
const RING_FOR_MS = 6 * 60 * 60_000;

const C = { g:"#00AD82", o:"#FF6B35", r:"#DC3545", st:"#6B7C93" };

type SourceFilter = "All" | "direct" | "uber_eats" | "menulog" | "pos";
type FulfillFilter = "All" | "delivery";

const SOURCE_FILTERS: SourceFilter[] = ["All","direct","uber_eats","menulog","pos"];
const SOURCE_LABELS: Record<string, string> = {
  All:"All", direct:"Direct", uber_eats:"Uber Eats", menulog:"Menulog", pos:"POS",
};
const FULFILL_ICON: Record<string, IconName> = { delivery:"delivery", takeaway:"takeaway", dine_in:"dine-in", pickup:"takeaway" };
// The next step for an order, and its button. Other statuses (paid at the
// counter, Refunded) have no next step.
const NEXT_STATUS: Record<string, string> = { New:"Preparing", Preparing:"Ready", Ready:"Delivered" };
const NEXT_LABEL:  Record<string, string> = { New:"Accept", Preparing:"Mark Ready", Ready:"Deliver" };

export default function OrdersPage() {
  const { toast, show } = useToast();
  const { businessId, business, role, isSuperAdmin } = useBusiness();
  // Giving money back is for owners and managers. The route checks this too.
  const canRefund = isSuperAdmin || role === "Owner" || role === "Manager";

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

  // ── New-order sound and docket ──────────────────────────────────────────
  // While an online order waits to be accepted, a chime repeats and the tab
  // title says so. Accepting moves it to Preparing, which stops the chime.
  const [soundOn,      setSoundOn]      = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [now,          setNow]          = useState(() => Date.now());
  const baseTitle = useRef<string | null>(null);

  const waiting = orders
    .filter(o => o.status === "New")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ringing = waiting.filter(o => now - new Date(o.created_at).getTime() < RING_FOR_MS);

  // Read the device's choice after the page loads (it's in this browser only).
  useEffect(() => {
    const on = soundPreferred();
    if (!on) setSoundOn(false);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!soundOn || ringing.length === 0) { orderAlarm.stop(); return; }
    let cancelled = false;
    orderAlarm.start().then(ok => { if (!cancelled) setSoundBlocked(!ok); });
    return () => { cancelled = true; };
  }, [soundOn, ringing.length]);

  // The browser wants one click before it makes sound. Any click will do.
  useEffect(() => {
    if (!soundBlocked) return;
    const retry = () => { orderAlarm.start().then(ok => setSoundBlocked(!ok)); };
    document.addEventListener("pointerdown", retry);
    return () => document.removeEventListener("pointerdown", retry);
  }, [soundBlocked]);

  // Stop the chime when leaving the page.
  useEffect(() => () => orderAlarm.stop(), []);

  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title;
    document.title = waiting.length
      ? `(${waiting.length}) New order${waiting.length === 1 ? "" : "s"} · ${baseTitle.current}`
      : baseTitle.current;
  }, [waiting.length]);
  useEffect(() => () => { if (baseTitle.current !== null) document.title = baseTitle.current; }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundPreferred(next);
    if (!next) orderAlarm.stop();
    show(next ? "Order sound on" : "Order sound off");
  };

  const accept = async (order: Order) => {
    try {
      await updateOrderStatus(order.id, "Preparing");
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Preparing" } : o));
      show("Accepted ✓");
    } catch { show("Couldn't accept the order. Try again."); }
  };

  const printDocket = async (order: Order) => {
    let customer: { name?: string | null; phone?: string | null } | null = null;
    if (order.customer_id) {
      const { data } = await supabase.from("customers").select("name, phone").eq("id", order.customer_id).maybeSingle();
      customer = data as typeof customer;
    }
    printDocument(docketHtml({ order, businessName: business?.name ?? "Order", timezone: rules.timezone, customer }));
  };

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
          setNow(Date.now());
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
          setSelected(s => s && s.id === updated.id ? updated : s);
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
  const totalRev       = filtered.reduce((a, o) => a + netTotal(o), 0); // less refunds
  const totalFees      = deliveryOrders.reduce((a, o) => a + (o.delivery_fee ?? 0), 0);
  const totalOrders    = filtered.length;

  // ── Status advance ──────────────────────────────────────────────────────
  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await updateOrderStatus(order.id, next);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    show(`→ ${next}`);
    setSelected(null);
  };

  // ── Refunds ─────────────────────────────────────────────────────────────
  // Online card orders only (components/refund-panel.tsx). The order and the
  // customer's totals update.
  const [refundOpen, setRefundOpen] = useState(false);

  const openOrder = (o: Order | null) => { setSelected(o); setRefundOpen(false); };

  const refunded = (order: Order, patch: Partial<Order>, message: string) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...patch } : o));
    setSelected(s => s && s.id === order.id ? { ...s, ...patch } : s);
    setRefundOpen(false);
    show(message);
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
          <button className="bg-btn" onClick={toggleSound} aria-pressed={soundOn} title="The chime that repeats until a new order is accepted. Set on each device.">
            <Icon name="bell" size={14} />{soundOn ? "Order sound on" : "Order sound off"}
          </button>
          <button className="bg-btn" onClick={togglePause} disabled={pausing || !businessId} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} size={14} />{paused ? "Turn online orders back on" : "Pause online orders"}
          </button>
          <button className="bp" onClick={() => show("Exported ✓")}>Export</button>
        </div>
      </div>

      {/* Orders waiting to be accepted */}
      {waiting.length > 0 && (
        <div className="gc" style={{ padding:"12px 16px", marginBottom:12, border:"1px solid rgba(0,173,130,.4)", background:"rgba(0,173,130,.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, color:"#fff", fontSize:14, marginBottom:8 }}>
            <Icon name="bell" size={16} />
            {waiting.length === 1 ? "1 new order to accept" : `${waiting.length} new orders to accept`}
          </div>
          {soundOn && soundBlocked && ringing.length > 0 && (
            <div style={{ fontSize:12, color:C.o, marginBottom:8 }}>Click anywhere on this page to turn the order sound on. Browsers need one click first.</div>
          )}
          {waiting.slice(0, 4).map(o => (
            <div key={o.id} className="zb-wrap" style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderTop:"1px solid rgba(255,255,255,.06)" }}>
              <div style={{ flex:1, minWidth:0, fontSize:13, color:"#fff" }}>
                <b>${Number(o.total).toFixed(2)}</b>
                <span style={{ color:C.st }}> · {fulfillLabel(o) ?? "Order"}{pickupText(o) ? ` ${pickupText(o)}` : ""} · {Array.isArray(o.items) ? `${(o.items as unknown[]).length} item(s)` : ""}</span>
                {o.notes && <span style={{ color:C.o }}> · Note</span>}
              </div>
              <button className="bg-btn" onClick={() => printDocket(o)}><Icon name="printer" size={14} />Print</button>
              <button className="bp" onClick={() => accept(o)}>Accept</button>
            </div>
          ))}
          {waiting.length > 4 && <div style={{ fontSize:12, color:C.st, paddingTop:6 }}>And {waiting.length - 4} more below.</div>}
        </div>
      )}

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
              <tr key={i} onClick={() => openOrder(o)}>
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
                <td data-first style={{ fontWeight:600, color:"#fff" }}>
                  ${Number(o.total).toFixed(2)}
                  {refundedOf(o) > 0 && <span style={{ display:"block", fontSize:11, fontWeight:500, color:C.r }}>−{money(refundedOf(o))} refunded</span>}
                </td>
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
      <Modal open={!!selected} onClose={() => openOrder(null)} title={selected ? `Order ${selected.id.slice(0,8)}…` : ""}>
        {selected && (
          <div>
            {/* Core fields */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              {([
                ["Total",       `$${Number(selected.total).toFixed(2)}`],
                ...(Number(selected.discount) > 0 ? [["First order offer", `-$${Number(selected.discount).toFixed(2)}`]] : []),
                ["Status",      selected.status],
                ["Source",      SOURCE_LABELS[selected.source] ?? selected.source],
                ["Fulfilment",  fulfillLabel(selected) ?? "—"],
                [selected.fulfillment_type === "delivery" ? "Delivery time" : "Pick-up", pickupText(selected) ?? "—"],
                ["Created",     new Date(selected.created_at).toLocaleString("en-AU", { dateStyle:"short", timeStyle:"short" })],
                ...(refundedOf(selected) > 0 ? [[
                  "Refunded",
                  `${money(refundedOf(selected))}${refundLeft(selected) > 0 ? ` of ${money(Number(selected.total))}` : ""}${selected.refunded_at ? `, ${new Date(selected.refunded_at).toLocaleDateString("en-AU", { day:"numeric", month:"short" })}` : ""}`,
                ]] : []),
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

            {selected.status === "Refund failed" && (
              <div style={{ background:"rgba(255,107,53,.08)", border:"1px solid rgba(255,107,53,.25)", borderRadius:10, padding:"10px 12px", marginBottom:14, fontSize:13, color:"#fff", lineHeight:1.5 }}>
                This refund failed, so the money is back in your Stripe balance and the customer hasn&apos;t got it. Your Stripe Dashboard says why. Pay them back another way, or try the refund again.
              </div>
            )}

            {refundOpen && businessId && (
              <RefundPanel
                order={selected}
                businessId={businessId}
                onRefunded={(patch, message) => refunded(selected, patch, message)}
                onCancel={() => setRefundOpen(false)}
              />
            )}

            {/* Actions */}
            <div className="zb-wrap" style={{ display:"flex", gap:8 }}>
              {NEXT_LABEL[selected.status] && (
                <button className="bp" onClick={() => advance(selected)}>
                  → {NEXT_LABEL[selected.status]}
                </button>
              )}
              <button className="bg-btn" onClick={() => printDocket(selected)}><Icon name="printer" size={14} />Print docket</button>
              {canRefund && paidByStripe(selected) && refundLeft(selected) > 0 && !refundOpen && (
                <button className="bg-btn" onClick={() => setRefundOpen(true)}>
                  <Icon name="card" size={14} />Refund
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
