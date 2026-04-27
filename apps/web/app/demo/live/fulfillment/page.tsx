"use client";

// Demo fulfillment page — mirrors /apps/dashboard/app/fulfillment/page.tsx.
// Everything is local state so clicking around feels real but nothing persists.

import { useMemo, useState } from "react";
import {
  shipments as SEED_SHIPMENTS,
  shipmentCurrentStage,
  fulfillmentStageLabel,
  formatAUD,
  formatDateTime,
  timeAgo,
  type DemoShipment,
  type FulfillmentStage,
  type FulfillmentType,
} from "../data";

const STAGES: FulfillmentStage[] = ["placed", "picked", "packed", "shipped", "delivered"];

const NEXT_STAGE: Record<FulfillmentStage, FulfillmentStage | null> = {
  placed:    "picked",
  picked:    "packed",
  packed:    "shipped",
  shipped:   "delivered",
  delivered: null,
};

const STAMP_KEY: Record<FulfillmentStage, keyof DemoShipment> = {
  placed:    "placedAt",
  picked:    "pickedAt",
  packed:    "packedAt",
  shipped:   "shippedAt",
  delivered: "deliveredAt",
};

type TypeFilter = "all" | FulfillmentType;
type StageFilter = "open" | "all" | FulfillmentStage;

