"use client";

import { analytics, formatAUD } from "../data";

export default function AnalyticsPage() {
  const peakHour = analytics.ordersByHour.indexOf(Math.max(...analytics.ordersByHour));
  const totalOrdersToday = analytics.ordersByHour.reduce((s, n) => s + n, 0);
  const segmentEntries = Object.entries(analytics.segments) as [
    keyof typeof analytics.segments,
    { count: number; pct: number }
  ][];

  const SEGMENT_COLORS: Record<string, { color: string; label: string }> = {
    vips:    { color: "#C9A24A", label: "VIPs" },
    regular: { color: "#00B67A", label: "Regulars" },
    new:     { color: "#6BB1FF", label: "New" },
    lapsing: { color: "#FFC14B", label: "Lapsing" },
    lapsed:  { color: "#FF5A5A", label: "Lapsed" },
  };

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Analytics
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Where your orders come from, when they happen, and what's selling.
        </p>
      </div>

      {/* Hourly */}
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--mist-9)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
              Orders by hour · today
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>
              {totalOrdersToday} orders so far · peak at {peakHour}:00
            </div>
          </div>
        </div>
        <HourlyChart data={analytics.ordersByHour} peak={peakHour} />
      </div>

      {/* Top items + Postcodes */}
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
            Top sellers · 30d
          </div>
          {analytics.topItems30d.map((item, i) => {
            const max = analytics.topItems30d[0]?.sold ?? 1;
            return (
              <div key={item.name} style={{ padding: "12px 18px", borderBottom: "1px solid var(--mist-9)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, fontSize: 13.5 }}>
                  <span style={{ color: "var(--cloud)", fontWeight: 600 }}>
                    <span style={{ color: "var(--steel)", marginRight: 8, fontFamily: "var(--font-mono)" }}>#{i + 1}</span>
                    {item.name}
                  </span>
                  <span style={{ color: "var(--steel)", fontVariantNumeric: "tabular-nums" }}>
                    {item.sold} sold · <strong style={{ color: "var(--green)" }}>{formatAUD(item.revenue)}</strong>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(item.sold / max) * 100}%`,
                      height: "100%",
                      background: "var(--green)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
            Top postcodes · 30d
          </div>
          {analytics.postcodes.map((p) => (
            <div
              key={p.postcode}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 110px",
                gap: 12,
                alignItems: "center",
                padding: "12px 18px",
                borderBottom: "1px solid var(--mist-9)",
                fontSize: 13.5,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 700 }}>{p.postcode}</div>
              <div style={{ color: "var(--cloud)" }}>{p.orders} orders</div>
              <div style={{ textAlign: "right", color: "var(--steel)", fontVariantNumeric: "tabular-nums" }}>
                {formatAUD(p.revenue)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segments */}
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--mist-9)",
        }}
      >
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)", marginBottom: 4 }}>
          Customer segments
        </div>
        <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 16 }}>
          AI auto-segments customers based on order frequency and recency.
        </div>

        {/* Stacked bar */}
        <div
          style={{
            height: 18,
            borderRadius: 999,
            display: "flex",
            overflow: "hidden",
            border: "1px solid var(--mist-9)",
            marginBottom: 14,
          }}
        >
          {segmentEntries.map(([key, s]) => (
            <div
              key={key}
              style={{
                width: `${s.pct * 100}%`,
                background: SEGMENT_COLORS[key]?.color ?? "var(--mist-9)",
              }}
              title={`${SEGMENT_COLORS[key]?.label}: ${s.count}`}
            />
          ))}
        </div>

        {/* Legend with counts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {segmentEntries.map(([key, s]) => {
            const meta = SEGMENT_COLORS[key];
            return (
              <div
                key={key}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(15,25,42,0.5)",
                  border: "1px solid var(--mist-9)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--steel)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: meta?.color }} aria-hidden />
                  {meta?.label}
                </div>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20, color: "var(--cloud)", marginTop: 6 }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)" }}>
                  {(s.pct * 100).toFixed(0)}% of base
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HourlyChart({ data, peak }: { data: number[]; peak: number }) {
  const max = Math.max(...data, 1);
  const W = 820;
  const H = 160;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = innerW / data.length - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 180, display: "block" }}>
      {data.map((n, i) => {
        const h = max === 0 ? 0 : (n / max) * innerH;
        const x = PAD_L + i * (innerW / data.length) + 2;
        const y = PAD_T + innerH - h;
        const isPeak = i === peak;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2.5}
              fill={isPeak ? "var(--orange)" : "var(--green)"}
              opacity={n === 0 ? 0.15 : 0.9}
            />
            {(i % 3 === 0 || i === peak) && (
              <text
                x={x + barW / 2}
                y={H - 12}
                textAnchor="middle"
                fontSize="9.5"
                fill={isPeak ? "var(--orange)" : "#6B7C93"}
                fontFamily="var(--font-mono)"
                fontWeight={isPeak ? 700 : 400}
              >
                {i}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
