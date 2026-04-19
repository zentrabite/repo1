"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { customers, rewardTiers, earnRules, formatAUD, type DemoCustomer } from "../data";

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

const TIER_COLORS: Record<DemoCustomer["tier"], { color: string; bg: string; emoji: string }> = {
  VIP:    { color: "#C9A24A", bg: "rgba(201,162,74,0.14)",  emoji: "👑" },
  Gold:   { color: "#FFC14B", bg: "rgba(255,193,75,0.14)",  emoji: "⭐" },
  Silver: { color: "#B6C4D6", bg: "rgba(182,196,214,0.12)", emoji: "🥈" },
  Bronze: { color: "#C28D5C", bg: "rgba(194,141,92,0.14)",  emoji: "🥉" },
};

export default function RewardsPage() {
  const tierCounts = useMemo(() => {
    const counts = { Bronze: 0, Silver: 0, Gold: 0, VIP: 0 };
    customers.forEach((c) => { counts[c.tier]++; });
    return counts;
  }, []);

  const pointsOutstanding = customers.reduce((s, c) => s + c.points, 0);
  const pointsValueAud = pointsOutstanding * 0.01;

  const top5 = [...customers].sort((a, b) => b.points - a.points).slice(0, 5);
  const [redeemPoints, setRedeemPoints] = useState(200);
  const redeemValue = redeemPoints * 0.01;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Rewards
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Tiered loyalty. Customers earn points per dollar — redeem at checkout, across any channel.
        </p>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatBox label="Points outstanding" value={pointsOutstanding.toLocaleString("en-AU")} sub={`Liability: ${formatAUD(pointsValueAud)}`} />
        <StatBox label="Members" value={String(customers.length)} sub="Across all tiers" />
        <StatBox label="Avg ticket · members" value={formatAUD(48.29)} sub="+24% vs non-members" accent />
        <StatBox label="Repeat rate · members" value="68%" sub="vs 41% non-members" accent />
      </div>

      {/* Tiers */}
      <div>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)", marginBottom: 10 }}>
          Tiers
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {rewardTiers.map((tier) => {
            const colors = TIER_COLORS[tier.name];
            const count = tierCounts[tier.name];
            return (
              <div
                key={tier.name}
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: colors.bg,
                  border: `1px solid ${colors.color}33`,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{colors.emoji}</div>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, color: colors.color }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>
                  {tier.min}+ pts · {tier.multiplier}× earn rate
                </div>
                <div style={{ marginTop: 14, display: "grid", gap: 4 }}>
                  {tier.perks.map((p) => (
                    <div key={p} style={{ fontSize: 12, color: "var(--cloud)", display: "flex", gap: 6 }}>
                      <span style={{ color: colors.color }}>✓</span>
                      {p}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${colors.color}22`,
                    fontSize: 12,
                    color: "var(--steel)",
                  }}
                >
                  <strong style={{ color: "var(--cloud)", fontSize: 14 }}>{count}</strong> members
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard + redeem sim */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
            Top 5 members by points
          </div>
          {top5.map((c, i) => {
            const colors = TIER_COLORS[c.tier];
            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 90px 100px",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--mist-9)",
                }}
              >
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 16, color: "var(--steel)" }}>
                  #{i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--steel)" }}>{c.orders} orders · {formatAUD(c.ltv)} LTV</div>
                </div>
                <div>
                  <span style={{ padding: "3px 10px", borderRadius: 999, background: colors.bg, color: colors.color, fontSize: 11.5, fontWeight: 700 }}>
                    {colors.emoji} {c.tier}
                  </span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>
                  {c.points.toLocaleString("en-AU")}
                </div>
              </div>
            );
          })}
          <div style={{ padding: "12px 18px", textAlign: "center" }}>
            <Link href="/demo/live/customers" style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
              View all customers →
            </Link>
          </div>
        </div>

        {/* Redeem simulator */}
        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--mist-9)",
            padding: 20,
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
            Pay-with-points · preview
          </div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2, marginBottom: 16 }}>
            What customers see at checkout.
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "linear-gradient(140deg, rgba(0,182,122,0.12), rgba(107,177,255,0.08))",
              border: "1px solid rgba(0,182,122,0.22)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--steel)" }}>You have</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--green)", marginTop: 2 }}>
              1,240 points
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>worth up to {formatAUD(12.40)}</div>

            <div style={{ marginTop: 18 }}>
              <input
                type="range"
                min={0}
                max={1240}
                step={10}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#00B67A" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12.5, color: "var(--cloud)" }}>
                <span>Redeem: <strong>{redeemPoints} pts</strong></span>
                <span>Discount: <strong style={{ color: "var(--green)" }}>−{formatAUD(redeemValue)}</strong></span>
              </div>
            </div>

            <button
              onClick={() => toast(`${redeemPoints} points would redeem for ${formatAUD(redeemValue)} off`)}
              style={{ width: "100%", marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "var(--green)", color: "var(--navy)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
            >
              Apply to order
            </button>
          </div>
        </div>
      </div>

      {/* Earn rules */}
      <div
        style={{
          borderRadius: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--mist-9)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
          How customers earn points
        </div>
        {earnRules.map((r) => (
          <div
            key={r.rule}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid var(--mist-9)",
              fontSize: 13.5,
              color: "var(--cloud)",
            }}
          >
            <span>{r.rule}</span>
            <span style={{ color: "var(--green)", fontWeight: 600 }}>{r.earn}</span>
          </div>
        ))}
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
