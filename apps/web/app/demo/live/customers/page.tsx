"use client";

import { useMemo, useState } from "react";
import { customers, customerById, orders, formatAUD, formatDateTime, timeAgo } from "../data";

type SortKey = "ltv" | "orders" | "lastOrder" | "name";

const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  VIP:    { color: "#C9A24A", bg: "rgba(201,162,74,0.15)" },
  Gold:   { color: "#FFC14B", bg: "rgba(255,193,75,0.14)" },
  Silver: { color: "#B6C4D6", bg: "rgba(182,196,214,0.12)" },
  Bronze: { color: "#C28D5C", bg: "rgba(194,141,92,0.14)" },
};

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  active:  { color: "#00B67A", bg: "rgba(0,182,122,0.14)",  label: "Active" },
  lapsing: { color: "#FFC14B", bg: "rgba(255,193,75,0.14)", label: "Lapsing" },
  lapsed:  { color: "#FF5A5A", bg: "rgba(255,90,90,0.12)",  label: "Lapsed" },
};

export default function DemoCustomersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("ltv");

  const filtered = useMemo(() => {
    const list = customers.filter((c) => {
      if (tier !== "all" && c.tier !== tier) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !c.phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "ltv") return b.ltv - a.ltv;
      if (sort === "orders") return b.orders - a.orders;
      if (sort === "lastOrder") return a.lastOrderAt < b.lastOrderAt ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [query, tier, sort]);

  const selected = selectedId ? customerById[selectedId] ?? null : null;
  const totalLtv = customers.reduce((sum, c) => sum + c.ltv, 0);
  const vipCount = customers.filter((c) => c.tier === "VIP").length;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Growth · CRM</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Customers
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          {customers.length} customers · {formatAUD(totalLtv)} lifetime value · {vipCount} VIPs
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
          placeholder="Search by name, email, or phone..."
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
          {["all", "VIP", "Gold", "Silver", "Bronze"].map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: tier === t ? "var(--green)" : "rgba(15,25,42,0.6)",
                color: tier === t ? "var(--navy)" : "var(--steel)",
                border: tier === t ? "1px solid var(--green)" : "1px solid var(--mist-9)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t === "all" ? "All tiers" : t}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--mist-9)",
            background: "rgba(15,25,42,0.55)",
            color: "var(--cloud)",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="ltv">Sort: Lifetime value</option>
          <option value="orders">Sort: Order count</option>
          <option value="lastOrder">Sort: Recently active</option>
          <option value="name">Sort: Name</option>
        </select>
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
            gridTemplateColumns: "1.5fr 1fr 90px 110px 110px 100px 100px",
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
          <div>Customer</div>
          <div>Contact</div>
          <div>Tier</div>
          <div style={{ textAlign: "right" }}>LTV</div>
          <div style={{ textAlign: "right" }}>Orders</div>
          <div>Last order</div>
          <div>Status</div>
        </div>

        {filtered.map((c, i) => {
          const tierColor = TIER_COLORS[c.tier]!;
          const statusColor = STATUS_COLORS[c.status]!;
          const isSelected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 90px 110px 110px 100px 100px",
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
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: tierColor.bg,
                    color: tierColor.color,
                    fontFamily: "var(--font-outfit)",
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ color: "var(--cloud)", fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 1 }}>{c.favourite}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5 }}>
                <div style={{ color: "var(--cloud)" }}>{c.email}</div>
                <div style={{ color: "var(--steel)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{c.phone}</div>
              </div>
              <div>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    color: tierColor.color,
                    background: tierColor.bg,
                  }}
                >
                  {c.tier}
                </span>
              </div>
              <div style={{ textAlign: "right", fontFamily: "var(--font-outfit)", fontWeight: 700, color: "var(--cloud)", fontSize: 14 }}>
                {formatAUD(c.ltv)}
              </div>
              <div style={{ textAlign: "right", color: "var(--cloud)", fontSize: 13.5 }}>{c.orders}</div>
              <div style={{ color: "var(--steel)", fontSize: 12.5 }}>{timeAgo(c.lastOrderAt)}</div>
              <div>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusColor.color,
                    background: statusColor.bg,
                  }}
                >
                  {statusColor.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && <CustomerDrawer customerId={selected.id} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function CustomerDrawer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const c = customerById[customerId]!;
  const tierColor = TIER_COLORS[c.tier]!;
  const customerOrders = orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1));

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
        <div
          style={{
            padding: "20px 22px",
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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                background: tierColor.bg,
                color: tierColor.color,
                fontFamily: "var(--font-outfit)",
                fontWeight: 800,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, color: "var(--cloud)" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: tierColor.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
                {c.tier} · {c.points.toLocaleString()} pts
              </div>
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

        <div style={{ padding: 22, display: "grid", gap: 22 }}>
          {/* Contact */}
          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Email" value={c.email} />
            <Field label="Phone" value={c.phone} mono />
            <Field label="Postcode" value={c.postcode} mono />
            <Field label="Favourite" value={c.favourite} />
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatBox label="Lifetime value" value={formatAUD(c.ltv)} />
            <StatBox label="Total orders" value={c.orders.toString()} />
            <StatBox label="First order" value={timeAgo(c.firstOrderAt)} />
            <StatBox label="Last order" value={timeAgo(c.lastOrderAt)} />
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gap: 8 }}>
            <ActionButton label="Send personalised SMS" icon="💬" />
            <ActionButton label="Add to a campaign segment" icon="🎯" />
            <ActionButton label="Send winback offer (20% off)" icon="🔁" />
          </div>

          {/* Order history */}
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
              Order history · {customerOrders.length}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {customerOrders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-9)",
                    display: "grid",
                    gridTemplateColumns: "60px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12 }}>{o.number}</div>
                  <div>
                    <div style={{ color: "var(--cloud)", fontSize: 13 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</div>
                    <div style={{ color: "var(--steel)", fontSize: 11, marginTop: 2 }}>{formatDateTime(o.placedAt)}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, color: "var(--cloud)", fontSize: 14 }}>
                    {formatAUD(o.total)}
                  </div>
                </div>
              ))}
              {customerOrders.length === 0 && (
                <div style={{ color: "var(--steel)", fontSize: 13, padding: 12 }}>No order history in demo data.</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "var(--steel)" }}>{label}</span>
      <span style={{ color: "var(--cloud)", fontFamily: mono ? "var(--font-mono)" : "inherit" }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: "var(--navy-40)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 18, color: "var(--cloud)", marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({ label, icon }: { label: string; icon: string }) {
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
