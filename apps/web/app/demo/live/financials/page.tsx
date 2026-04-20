"use client";

import { useMemo, useState } from "react";
import { financials, formatAUD } from "../data";

type Range = "today" | "wtd" | "mtd" | "last30";

const RANGES: { key: Range; label: string }[] = [
  { key: "today",  label: "Today" },
  { key: "wtd",    label: "Week to date" },
  { key: "mtd",    label: "Month to date" },
  { key: "last30", label: "Last 30 days" },
];

export default function FinancialsPage() {
  const [range, setRange] = useState<Range>("last30");
  const period = financials[range];

  // Ensure consistent typing — "today" and others have slightly different fields but share these three.
  const current = {
    revenue: period.revenue,
    orders: period.orders,
    avgTicket: period.avgTicket,
  };

  const commissionTotal = useMemo(
    () => financials.bySource.reduce((s, b) => s + b.commission, 0),
    []
  );
  const grossRevenue = useMemo(
    () => financials.bySource.reduce((s, b) => s + b.amount, 0),
    []
  );
  const netRevenue = grossRevenue - commissionTotal;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Financials
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Revenue, fees, and payouts across every channel — in one place.
          </p>
        </div>

        {/* Range pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
            borderRadius: 12,
            background: "rgba(15,25,42,0.5)",
            border: "1px solid var(--mist-9)",
          }}
        >
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
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
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <StatCard label="Revenue" value={formatAUD(current.revenue)} sub={`${RANGES.find((r) => r.key === range)?.label ?? ""}`} accent />
        <StatCard label="Orders"  value={current.orders.toLocaleString("en-AU")} sub={`${(current.orders / (range === "today" ? 1 : range === "wtd" ? 7 : range === "mtd" ? 18 : 30)).toFixed(1)} /day avg`} />
        <StatCard label="Avg ticket" value={formatAUD(current.avgTicket)} sub="Per paid order" />
        <StatCard
          label="Repeat rate"
          value={`${(financials.last30.repeatRate * 100).toFixed(0)}%`}
          sub="Last 30 days"
        />
      </div>

      {/* 14-day chart */}
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--mist-9)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
              14-day revenue
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>
              Total: {formatAUD(financials.daily.reduce((s, d) => s + d.revenue, 0))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LegendDot color="var(--green)" label="Daily revenue" />
          </div>
        </div>
        <RevenueChart />
      </div>

      {/* By-source + Fees */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* By source */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--mist-9)",
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
            Revenue by source · 30d
          </div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2, marginBottom: 16 }}>
            Aggregator commission is shown separately so you see your true take-home.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {financials.bySource.map((b) => {
              const isAggregator = b.commission > 0;
              return (
                <div key={b.source}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ color: "var(--cloud)", fontWeight: 600 }}>{b.source}</span>
                    <span style={{ color: "var(--steel)", fontVariantNumeric: "tabular-nums" }}>
                      {formatAUD(b.amount)}{" "}
                      <span style={{ color: "var(--mist-24)" }}>· {(b.pct * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${b.pct * 100}%`,
                        height: "100%",
                        background: isAggregator ? "var(--orange)" : "var(--green)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  {isAggregator && (
                    <div style={{ fontSize: 11, color: "var(--orange)", marginTop: 4 }}>
                      − {formatAUD(b.commission)} commission (20% take rate)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--mist-9)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <MiniStat label="Gross revenue"        value={formatAUD(grossRevenue)} />
            <MiniStat label="Aggregator commission" value={`− ${formatAUD(commissionTotal)}`} color="var(--orange)" />
            <MiniStat label="Net revenue"           value={formatAUD(netRevenue)} color="var(--green)" />
          </div>
        </div>

        {/* Fees & payouts */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--mist-9)",
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
            Fees & payouts · 30d
          </div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2, marginBottom: 16 }}>
            What's coming out, and what lands in your bank.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <FeeRow
              label="Stripe processing"
              sub="1.75% + $0.30 per card"
              amount={financials.fees30d.stripe}
              color="#6BB1FF"
            />
            <FeeRow
              label="SMS costs"
              sub="Twilio · AU shortcode"
              amount={financials.fees30d.sms}
              color="#C9A6FF"
            />
            <FeeRow
              label="Aggregator commission"
              sub="Uber + DoorDash"
              amount={financials.fees30d.aggregatorCommission}
              color="var(--orange)"
            />
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: "rgba(0,182,122,0.08)",
              border: "1px solid rgba(0,182,122,0.25)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              Payouts deposited
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 800,
                fontSize: 26,
                color: "var(--green)",
                marginTop: 4,
              }}
            >
              {formatAUD(financials.fees30d.payouts)}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 3 }}>
              Next payout: ~{formatAUD(1842.60)} · tomorrow 9am
            </div>
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "rgba(255,107,53,0.07)",
          border: "1px solid rgba(255,107,53,0.22)",
          fontSize: 13,
          color: "var(--cloud)",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "var(--orange)" }}>💡 Insight:</strong> You're paying{" "}
        <strong style={{ color: "var(--orange)" }}>{formatAUD(commissionTotal)}</strong> in aggregator commission this
        month. If you shifted 20% of those orders to your own storefront, you'd keep{" "}
        <strong style={{ color: "var(--green)" }}>{formatAUD(commissionTotal * 0.2)}</strong> more.
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: accent ? "rgba(0,182,122,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(0,182,122,0.28)" : "var(--mist-9)"}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 800,
          fontSize: 26,
          color: accent ? "var(--green)" : "var(--cloud)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 700,
          fontSize: 17,
          color: color ?? "var(--cloud)",
          marginTop: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FeeRow({
  label,
  sub,
  amount,
  color,
}: {
  label: string;
  sub: string;
  amount: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(15,25,42,0.5)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 8,
            height: 24,
            borderRadius: 3,
            background: color,
          }}
          aria-hidden
        />
        <div>
          <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{sub}</div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)", fontVariantNumeric: "tabular-nums" }}>
        − {formatAUD(amount)}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--steel)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} aria-hidden />
      {label}
    </span>
  );
}

function RevenueChart() {
  const data = financials.daily;
  const max = Math.max(...data.map((d) => d.revenue));
  const min = Math.min(...data.map((d) => d.revenue));
  const W = 820;
  const H = 200;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v: number) => PAD_T + innerH - ((v - min * 0.85) / (max - min * 0.85)) * innerH;

  const pathArea =
    `M ${x(0)} ${PAD_T + innerH} ` +
    data.map((d, i) => `L ${x(i)} ${y(d.revenue)}`).join(" ") +
    ` L ${x(data.length - 1)} ${PAD_T + innerH} Z`;

  const pathLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.revenue)}`).join(" ");

  // Y-axis ticks
  const yTicks = [min * 0.9, (min + max) / 2, max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 220, display: "block" }}>
      <defs>
        <linearGradient id="rev-fin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00B67A" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#00B67A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(t)}
            y2={y(t)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 4"
          />
          <text
            x={PAD_L - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#6B7C93"
            fontFamily="var(--font-mono)"
          >
            ${Math.round(t).toLocaleString("en-AU")}
          </text>
        </g>
      ))}

      <path d={pathArea} fill="url(#rev-fin-grad)" />
      <path d={pathLine} fill="none" stroke="#00B67A" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

      {/* points */}
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.revenue)} r={2.6} fill="#00B67A" />
      ))}

      {/* X-axis labels (every other day) */}
      {data.map((d, i) => (
        i % 2 === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize="10"
            fill="#6B7C93"
            fontFamily="var(--font-mono)"
          >
            {d.day}
          </text>
        ) : null
      ))}
    </svg>
  );
}
