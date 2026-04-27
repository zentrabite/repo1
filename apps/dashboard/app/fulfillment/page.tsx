"use client";

// ─── Fulfillment tracking ────────────────────────────────────────────────────
// Picked → packed → shipped → delivered pipeline for physical goods.
// This is the e-commerce companion to /orders, which is the kitchen lane.
//
// Staff work this page from the top — each order card shows the next open
// step as a single big button. Tapping it stamps the timestamp and moves
// the order along. Tracking number + carrier can be typed inline.

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";
import Badge from "@/components/badge";
import PageHeader from "@/components/page-header";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getFulfillmentOrders,
  stampFulfillment,
  updateTracking,
  currentStage,
  FULFILLMENT_STAGES,
  type FulfillmentStage,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/database.types";

const C = { g: "#00B67A", o: "#FF6B35", r: "#DC3545", st: "#6B7C93", mist: "#E2E8F0" };

const STAGE_LABEL: Record<FulfillmentStage, string> = {
  placed:    "Placed",
  picked:    "Picked",
  packed:    "Packed",
  shipped:   "Shipped",
  delivered: "Delivered",
};

const STAGE_EMOJI: Record<FulfillmentStage, string> = {
  placed:    "🧾",
  picked:    "🛒",
  packed:    "📦",
  shipped:   "🚚",
  delivered: "✅",
};

const NEXT_STAGE: Record<FulfillmentStage, FulfillmentStage | null> = {
  placed:    "picked",
  picked:    "packed",
  packed:    "shipped",
  shipped:   "delivered",
  delivered: null,
};

// Typed accessor: `stampAt(order, "picked")` returns order.picked_at.
function stampAt(order: Order, stage: FulfillmentStage): string | null {
  switch (stage) {
    case "placed":    return order.placed_at;
    case "picked":    return order.picked_at;
    case "packed":    return order.packed_at;
    case "shipped":   return order.shipped_at;
    case "delivered": return order.delivered_at;
  }
}

const TYPE_FILTERS: ("all" | "shipping" | "delivery")[] = ["all", "shipping", "delivery"];
const TYPE_LABEL: Record<string, string> = { all: "All", shipping: "Shipping", delivery: "Delivery" };

