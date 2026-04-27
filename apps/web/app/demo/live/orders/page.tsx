"use client";

import { useMemo, useState } from "react";
import {
  ordersByRecent,
  orderById,
  channelLabel,
  statusLabel,
  formatAUD,
  formatDateTime,
  formatTime,
  timeAgo,
  type OrderStatus,
} from "../data";

const ALL_STATUSES: OrderStatus[] = ["new", "cooking", "ready", "out", "delivered"];

export default function DemoOrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return ordersByRecent.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !o.customerName.toLowerCase().includes(q) &&
          !o.number.toLowerCase().includes(q) &&
          !o.items.some((i) => i.name.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [filter, query]);

  const selected = selectedId ? orderById[selectedId] ?? null : null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Operations</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Orders
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          {filtered.length} of {ordersByRecent.length} orders · live feed from every channel
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: 14,
          borderRadius: 12,
          background: "var(--navy-40)",
          border: "1px solid var(--mist-6)",
        }}
      >
        <input
          type="text"
          placeholder="Search orders, customers, items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--mist-9)",
            background: "rgba(15,25,42,0.55)",
            color: "var(--cloud)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          {ALL_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={statusLabel[s].label}
              active={filter === s}
              color={statusLabel[s].color}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 14,
          background: "var(--navy-40)",
          border: "1px solid var(--mist-6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1.3fr 1.4fr 110px 110px 110px 120px",
            gap: 10,
            padding: "12px 16px",
            fontSize: 11,
            color: "var(--steel)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
            borderBottom: "1px solid var(--mist-9)",
            background: "rgba(15,25,42,0.45)",
          }}
        >
          <div>Order</div>
          <div>Customer</div>
          <div>Items</div>
          <div>Channel</div>
          <div style={{ textAlign: "right" }}>Total</div>
          <div>Time</div>
          <div>Status</div>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 28, textAlign: "center", color: "var(--steel)", fontSize: 14 }}>
            No orders match those filters.
          </div>
        )}

        {filtered.map((o, i) => {
          const s = statusLabel[o.status];
          const isSelected = selectedId === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1.3fr 1.4fr 110px 110px 110px 120px",
                gap: 10,
                padding: "14px 16px",
                background: isSelected ? "rgba(0,182,122,0.08)" : i % 2 ? "transparent" : "rgba(15,25,42,0.22)",
                borderBottom: "1px solid var(--mist-9)",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                alignItems: "center",
                fontFamily: "inherit",
                color: "inherit",
              }}
              className="demo-order-row"
            >
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12.5 }}>{o.number}</div>
              <div>
                <div style={{ color: "var(--cloud)", fontWeight: 600, fontSize: 14 }}>{o.customerName}</div>
                <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>{timeAgo(o.placedAt)}</div>
              </div>
              <div style={{ color: "var(--steel)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.items.map((it) => `${it.qty}× ${it.name}`).join(" · ")}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--cloud)", fontFamily: "var(--font-mono)" }}>{channelLabel[o.channel]}</div>
              <div style={{ textAlign: "right", fontFamily: "var(--font-outfit)", fontWeight: 700, color: "var(--cloud)", fontSize: 14 }}>
                {formatAUD(o.total)}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--steel)" }}>{formatTime(o.placedAt)}</div>
              <div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    color: s.color,
                    background: s.bg,
                    display: "inline-block",
                  }}
                >
                  {s.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selected && <OrderDrawer orderId={selected.id} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function FilterChip({
  label,
  active,
  color = "var(--steel)",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "var(--green)" : "rgba(15,25,42,0.6)",
        color: active ? "var(--navy)" : color,
        border: active ? "1px solid var(--green)" : "1px solid var(--mist-9)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function OrderDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(orderById[orderId]!.status);
  const o = orderById[orderId]!;
  const s = statusLabel[status];

  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    new: "cooking",
    cooking: "ready",
    ready: "out",
    out: "delivered",
    delivered: null,
    cancelled: null,
  };
  const next = nextStatus[status];

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
          width: "min(460px, 96vw)",
          background: "var(--near-black)",
          borderLeft: "1px solid var(--mist-9)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
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
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12 }}>{o.number}</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20, color: "var(--cloud)" }}>
              {o.customerName}
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
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 20 }}>
          {/* Meta */}
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Placed" value={formatDateTime(o.placedAt)} />
            <Row label="Channel" value={channelLabel[o.channel]} />
            {o.deliveryEta && <Row label="Delivery ETA" value={o.deliveryEta} highlight />}
            {o.notes && <Row label="Notes" value={o.notes} />}
          </div>

          {/* Status */}
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
              Status
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                color: s.color,
                background: s.bg,
                border: `1px solid ${s.color}33`,
              }}
            >
              {s.label}
            </div>
            {next && (
              <button
                onClick={() => setStatus(next)}
                style={{
                  marginLeft: 10,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "var(--green)",
                  color: "var(--navy)",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Mark {statusLabel[next].label} →
              </button>
            )}
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
              Items
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {o.items.map((i, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr auto",
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
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 13 }}>{formatAUD(i.qty * i.price)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-9)",
              display: "grid",
              gap: 6,
            }}
          >
            <Row label="Subtotal" value={formatAUD(o.subtotal)} mono />
            <Row label="Stripe fee" value={formatAUD(o.fees)} mono muted />
            {o.tip > 0 && <Row label="Tip" value={formatAUD(o.tip)} mono muted />}
            <div style={{ height: 1, background: "var(--mist-9)", margin: "4px 0" }} />
            <Row label="Total" value={formatAUD(o.total)} mono bold />
          </div>

          {/* Actions */}
          <div style={{ display: "grid", gap: 8 }}>
            <DemoButton label="Send order-ready SMS" icon="💬" />
            <DemoButton label="Print kitchen ticket" icon="🖨" />
            <DemoButton label="Refund order" icon="↩" destructive />
          </div>
        </div>
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  highlight = false,
  mono = false,
  muted = false,
  bold = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, alignItems: "baseline" }}>
      <span style={{ color: "var(--steel)" }}>{label}</span>
      <span
        style={{
          color: highlight ? "var(--green)" : muted ? "var(--steel)" : "var(--cloud)",
          fontWeight: bold ? 700 : 500,
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          fontSize: bold ? 15 : 13.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DemoButton({ label, icon, destructive = false }: { label: string; icon: string; destructive?: boolean }) {
  return (
    <button
      onClick={() => {
        // Demo: no-op — just a visual nudge.
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
        background: destructive ? "rgba(255,90,90,0.06)" : "rgba(15,25,42,0.55)",
        border: `1px solid ${destructive ? "rgba(255,90,90,0.3)" : "var(--mist-9)"}`,
        color: destructive ? "#FF5A5A" : "var(--cloud)",
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
