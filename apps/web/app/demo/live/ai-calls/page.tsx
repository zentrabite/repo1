"use client";

import { useState } from "react";
import { calls, callsTodayStats, callOutcomeLabel, formatTime, formatAUD, type DemoCall } from "../data";

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

function formatDuration(sec: number): string {
  if (sec === 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

export default function AiCallsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(calls[0]?.id ?? null);
  const selected = calls.find((c) => c.id === selectedId) ?? null;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          AI calls
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Your AI receptionist answers every call, takes orders, books tables, and routes the rest. Today's transcripts below.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}
      >
        {[
          { label: "Calls today",      value: String(callsTodayStats.total),                                           sub: `${callsTodayStats.answeredByAi} answered by AI`,              accent: false },
          { label: "Orders from calls", value: String(callsTodayStats.ordersFromCalls),                                  sub: formatAUD(callsTodayStats.revenueFromCalls),                   accent: true },
          { label: "Avg duration",     value: `${callsTodayStats.avgDurationSec}s`,                                    sub: "Across all calls",                                            accent: false },
          { label: "AI cost today",    value: formatAUD(callsTodayStats.totalCostAud),                                  sub: `${(callsTodayStats.totalCostAud / Math.max(1, callsTodayStats.answeredByAi)).toFixed(2)}¢ per call`, accent: false },
          { label: "Staff hours saved", value: `${callsTodayStats.staffHoursSaved}h`,                                   sub: "vs. answering manually",                                      accent: false },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: s.accent ? "rgba(0,182,122,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${s.accent ? "rgba(0,182,122,0.28)" : "var(--mist-9)"}`,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: s.accent ? "var(--green)" : "var(--cloud)", marginTop: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Call list + transcript */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) 1fr", gap: 16 }}>
        <div
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
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--cloud)",
            }}
          >
            Today's calls · {calls.length}
          </div>
          {calls.map((c) => {
            const o = callOutcomeLabel[c.outcome];
            const isActive = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 100px 110px",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 18px",
                  background: isActive ? "rgba(0,182,122,0.07)" : "transparent",
                  borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                  borderBottom: "1px solid var(--mist-9)",
                  border: "none",
                  borderRight: "none",
                  borderTop: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  color: "inherit",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--steel)", fontFamily: "var(--font-mono)" }}>
                  {formatTime(c.startedAt)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)" }}>{c.caller}</div>
                  <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>{c.summary}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--steel)", fontVariantNumeric: "tabular-nums" }}>
                  {formatDuration(c.durationSec)}
                </div>
                <div>
                  <span
                    style={{
                      padding: "4px 9px",
                      borderRadius: 8,
                      background: o.bg,
                      color: o.color,
                      fontSize: 11.5,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && <CallDetail call={selected} />}
      </div>
    </div>
  );
}

function CallDetail({ call }: { call: DemoCall }) {
  const o = callOutcomeLabel[call.outcome];
  return (
    <aside
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--mist-9)",
        padding: 20,
        position: "sticky",
        top: 116,
        height: "fit-content",
        maxHeight: "calc(100vh - 140px)",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          Call transcript
        </div>
        <span
          style={{ padding: "3px 10px", borderRadius: 999, background: o.bg, color: o.color, fontSize: 11.5, fontWeight: 700 }}
        >
          {o.label}
        </span>
      </div>

      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, color: "var(--cloud)" }}>
        {call.caller}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
        {call.phone} · {formatTime(call.startedAt)} · {formatDuration(call.durationSec)} · {call.costCents}¢
      </div>

      {call.orderId && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(0,182,122,0.10)",
            border: "1px solid rgba(0,182,122,0.28)",
            fontSize: 13,
            color: "var(--cloud)",
          }}
        >
          ✅ <strong>Order created:</strong> {call.orderId} · {call.orderTotal ? formatAUD(call.orderTotal) : ""}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: "rgba(15,25,42,0.5)",
          border: "1px solid var(--mist-9)",
          fontSize: 13,
          color: "var(--cloud)",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "var(--green)" }}>Summary:</strong> {call.summary}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
        {call.transcript.map((line, i) => {
          const isAi = line.who === "ai";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: isAi ? "var(--green)" : "rgba(107,177,255,0.20)",
                  color: isAi ? "var(--navy)" : "#6BB1FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: "var(--font-outfit)",
                }}
              >
                {isAi ? "AI" : "👤"}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: isAi ? "rgba(0,182,122,0.08)" : "rgba(107,177,255,0.06)",
                  fontSize: 13.5,
                  color: "var(--cloud)",
                  lineHeight: 1.5,
                }}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
        <button
          onClick={() => toast("Audio playback would start (demo)")}
          style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(107,177,255,0.10)", color: "#6BB1FF", border: "1px solid rgba(107,177,255,0.28)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
        >
          ▶ Play recording
        </button>
        <button
          onClick={() => toast("Sent to manager Slack (demo)")}
          style={{ padding: "9px 12px", borderRadius: 10, background: "transparent", color: "var(--steel)", border: "1px solid var(--mist-9)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
        >
          Forward to manager
        </button>
      </div>
    </aside>
  );
}
