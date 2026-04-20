"use client";

import { useState } from "react";
import Link from "next/link";
import {
  drivers,
  driverStatusLabel,
  driverTypeLabel,
  deliveryToday,
  orderById,
  formatAUD,
  type DemoDriver,
} from "../data";

function toast(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: rgba(0,182,122,0.94); color: #0F1F2D;
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function DriversPage() {
  const [filter, setFilter] = useState<"all" | "in_house" | "uber_direct" | "tasker">("all");
  const filtered = filter === "all" ? drivers : drivers.filter((d) => d.type === filter);
  const activeDrivers = drivers.filter((d) => d.status !== "idle").length;
  const idleDrivers = drivers.filter((d) => d.status === "idle").length;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Drivers & delivery
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            AI dispatcher routes each order to your cheapest option that still hits the ETA.
          </p>
        </div>
        <button
          onClick={() => toast("Dispatcher would suggest 2 tasker jobs (demo)")}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "var(--green)",
            color: "var(--navy)",
            border: "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          Re-optimise routes
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}
      >
        <StatBox label="Deliveries today" value={String(deliveryToday.totalDeliveries)} sub={`${activeDrivers} active · ${idleDrivers} idle`} />
        <StatBox label="Avg delivery time" value={`${deliveryToday.avgDeliveryMin} min`} sub={`${(deliveryToday.onTimeRate * 100).toFixed(0)}% on-time`} />
        <StatBox label="In-house share" value={`${(deliveryToday.inHouseShare * 100).toFixed(0)}%`} sub="Own drivers" accent />
        <StatBox label="Aggregator share" value={`${((deliveryToday.uberDirectShare + deliveryToday.taskerShare) * 100).toFixed(0)}%`} sub="Uber Direct + Taskers" />
        <StatBox label="Saved today" value={formatAUD(deliveryToday.costSavedAud)} sub="vs 100% aggregator" accent />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 12, background: "rgba(15,25,42,0.5)", border: "1px solid var(--mist-9)", alignSelf: "flex-start" }}>
        {([
          { key: "all",         label: "All drivers" },
          { key: "in_house",    label: "In-house" },
          { key: "uber_direct", label: "Uber Direct" },
          { key: "tasker",      label: "Taskers" },
        ] as const).map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: active ? "var(--green)" : "transparent",
                color: active ? "var(--navy)" : "var(--steel)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Driver cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((d) => (
          <DriverCard key={d.id} driver={d} />
        ))}
      </div>

      {/* Today's deliveries table */}
      <div
        style={{
          borderRadius: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--mist-9)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
          Active deliveries
        </div>
        {drivers.filter((d) => d.currentOrderId).map((d) => {
          const order = d.currentOrderId ? orderById[d.currentOrderId] : null;
          if (!order) return null;
          const s = driverStatusLabel[d.status];
          return (
            <div
              key={d.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1.4fr 1.2fr 120px 100px 90px",
                gap: 10,
                alignItems: "center",
                padding: "12px 18px",
                borderBottom: "1px solid var(--mist-9)",
                fontSize: 13,
              }}
            >
              <div style={avatarCircle(d)}>{d.initials}</div>
              <div>
                <div style={{ color: "var(--cloud)", fontWeight: 600 }}>{d.name}</div>
                <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>
                  {driverTypeLabel[d.type].label}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--cloud)", fontWeight: 600 }}>{order.number} · {order.customerName}</div>
                <div style={{ color: "var(--steel)", fontSize: 12 }}>{formatAUD(order.total)}</div>
              </div>
              <div>
                <span style={{ padding: "3px 10px", borderRadius: 8, background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 700 }}>
                  {s.label}
                </span>
              </div>
              <div style={{ color: "var(--cloud)", fontVariantNumeric: "tabular-nums" }}>
                ETA {d.etaMin ?? "—"}m
              </div>
              <div style={{ textAlign: "right" }}>
                <Link href="/demo/live/orders" style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
                  View →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function avatarCircle(d: DemoDriver): React.CSSProperties {
  const colors = {
    in_house:    { bg: "rgba(0,182,122,0.20)",  color: "#00B67A" },
    uber_direct: { bg: "rgba(255,255,255,0.10)",color: "#F8FAFB" },
    tasker:      { bg: "rgba(255,107,53,0.18)", color: "#FF6B35" },
  }[d.type];
  return {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: colors.bg,
    color: colors.color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 12,
    fontFamily: "var(--font-outfit)",
  };
}

function DriverCard({ driver }: { driver: DemoDriver }) {
  const s = driverStatusLabel[driver.status];
  const t = driverTypeLabel[driver.type];
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={avatarCircle(driver)}>{driver.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--cloud)" }}>{driver.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>
            {t.label} · ★ {driver.rating}
          </div>
        </div>
        <span style={{ padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
          {s.label}
        </span>
      </div>

      {driver.currentOrderId ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(107,177,255,0.08)",
            border: "1px solid rgba(107,177,255,0.22)",
            fontSize: 12.5,
            color: "var(--cloud)",
            marginBottom: 12,
          }}
        >
          On order <strong>{orderById[driver.currentOrderId]?.number}</strong> · ETA {driver.etaMin}m
        </div>
      ) : (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(156,168,189,0.06)",
            border: "1px solid var(--mist-9)",
            fontSize: 12.5,
            color: "var(--steel)",
            marginBottom: 12,
          }}
        >
          Available for assignment
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
        <div>
          <div style={{ color: "var(--steel)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Today
          </div>
          <div style={{ color: "var(--cloud)", fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            {driver.todayDeliveries} drops
          </div>
        </div>
        <div>
          <div style={{ color: "var(--steel)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Distance
          </div>
          <div style={{ color: "var(--cloud)", fontWeight: 700, fontSize: 14, marginTop: 2 }}>
            {driver.todayDistanceKm.toFixed(1)} km
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: accent ? "rgba(0,182,122,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(0,182,122,0.28)" : "var(--mist-9)"}`,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: accent ? "var(--green)" : "var(--cloud)", marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
