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

type Redemption = {
  id: string;
  name: string;
  cost: number;
  category: "treat" | "discount" | "delivery" | "status";
  tierMin: DemoCustomer["tier"];
  redeems30d: number;
};

const REDEMPTIONS: Redemption[] = [
  { id: "r01", name: "Free coffee on your next visit",   cost: 100, category: "treat",    tierMin: "Bronze", redeems30d: 128 },
  { id: "r02", name: "Free garlic bread side",           cost: 150, category: "treat",    tierMin: "Bronze", redeems30d: 76 },
  { id: "r03", name: "$10 off any order",                cost: 500, category: "discount", tierMin: "Silver", redeems30d: 41 },
  { id: "r04", name: "Free delivery (under 5km)",        cost: 250, category: "delivery", tierMin: "Silver", redeems30d: 83 },
  { id: "r05", name: "Free main (up to $24)",            cost: 1000, category: "treat",   tierMin: "Gold",   redeems30d: 19 },
  { id: "r06", name: "20% off a whole order (1 use)",    cost: 800, category: "discount", tierMin: "Gold",   redeems30d: 22 },
  { id: "r07", name: "Bring a friend — free pizza",      cost: 1200, category: "treat",   tierMin: "VIP",    redeems30d: 6 },
  { id: "r08", name: "Skip-the-queue priority prep",     cost: 0,    category: "status",  tierMin: "VIP",    redeems30d: 54 },
];

const CATEGORY_COLORS: Record<Redemption["category"], { label: string; color: string; bg: string }> = {
  treat:    { label: "Free item",    color: "#FFC14B", bg: "rgba(255,193,75,0.12)" },
  discount: { label: "Discount",     color: "#00B67A", bg: "rgba(0,182,122,0.14)" },
  delivery: { label: "Delivery",     color: "#6BB1FF", bg: "rgba(107,177,255,0.14)" },
  status:   { label: "Perk",         color: "#C9A24A", bg: "rgba(201,162,74,0.14)" },
};

const TIER_RANK: Record<DemoCustomer["tier"], number> = { Bronze: 0, Silver: 1, Gold: 2, VIP: 3 };

export default function RewardsPage() {
  const tierCounts = useMemo(() => {
    const counts = { Bronze: 0, Silver: 0, Gold: 0, VIP: 0 };
    customers.forEach((c) => { counts[c.tier]++; });
    return counts;
  }, []);

  const pointsOutstanding = customers.reduce((s, c) => s + c.points, 0);
  const top5 = [...customers].sort((a, b) => b.points - a.points).slice(0, 5);

  const [selectedCustomer, setSelectedCustomer] = useState<DemoCustomer>(top5[0]!);

  const available = REDEMPTIONS.filter(
    (r) => TIER_RANK[selectedCustomer.tier] >= TIER_RANK[r.tierMin] && selectedCustomer.points >= r.cost
  );
  const locked = REDEMPTIONS.filter(
    (r) => !(TIER_RANK[selectedCustomer.tier] >= TIER_RANK[r.tierMin] && selectedCustomer.points >= r.cost)
  );

  function redeem(r: Redemption) {
    toast(`Redeemed: ${r.name} · −${r.cost} pts`);
  }

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Rewards
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Earn → climb tiers → unlock specific rewards. No "pay with points" at checkout —
          points unlock named redemptions so customers know exactly what they're getting.
        </p>
      </div>

      {/* ROI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="rewards-stats">
        <StatBox label="Points outstanding" value={pointsOutstanding.toLocaleString("en-AU")} sub={`Est. redemption liability: ${formatAUD(pointsOutstanding * 0.008)}`} />
        <StatBox label="Active members" value={String(customers.length)} sub="Across all tiers" />
        <StatBox label="Avg ticket · members" value={formatAUD(48.29)} sub="+24% vs non-members" accent />
        <StatBox label="Repeat rate · members" value="68%" sub="vs 41% non-members" accent />
      </div>

      {/* Tiers */}
      <div>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)", marginBottom: 10 }}>
          Tier ladder
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="tier-grid">
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

      {/* Redemption catalog */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
              Redemption catalog
            </div>
            <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
              Customers unlock specific rewards. No vague "discount at checkout" — clear outcomes.
            </div>
          </div>
          <select
            value={selectedCustomer.id}
            onChange={(e) => {
              const c = customers.find((x) => x.id === e.target.value);
              if (c) setSelectedCustomer(c);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-9)",
              color: "var(--cloud)",
              fontSize: 13,
            }}
          >
            {top5.map((c) => (
              <option key={c.id} value={c.id}>
                Preview as {c.name} ({c.tier} · {c.points} pts)
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: 18,
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(0,182,122,0.10), rgba(28,45,72,0.55))",
            border: "1px solid rgba(0,182,122,0.25)",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--steel)" }}>Signed in as</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--cloud)", fontFamily: "var(--font-outfit)" }}>
              {selectedCustomer.name}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
              {selectedCustomer.tier} tier · {selectedCustomer.orders} lifetime orders
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--steel)" }}>Points balance</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 32, color: "var(--green)" }}>
              {selectedCustomer.points.toLocaleString("en-AU")}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)" }}>{available.length} rewards available</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {available.map((r) => {
            const cat = CATEGORY_COLORS[r.category];
            return (
              <div
                key={r.id}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--mist-9)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: cat.bg,
                      color: cat.color,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {cat.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
                    {r.cost === 0 ? "Included" : `${r.cost} pts`}
                  </span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--cloud)", lineHeight: 1.3 }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{r.redeems30d} redeems in last 30 days</div>
                <button
                  onClick={() => redeem(r)}
                  style={{
                    marginTop: "auto",
                    padding: "9px 14px",
                    borderRadius: 9,
                    background: "var(--green)",
                    color: "var(--navy)",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {r.cost === 0 ? "Apply to next order" : `Redeem for ${r.cost} pts`}
                </button>
              </div>
            );
          })}
        </div>

        {locked.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
              Not yet unlocked for this customer
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {locked.map((r) => {
                const needTier = TIER_RANK[selectedCustomer.tier] < TIER_RANK[r.tierMin];
                const needPoints = Math.max(0, r.cost - selectedCustomer.points);
                const reason = needTier
                  ? `Reach ${r.tierMin}`
                  : `${needPoints} pts to go`;
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px dashed var(--mist-9)",
                      opacity: 0.6,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cloud)", marginBottom: 2 }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--steel)" }}>
                      {r.cost} pts · Min tier: {r.tierMin}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--green)", marginTop: 6, fontWeight: 600 }}>
                      {reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard + earn rules */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }} className="rewards-bottom">
        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
            Top members by points
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
                gap: 10,
                padding: "12px 18px",
                borderBottom: "1px solid var(--mist-9)",
                fontSize: 13.5,
                color: "var(--cloud)",
              }}
            >
              <span>{r.rule}</span>
              <span style={{ color: "var(--green)", fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{r.earn}</span>
            </div>
          ))}
          <div style={{ padding: "12px 18px" }}>
            <Link href="/demo/live/campaigns" style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
              Add a campaign-triggered earn rule →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .rewards-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .tier-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rewards-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
