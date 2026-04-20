"use client";

import { useMemo, useState } from "react";
import { menu, formatAUD, type MenuItem } from "../data";

type CartLine = { item: MenuItem; qty: number };

function toast(text: string, kind: "success" | "info" = "success") {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: ${kind === "success" ? "rgba(0,182,122,0.94)" : "rgba(107,177,255,0.94)"}; color: #0F1F2D;
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function PosPage() {
  const [activeCat, setActiveCat] = useState(menu[0]?.id ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<"card" | "cash" | "app">("card");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("takeaway");

  const activeItems = useMemo(() => menu.find((c) => c.id === activeCat)?.items ?? [], [activeCat]);

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const gst = subtotal * 0.1;
  const total = subtotal; // GST is inclusive in AU menus

  function addToCart(item: MenuItem) {
    if (!item.available) {
      toast(`${item.name} is 86'd today`, "info");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.item.id === itemId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function clearCart() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  }

  function placeOrder() {
    if (cart.length === 0) {
      toast("Cart is empty", "info");
      return;
    }
    const orderNum = Math.floor(Math.random() * 900) + 1295;
    toast(`Order #${orderNum} sent to kitchen · ${formatAUD(total)}`);
    clearCart();
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1300 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          POS terminal
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Tap to add — same interface runs on iPad at the counter, shows live orders on the KDS.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 16, alignItems: "start" }}>
        {/* Menu panel */}
        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          {/* Category tabs */}
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: 10,
              borderBottom: "1px solid var(--mist-9)",
              overflowX: "auto",
            }}
          >
            {menu.map((c) => {
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "var(--green)" : "transparent",
                    color: active ? "var(--navy)" : "var(--steel)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-inter)",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Items grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
              padding: 18,
            }}
          >
            {activeItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={!item.available}
                style={{
                  position: "relative",
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(15,25,42,0.5)",
                  border: "1px solid var(--mist-9)",
                  textAlign: "left",
                  cursor: item.available ? "pointer" : "not-allowed",
                  opacity: item.available ? 1 : 0.45,
                  fontFamily: "var(--font-inter)",
                  color: "inherit",
                  transition: "transform 0.1s",
                }}
                onMouseDown={(e) => item.available && (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {item.popular && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: "rgba(255,107,53,0.18)",
                      color: "var(--orange)",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    Popular
                  </span>
                )}
                <div style={{ fontSize: 32, marginBottom: 6 }}>{item.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)" }}>{item.name}</div>
                {item.desc && <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 3, lineHeight: 1.4 }}>{item.desc}</div>}
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 16, color: "var(--green)", marginTop: 8 }}>
                  {formatAUD(item.price)}
                </div>
                {!item.available && (
                  <div style={{ fontSize: 11, color: "#FF5A5A", marginTop: 4, fontWeight: 600 }}>
                    86'd today
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cart panel */}
        <aside
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--mist-9)",
            padding: 18,
            position: "sticky",
            top: 116,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 17, color: "var(--cloud)" }}>
              Current order
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{ background: "transparent", border: "none", color: "var(--steel)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Order type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {([
              { key: "dine_in",  label: "Dine-in",  emoji: "🍽️" },
              { key: "takeaway", label: "Takeaway", emoji: "🥡" },
              { key: "delivery", label: "Delivery", emoji: "🛵" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setOrderType(t.key)}
                style={{
                  padding: "8px 6px",
                  borderRadius: 10,
                  border: `1px solid ${orderType === t.key ? "var(--green)" : "var(--mist-9)"}`,
                  background: orderType === t.key ? "rgba(0,182,122,0.10)" : "transparent",
                  color: orderType === t.key ? "var(--green)" : "var(--steel)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Cart items */}
          <div style={{ minHeight: 120, maxHeight: 240, overflowY: "auto", display: "grid", gap: 8 }}>
            {cart.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--steel)", fontSize: 13 }}>
                Tap items to add to order
              </div>
            ) : (
              cart.map((line) => (
                <div
                  key={line.item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "rgba(15,25,42,0.6)",
                    border: "1px solid var(--mist-9)",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{line.item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cloud)" }}>{line.item.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{formatAUD(line.item.price)} each</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => changeQty(line.item.id, -1)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: "var(--mist-9)", border: "none", color: "var(--cloud)", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
                    >−</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 13, color: "var(--cloud)" }}>{line.qty}</span>
                    <button
                      onClick={() => changeQty(line.item.id, 1)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: "var(--green)", border: "none", color: "var(--navy)", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
                    >+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer */}
          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(15,25,42,0.6)",
                border: "1px solid var(--mist-9)",
                color: "var(--cloud)",
                fontSize: 13,
                fontFamily: "var(--font-inter)",
                outline: "none",
              }}
            />
            <input
              placeholder="Phone (for SMS updates)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(15,25,42,0.6)",
                border: "1px solid var(--mist-9)",
                color: "var(--cloud)",
                fontSize: 13,
                fontFamily: "var(--font-inter)",
                outline: "none",
              }}
            />
          </div>

          {/* Totals */}
          <div style={{ paddingTop: 12, borderTop: "1px solid var(--mist-9)", display: "grid", gap: 6, fontSize: 13 }}>
            <Row label="Subtotal" value={formatAUD(subtotal)} />
            <Row label="GST (incl.)" value={formatAUD(gst)} dim />
            <Row label="Total" value={formatAUD(total)} big />
          </div>

          {/* Payment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {([
              { key: "card", label: "Card",  emoji: "💳" },
              { key: "cash", label: "Cash",  emoji: "💵" },
              { key: "app",  label: "App",   emoji: "📱" },
            ] as const).map((p) => (
              <button
                key={p.key}
                onClick={() => setPayment(p.key)}
                style={{
                  padding: "8px 6px",
                  borderRadius: 10,
                  border: `1px solid ${payment === p.key ? "var(--green)" : "var(--mist-9)"}`,
                  background: payment === p.key ? "rgba(0,182,122,0.10)" : "transparent",
                  color: payment === p.key ? "var(--green)" : "var(--steel)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={placeOrder}
            disabled={cart.length === 0}
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: cart.length === 0 ? "var(--mist-9)" : "var(--green)",
              color: cart.length === 0 ? "var(--steel)" : "var(--navy)",
              border: "none",
              fontWeight: 800,
              fontSize: 15,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "var(--font-inter)",
            }}
          >
            Place order · {formatAUD(total)}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, big, dim }: { label: string; value: string; big?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: dim ? "var(--steel)" : "var(--cloud)", fontSize: big ? 15 : dim ? 11.5 : 13, fontWeight: big ? 600 : 500 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: big ? 800 : 600,
          fontSize: big ? 22 : dim ? 12 : 14,
          color: big ? "var(--green)" : "var(--cloud)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
