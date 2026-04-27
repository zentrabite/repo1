"use client";

import { useState } from "react";
import { menu as initialMenu, formatAUD, type MenuCategory } from "../data";

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

export default function MenuPage() {
  const [data, setData] = useState<MenuCategory[]>(initialMenu);

  const totalItems = data.reduce((s, c) => s + c.items.length, 0);
  const availableItems = data.reduce((s, c) => s + c.items.filter((i) => i.available).length, 0);

  function toggle(catId: string, itemId: string) {
    setData((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, available: !i.available } : i)) }
          : c
      )
    );
    const item = data.find((c) => c.id === catId)?.items.find((i) => i.id === itemId);
    toast(`${item?.name} ${item?.available ? "86'd" : "back on menu"}`);
  }

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Menu
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Toggle items in real-time. Changes sync to POS, storefront, app, and aggregators within 30s.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => toast("AI menu suggestions: 3 new items based on top sellers (demo)")}
            style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(201,166,255,0.12)", color: "#C9A6FF", border: "1px solid rgba(201,166,255,0.28)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
          >
            ✨ AI suggestions
          </button>
          <button
            onClick={() => toast("Menu item editor would open (demo)")}
            style={{ padding: "10px 16px", borderRadius: 10, background: "var(--green)", color: "var(--navy)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
          >
            + Add item
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatBox label="Total items" value={String(totalItems)} sub={`${data.length} categories`} />
        <StatBox label="Available" value={String(availableItems)} sub={`${totalItems - availableItems} 86'd`} accent />
        <StatBox label="Avg price" value={formatAUD(data.flatMap((c) => c.items).reduce((s, i) => s + i.price, 0) / totalItems)} sub="Across menu" />
        <StatBox label="Sync status" value="✓ All channels" sub="POS, storefront, Uber, DoorDash" accent />
      </div>

      {/* Categories */}
      {data.map((cat) => (
        <div
          key={cat.id}
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--mist-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
              {cat.name}{" "}
              <span style={{ color: "var(--steel)", fontWeight: 500, fontSize: 13, marginLeft: 6 }}>
                {cat.items.length} items
              </span>
            </div>
            <button
              onClick={() => toast(`Reorder mode for ${cat.name} (demo)`)}
              style={{ background: "transparent", border: "1px solid var(--mist-9)", color: "var(--steel)", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter)" }}
            >
              Reorder
            </button>
          </div>
          {cat.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr 100px 90px 90px",
                gap: 12,
                alignItems: "center",
                padding: "12px 18px",
                borderBottom: "1px solid var(--mist-9)",
                opacity: item.available ? 1 : 0.55,
              }}
            >
              <div style={{ fontSize: 28 }}>{item.emoji}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)", display: "flex", alignItems: "center", gap: 8 }}>
                  {item.name}
                  {item.popular && (
                    <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(255,107,53,0.18)", color: "var(--orange)", fontSize: 10, fontWeight: 700 }}>
                      Popular
                    </span>
                  )}
                </div>
                {item.desc && <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>{item.desc}</div>}
              </div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>
                {formatAUD(item.price)}
              </div>
              <ToggleSwitch
                on={item.available}
                onChange={() => toggle(cat.id, item.id)}
                label={item.available ? "Available" : "86'd"}
              />
              <button
                onClick={() => toast(`Edit ${item.name} (demo)`)}
                style={{ background: "transparent", border: "1px solid var(--mist-9)", color: "var(--steel)", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter)" }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontFamily: "var(--font-inter)" }}
      aria-pressed={on}
    >
      <span
        style={{
          position: "relative",
          width: 36,
          height: 20,
          borderRadius: 999,
          background: on ? "var(--green)" : "var(--mist-9)",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "white",
            transition: "left 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </span>
      <span style={{ fontSize: 11.5, color: on ? "var(--green)" : "var(--steel)", fontWeight: 600 }}>{label}</span>
    </button>
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