export default function DemoFulfillmentPage() {
  const [list, setList] = useState<DemoShipment[]>(SEED_SHIPMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("open");

  const typeScoped = useMemo(
    () => (typeFilter === "all" ? list : list.filter((s) => s.type === typeFilter)),
    [list, typeFilter]
  );

  const stats = useMemo(() => {
    const c = { placed: 0, picked: 0, packed: 0, shipped: 0, delivered: 0 };
    for (const s of typeScoped) c[shipmentCurrentStage(s)] += 1;
    return c;
  }, [typeScoped]);

  const filtered = useMemo(() => {
    if (stageFilter === "all") return typeScoped;
    if (stageFilter === "open") return typeScoped.filter((s) => !s.deliveredAt);
    return typeScoped.filter((s) => shipmentCurrentStage(s) === stageFilter);
  }, [typeScoped, stageFilter]);

  const selected = selectedId ? list.find((s) => s.id === selectedId) ?? null : null;

  function toggleStage(id: string, stage: FulfillmentStage) {
    const col = STAMP_KEY[stage];
    setList((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const isOn = Boolean(s[col]);
        return { ...s, [col]: isOn ? undefined : new Date().toISOString() };
      })
    );
  }

  function advance(id: string) {
    const target = list.find((s) => s.id === id);
    if (!target) return;
    const next = NEXT_STAGE[shipmentCurrentStage(target)];
    if (!next) return;
    toggleStage(id, next);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>E-commerce</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Fulfillment
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          Pick, pack, ship, deliver — every physical order on one checklist.
        </div>
      </div>

      {/* Type filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          { v: "all" as TypeFilter, label: "All" },
          { v: "shipping" as TypeFilter, label: "Shipping (multi-day)" },
          { v: "delivery" as TypeFilter, label: "Delivery (same-day)" },
        ]).map((t) => (
          <FilterChip key={t.v} label={t.label} active={typeFilter === t.v} onClick={() => setTypeFilter(t.v)} />
        ))}
      </div>

      {/* Stage stat row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        <StatChip label="Open" value={stats.placed + stats.picked + stats.packed + stats.shipped} icon="🟢" onClick={() => setStageFilter("open")} active={stageFilter === "open"} accent />
        <StatChip label="To pick" value={stats.placed} icon="🧾" onClick={() => setStageFilter("placed")} active={stageFilter === "placed"} />
        <StatChip label="To pack" value={stats.picked} icon="🛒" onClick={() => setStageFilter("picked")} active={stageFilter === "picked"} />
        <StatChip label="To ship" value={stats.packed} icon="📦" onClick={() => setStageFilter("packed")} active={stageFilter === "packed"} />
        <StatChip label="In transit" value={stats.shipped} icon="🚚" onClick={() => setStageFilter("shipped")} active={stageFilter === "shipped"} />
        <StatChip label="Delivered" value={stats.delivered} icon="✅" onClick={() => setStageFilter("delivered")} active={stageFilter === "delivered"} />
      </div>

      {/* Secondary stage scope pills (mostly redundant with the stat cards, but
          mirrors the CRM) */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <FilterChip label="Open only" active={stageFilter === "open"} onClick={() => setStageFilter("open")} />
        <FilterChip label="All stages" active={stageFilter === "all"} onClick={() => setStageFilter("all")} />
      </div>

      {/* Queue list */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 28,
              textAlign: "center",
              color: "var(--steel)",
              fontSize: 14,
              borderRadius: 14,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-9)",
            }}
          >
            {stageFilter === "open"
              ? "Nothing waiting — you're all caught up ✓"
              : "No orders at this stage"}
          </div>
        ) : (
          filtered.map((s) => {
            const stage = shipmentCurrentStage(s);
            const next = NEXT_STAGE[stage];
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="demo-fulfill-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 2.2fr) auto",
                  gap: 14,
                  padding: 16,
                  borderRadius: 14,
                  background: selectedId === s.id ? "rgba(0,182,122,0.08)" : "var(--navy-40)",
                  border: "1px solid var(--mist-9)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  alignItems: "center",
                  color: "inherit",
                }}
              >
                {/* Left — identity */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--steel)", marginBottom: 4 }}>
                    {s.number}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--cloud)", fontWeight: 700 }}>
                    {s.customerName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 3 }}>
                    {s.shipTo.suburb}, {s.shipTo.state} {s.shipTo.postcode} · {formatAUD(s.total)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <TypeBadge type={s.type} />
                    {s.carrier && (
                      <span style={{ fontSize: 11, color: "var(--steel)" }}>· {s.carrier}</span>
                    )}
                  </div>
                </div>

                {/* Middle — checklist pips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
                  {STAGES.map((st, i) => {
                    const ts = s[STAMP_KEY[st]] as string | undefined;
                    const on = Boolean(ts);
                    const isCurrent = stage === st && !s.deliveredAt;
                    return (
                      <span
                        key={st}
                        onClick={(e) => { e.stopPropagation(); toggleStage(s.id, st); }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: `1px solid ${on ? "var(--green)" : "var(--mist-9)"}`,
                          background: on
                            ? "rgba(0,182,122,0.12)"
                            : isCurrent
                            ? "rgba(245,158,11,0.1)"
                            : "transparent",
                          color: on
                            ? "var(--green)"
                            : isCurrent
                            ? "#F59E0B"
                            : "var(--steel)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={ts ? new Date(ts).toLocaleString() : fulfillmentStageLabel[st].label}
                      >
                        <span aria-hidden>{on ? "✓" : i + 1}</span>
                        {fulfillmentStageLabel[st].label}
                      </span>
                    );
                  })}
                </div>

                {/* Right — advance */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {next ? (
                    <span
                      onClick={(e) => { e.stopPropagation(); advance(s.id); }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--green)",
                        color: "var(--navy)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Mark {fulfillmentStageLabel[next].label}
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--steel)",
                        background: "rgba(107,124,147,0.14)",
                      }}
                    >
                      Delivered
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <ShipmentDrawer
          shipment={selected}
          onClose={() => setSelectedId(null)}
          onToggleStage={(stage) => toggleStage(selected.id, stage)}
          onAdvance={() => advance(selected.id)}
        />
      )}

      <style>{`
        @media (max-width: 820px) {
          .demo-fulfill-row {
            grid-template-columns: 1fr !important;
          }
          .demo-fulfill-row > :last-child {
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function ShipmentDrawer({
  shipment,
  onClose,
  onToggleStage,
  onAdvance,
}: {
  shipment: DemoShipment;
  onClose: () => void;
  onToggleStage: (stage: FulfillmentStage) => void;
  onAdvance: () => void;
}) {
  const stage = shipmentCurrentStage(shipment);
  const next = NEXT_STAGE[stage];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 70,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 40,
          bottom: 0,
          right: 0,
          width: "min(480px, 96vw)",
          background: "var(--near-black)",
          borderLeft: "1px solid var(--mist-9)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--mist-9)",
            position: "sticky",
            top: 0,
            background: "var(--near-black)",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12 }}>
              {shipment.number}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20, color: "var(--cloud)" }}>
              {shipment.customerName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--mist-9)",
              color: "var(--steel)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 22 }}>
          {/* Meta */}
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Placed" value={formatDateTime(shipment.placedAt)} />
            <Row label="Ship to" value={`${shipment.shipTo.street}, ${shipment.shipTo.suburb} ${shipment.shipTo.state} ${shipment.shipTo.postcode}`} />
            <Row label="Total" value={formatAUD(shipment.total)} />
            <Row label="Carrier" value={shipment.carrier ?? "—"} />
            <Row label="Tracking" value={shipment.trackingNumber ?? "—"} mono />
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
              Timeline
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {STAGES.map((st) => {
                const ts = shipment[STAMP_KEY[st]] as string | undefined;
                const on = Boolean(ts);
                const label = fulfillmentStageLabel[st];
                return (
                  <div
                    key={st}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: on ? "rgba(0,182,122,0.08)" : "var(--navy-40)",
                      border: `1px solid ${on ? "rgba(0,182,122,0.3)" : "var(--mist-9)"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: on ? "var(--green)" : "rgba(107,124,147,0.2)",
                        color: on ? "var(--navy)" : "var(--steel)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {on ? "✓" : label.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 700 }}>
                        {label.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--steel)" }}>
                        {ts ? `${new Date(ts).toLocaleString()} · ${timeAgo(ts)}` : "Pending"}
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleStage(st)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        background: "rgba(15,25,42,0.6)",
                        border: "1px solid var(--mist-9)",
                        color: "var(--cloud)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {on ? "Undo" : "Mark"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
              Items
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {shipment.items.map((i, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-9)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 700 }}>{i.qty}×</div>
                  <div style={{ color: "var(--cloud)", fontSize: 14 }}>{i.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "grid", gap: 8 }}>
            {next && (
              <button
                onClick={onAdvance}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--green)",
                  color: "var(--navy)",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                → Mark {fulfillmentStageLabel[next].label}
              </button>
            )}
            <DemoButton label="Email tracking link to customer" icon="📧" />
            <DemoButton label="Print shipping label" icon="🖨️" />
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "var(--green)" : "rgba(15,25,42,0.6)",
        color: active ? "var(--navy)" : "var(--steel)",
        border: active ? "1px solid var(--green)" : "1px solid var(--mist-9)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function StatChip({
  label, value, icon, active, accent, onClick,
}: {
  label: string;
  value: number;
  icon: string;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: active
          ? "rgba(0,182,122,0.12)"
          : "var(--navy-40)",
        border: `1px solid ${active ? "rgba(0,182,122,0.35)" : "var(--mist-9)"}`,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "var(--steel)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 14 }}>{icon}</div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 800,
          fontSize: 24,
          color: accent ? "var(--green)" : "var(--cloud)",
        }}
      >
        {value}
      </div>
    </button>
  );
}

function TypeBadge({ type }: { type: FulfillmentType }) {
  const s = type === "shipping"
    ? { label: "Shipping", bg: "rgba(168,85,247,0.12)", color: "#A855F7" }
    : { label: "Delivery", bg: "rgba(99,179,255,0.12)", color: "#63B3FF" };
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, gap: 16 }}>
      <span style={{ color: "var(--steel)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: "var(--cloud)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          textAlign: "right",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DemoButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          const el = document.createElement("div");
          el.textContent = `Demo: "${label}" triggered (nothing actually sent).`;
          el.style.cssText =
            "position:fixed;bottom:24px;right:24px;padding:12px 16px;border-radius:10px;background:var(--navy-40);border:1px solid var(--mist-9);color:var(--cloud);font-size:13px;z-index:999;box-shadow:0 12px 40px rgba(0,0,0,.4);";
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 2400);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(15,25,42,0.55)",
        border: "1px solid var(--mist-9)",
        color: "var(--cloud)",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%",
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
