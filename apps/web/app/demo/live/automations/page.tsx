"use client";

import { useState } from "react";
import { automations as initialAutomations, type DemoAutomation } from "../data";

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

const CATEGORY_COLORS: Record<DemoAutomation["category"], { color: string; bg: string; emoji: string; label: string }> = {
  order:  { color: "#00B67A", bg: "rgba(0,182,122,0.14)",   emoji: "📋", label: "Orders" },
  review: { color: "#C9A6FF", bg: "rgba(201,166,255,0.14)", emoji: "⭐", label: "Reviews" },
  stock:  { color: "#FFC14B", bg: "rgba(255,193,75,0.14)",  emoji: "📦", label: "Stock" },
  staff:  { color: "#6BB1FF", bg: "rgba(107,177,255,0.14)", emoji: "👥", label: "Staff" },
};

export default function AutomationsPage() {
  const [data, setData] = useState<DemoAutomation[]>(initialAutomations);
  const [filter, setFilter] = useState<"all" | DemoAutomation["category"]>("all");

  const filtered = filter === "all" ? data : data.filter((a) => a.category === filter);
  const liveCount = data.filter((a) => a.status === "live").length;
  const totalRuns = data.reduce((s, a) => s + a.runs30d, 0);

  function toggleStatus(id: string) {
    setData((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "live" ? "paused" : "live" } : a
      )
    );
    const auto = data.find((a) => a.id === id);
    toast(`${auto?.name} ${auto?.status === "live" ? "paused" : "activated"}`);
  }

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Automations
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Rules that fire without you — kitchen tickets, apology credits, stock alerts.
          </p>
        </div>
        <button
          onClick={() => toast("Automation builder would open (demo)")}
          style={{ padding: "10px 16px", borderRadius: 10, background: "var(--green)", color: "var(--navy)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
        >
          + New automation
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatBox label="Active rules" value={String(liveCount)} sub={`${data.length - liveCount} paused`} accent />
        <StatBox label="Runs · 30d" value={totalRuns.toLocaleString("en-AU")} sub={`${Math.round(totalRuns / 30)} / day avg`} />
        <StatBox label="Hours saved" value="48h" sub="vs manual follow-up" accent />
        <StatBox label="Avg latency" value="1.2s" sub="Trigger → action" />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 12, background: "rgba(15,25,42,0.5)", border: "1px solid var(--mist-9)", alignSelf: "flex-start" }}>
        {([
          { key: "all",    label: "All" },
          { key: "order",  label: "Orders" },
          { key: "review", label: "Reviews" },
          { key: "stock",  label: "Stock" },
          { key: "staff",  label: "Staff" },
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

      {/* Automation list */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((a) => {
          const cat = CATEGORY_COLORS[a.category];
          const live = a.status === "live";
          return (
            <div
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr 180px 130px 100px",
                gap: 14,
                alignItems: "center",
                padding: "16px 18px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--mist-9)",
                borderLeft: `3px solid ${live ? "var(--green)" : "var(--mist-9)"}`,
                opacity: live ? 1 : 0.72,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: cat.bg,
                  color: cat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {cat.emoji}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--cloud)" }}>{a.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 3 }}>
                  <strong style={{ color: "#C9A6FF" }}>When:</strong> {a.trigger}{" "}
                  <span style={{ color: "var(--mist-24)", margin: "0 6px" }}>→</span>
                  <strong style={{ color: "var(--green)" }}>Do:</strong> {a.action}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--steel)" }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700 }}>
                  {cat.label}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 10.5, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  Runs · 30d
                </div>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: "var(--cloud)", marginTop: 3 }}>
                  {a.runs30d.toLocaleString("en-AU")}
                </div>
              </div>

              <button
                onClick={() => toggleStatus(a.id)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  background: live ? "rgba(255,193,75,0.14)" : "var(--green)",
                  color: live ? "#FFC14B" : "var(--navy)",
                  border: live ? "1px solid rgba(255,193,75,0.28)" : "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  whiteSpace: "nowrap",
                }}
              >
                {live ? "⏸ Pause" : "▶ Activate"}
              </button>
            </div>
          );
        })}
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