export default function FulfillmentPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [orders,   setOrders]   = useState<Order[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "shipping" | "delivery">("all");
  const [stageFilter, setStageFilter] = useState<FulfillmentStage | "open" | "all">("open");
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Local form state for the tracking inputs in the modal.
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    getFulfillmentOrders(businessId, { type: typeFilter })
      .then((data) => { if (!cancelled) { setOrders(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });

    // Realtime — any update to orders for this business refreshes the row.
    const channel = supabase
      .channel(`fulfillment:${businessId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `business_id=eq.${businessId}` },
        (payload: any) => {
          const updated = payload.new as Order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `business_id=eq.${businessId}` },
        (payload: any) => {
          const newOrder = payload.new as Order;
          const type = newOrder.fulfillment_type;
          if (type !== "shipping" && type !== "delivery") return;
          if (typeFilter !== "all" && type !== typeFilter) return;
          setOrders((prev) => (prev.some((o) => o.id === newOrder.id) ? prev : [newOrder, ...prev]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [businessId, typeFilter]);

  // When an order is selected, prefill the tracking form.
  useEffect(() => {
    setCarrier(selected?.carrier ?? "");
    setTrackingNumber(selected?.tracking_number ?? "");
    setTrackingUrl(selected?.tracking_url ?? "");
  }, [selected]);

  // Derived — orders filtered by stage.
  const filtered = useMemo(() => {
    if (stageFilter === "all") return orders;
    if (stageFilter === "open") return orders.filter((o) => !o.delivered_at);
    return orders.filter((o) => currentStage(o) === stageFilter);
  }, [orders, stageFilter]);

  // Stat counts across all (typeFilter-scoped) orders, not further narrowed by stage.
  const stats = useMemo(() => {
    const c = { placed: 0, picked: 0, packed: 0, shipped: 0, delivered: 0 };
    for (const o of orders) c[currentStage(o)] += 1;
    return c;
  }, [orders]);

  async function advance(order: Order) {
    const next = NEXT_STAGE[currentStage(order)];
    if (!next) return;
    setSaving(true);
    try {
      const updated = await stampFulfillment(order.id, next, true);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selected?.id === order.id) setSelected(updated);
      show(`→ ${STAGE_LABEL[next]}`);
    } catch {
      show("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStage(order: Order, stage: FulfillmentStage) {
    // Clicking the current completed stage un-stamps it; otherwise stamps.
    const isOn = Boolean(stampAt(order, stage));
    setSaving(true);
    try {
      const updated = await stampFulfillment(order.id, stage, !isOn);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selected?.id === order.id) setSelected(updated);
    } catch {
      show("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  async function saveTracking() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateTracking(selected.id, {
        carrier: carrier.trim() || null,
        tracking_number: trackingNumber.trim() || null,
        tracking_url: trackingUrl.trim() || null,
      });
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? updated : o)));
      setSelected(updated);
      show("Tracking saved ✓");
    } catch {
      show("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fulfillment"
        subtitle="Pick, pack, ship & track every physical order end to end"
      />

      {/* Type filter */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            className={`bg-btn ${typeFilter === t ? "on" : ""}`}
            onClick={() => setTypeFilter(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Stage stat cards — clicking filters the list */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div onClick={() => setStageFilter("open")} style={{ cursor: "pointer" }}>
          <StatCard label="Open" value={String(stats.placed + stats.picked + stats.packed + stats.shipped)} icon="🟢" accent />
        </div>
        <div onClick={() => setStageFilter("placed")} style={{ cursor: "pointer" }}>
          <StatCard label="To pick" value={String(stats.placed)} icon="🧾" delay={50} />
        </div>
        <div onClick={() => setStageFilter("picked")} style={{ cursor: "pointer" }}>
          <StatCard label="To pack" value={String(stats.picked)} icon="🛒" delay={100} />
        </div>
        <div onClick={() => setStageFilter("packed")} style={{ cursor: "pointer" }}>
          <StatCard label="To ship" value={String(stats.packed)} icon="📦" delay={150} />
        </div>
        <div onClick={() => setStageFilter("shipped")} style={{ cursor: "pointer" }}>
          <StatCard label="In transit" value={String(stats.shipped)} icon="🚚" delay={200} />
        </div>
        <div onClick={() => setStageFilter("delivered")} style={{ cursor: "pointer" }}>
          <StatCard label="Delivered" value={String(stats.delivered)} icon="✅" delay={250} />
        </div>
      </div>

      {/* Stage scope pills */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        <button className={`bg-btn ${stageFilter === "open" ? "on" : ""}`} onClick={() => setStageFilter("open")}>
          Open
        </button>
        <button className={`bg-btn ${stageFilter === "all" ? "on" : ""}`} onClick={() => setStageFilter("all")}>
          All
        </button>
        {FULFILLMENT_STAGES.map((s) => (
          <button key={s} className={`bg-btn ${stageFilter === s ? "on" : ""}`} onClick={() => setStageFilter(s)}>
            {STAGE_EMOJI[s]} {STAGE_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Card list — one row per order with the checklist inline */}
      <div style={{ display: "grid", gap: 10 }}>
        {loading ? (
          <div className="gc" style={{ padding: 18, color: C.st, textAlign: "center" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="gc" style={{ padding: 24, color: C.st, textAlign: "center" }}>
            {stageFilter === "open"
              ? "Nothing waiting — you're all caught up ✓"
              : "No orders at this stage"}
          </div>
        ) : (
          filtered.map((o) => {
            const stage = currentStage(o);
            const next = NEXT_STAGE[stage];
            return (
              <div
                key={o.id}
                className="gc"
                style={{ padding: 16, cursor: "pointer" }}
                onClick={() => setSelected(o)}
              >
                <div
                  className="fulfill-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 2fr) auto",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {/* Left — identity */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: C.st, marginBottom: 4 }}>
                      #{o.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 3 }}>
                      ${o.total?.toLocaleString?.() ?? o.total}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge type={o.fulfillment_type === "shipping" ? "Marketplace" : "Direct"}>
                        {o.fulfillment_type === "shipping" ? "Shipping" : "Delivery"}
                      </Badge>
                      {o.carrier && <span style={{ fontSize: 11, color: C.st }}>· {o.carrier}</span>}
                    </div>
                  </div>

                  {/* Middle — checklist pips */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    {FULFILLMENT_STAGES.map((s, i) => {
                      const ts = stampAt(o, s);
                      const on = Boolean(ts);
                      const isCurrent = stage === s && !o.delivered_at;
                      return (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); toggleStage(o, s); }}
                          disabled={saving}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${on ? C.g : "rgba(226,232,240,.14)"}`,
                            background: on
                              ? "rgba(0,182,122,.12)"
                              : isCurrent
                              ? "rgba(245,158,11,.1)"
                              : "transparent",
                            color: on ? C.g : isCurrent ? "#F59E0B" : C.st,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: saving ? "wait" : "pointer",
                            fontFamily: "var(--font-inter)",
                            whiteSpace: "nowrap",
                          }}
                          title={ts ? new Date(ts).toLocaleString() : STAGE_LABEL[s]}
                        >
                          <span aria-hidden>{on ? "✓" : i + 1}</span>
                          {STAGE_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right — next-stage button */}
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {next ? (
                      <button
                        className="bp"
                        disabled={saving}
                        onClick={(e) => { e.stopPropagation(); advance(o); }}
                      >
                        Mark {STAGE_LABEL[next]}
                      </button>
                    ) : (
                      <Badge type="Delivered">Delivered</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order detail modal — full timeline + editable tracking */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Order ${selected.id.slice(0, 8)}…` : ""}
      >
        {selected && (
          <div>
            {/* Summary grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["Total",       `$${selected.total}`],
                ["Type",        selected.fulfillment_type ?? "—"],
                ["Placed",      selected.placed_at ? new Date(selected.placed_at).toLocaleString() : "—"],
                ["Last update", lastUpdateLabel(selected)],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <div style={{ fontSize: 11, color: C.st, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Vertical timeline */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: C.st, marginBottom: 8, fontWeight: 600 }}>
                TIMELINE
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {FULFILLMENT_STAGES.map((s) => {
                  const ts = stampAt(selected, s);
                  const on = Boolean(ts);
                  return (
                    <div
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: on ? "rgba(0,182,122,.08)" : "rgba(28,45,72,.35)",
                        border: `1px solid ${on ? "rgba(0,182,122,.3)" : "rgba(226,232,240,.08)"}`,
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          background: on ? C.g : "rgba(107,124,147,.2)",
                          color: on ? "#fff" : C.st,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {on ? "✓" : STAGE_EMOJI[s]}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                          {STAGE_LABEL[s]}
                        </div>
                        <div style={{ fontSize: 11, color: C.st }}>
                          {ts ? new Date(ts).toLocaleString() : "Pending"}
                        </div>
                      </div>
                      <button
                        className="bg-btn"
                        disabled={saving}
                        onClick={() => toggleStage(selected, s)}
                        style={{ padding: "5px 10px", fontSize: 11 }}
                      >
                        {on ? "Undo" : "Mark"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tracking inputs */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: C.st, marginBottom: 8, fontWeight: 600 }}>
                TRACKING
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <LabeledInput label="Carrier" placeholder="Auspost / Sendle / DHL" value={carrier} onChange={setCarrier} />
                <LabeledInput label="Tracking #" placeholder="e.g. VC123456789AU" value={trackingNumber} onChange={setTrackingNumber} />
              </div>
              <LabeledInput label="Tracking URL" placeholder="https://…" value={trackingUrl} onChange={setTrackingUrl} />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="bp" disabled={saving} onClick={saveTracking}>
                Save tracking
              </button>
              {NEXT_STAGE[currentStage(selected)] && (
                <button
                  className="bg-btn"
                  disabled={saving}
                  onClick={() => advance(selected)}
                >
                  → Mark {STAGE_LABEL[NEXT_STAGE[currentStage(selected)]!]}
                </button>
              )}
              {selected.tracking_url && (
                <a
                  href={selected.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-btn"
                  style={{ textDecoration: "none" }}
                >
                  Open tracking ↗
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />

      <style>{`
        @media (max-width: 720px) {
          .fulfill-row {
            grid-template-columns: 1fr !important;
            align-items: flex-start !important;
          }
          .fulfill-row > div:last-child {
            justify-content: flex-start !important;
            width: 100%;
          }
          .fulfill-row > div:last-child .bp { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lastUpdateLabel(o: Order): string {
  const stamps: [string, string | null][] = [
    ["Delivered", o.delivered_at],
    ["Shipped",   o.shipped_at],
    ["Packed",    o.packed_at],
    ["Picked",    o.picked_at],
    ["Placed",    o.placed_at],
  ];
  const hit = stamps.find(([, ts]) => ts);
  return hit && hit[1] ? `${hit[0]} · ${new Date(hit[1]).toLocaleString()}` : "—";
}

function LabeledInput({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, color: "#6B7C93", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 8,
          background: "rgba(28,45,72,.45)",
          border: "1px solid rgba(226,232,240,.1)",
          color: "#F8FAFB",
          fontSize: 13,
          fontFamily: "var(--font-inter)",
          outline: "none",
        }}
      />
    </label>
  );
}
