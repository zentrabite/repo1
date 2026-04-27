import { C, font } from "@/lib/brand";

// Stat card data — replace values with live Supabase queries in Step 8
const STATS = [
  { label: "Today's Orders",   value: "—", sub: "Real-time via WebSocket",  accent: C.green  },
  { label: "Today's Revenue",  value: "—", sub: "Direct + aggregator",       accent: C.green  },
  { label: "Active Customers", value: "—", sub: "Ordered in last 90 days",   accent: C.orange },
  { label: "Win-Back Revenue", value: "—", sub: "SMS campaign recovery",     accent: C.orange },
];

const WIN_BACK_ROWS = [
  { label: "SMS Sent",            value: "—" },
  { label: "Customers Recovered", value: "—" },
  { label: "Revenue Generated",   value: "—" },
  { label: "Conversion Rate",     value: "—" },
];

const CHART_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function DashboardHome() {
  return (
    <div style={{ padding: "40px", fontFamily: font.body }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 4, height: 32, background: C.green, borderRadius: 2 }} />
        <h1 style={{ fontFamily: font.heading, fontSize: 28, fontWeight: 700, color: C.cloud, margin: 0 }}>
          Dashboard
        </h1>
      </div>
      <p style={{ color: C.muted, fontSize: 15, marginBottom: 32, marginLeft: 16 }}>
        Your live operating view — orders, revenue, and win-back performance.
      </p>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {STATS.map((s) => (
          <div
            key={s.label}
            style={{
              background: C.cardBg,
              borderRadius: 12,
              padding: "24px 20px",
              border: `1px solid ${C.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top accent bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: s.accent, borderRadius: "12px 12px 0 0",
            }} />
            <p style={{ color: C.muted, fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {s.label}
            </p>
            <p style={{ fontFamily: font.mono, fontSize: 32, fontWeight: 700, color: C.cloud, margin: "0 0 6px" }}>
              {s.value}
            </p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Orders + Win-Back ROI ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
        {/* Recent Orders */}
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
              Recent Orders
            </span>
            <span style={{
              background: C.green + "22", color: C.green,
              fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500,
            }}>Live</span>
          </div>
          <div style={{ padding: "32px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            Orders will appear here once Supabase Realtime is connected in Step 7.
          </div>
        </div>

        {/* Win-Back ROI */}
        <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
              Win-Back Engine
            </span>
          </div>
          <div style={{ padding: "20px" }}>
            {WIN_BACK_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 0",
                  borderBottom: i < WIN_BACK_ROWS.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ color: C.muted, fontSize: 13 }}>{row.label}</span>
                <span style={{ fontFamily: font.mono, color: C.cloud, fontSize: 13, fontWeight: 600 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7-Day Revenue Chart ────────────────────────────────────────── */}
      <div style={{ background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
            7-Day Revenue
          </span>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <span style={{ color: C.green }}>● Direct</span>
            <span style={{ color: C.orange }}>● Aggregator</span>
          </div>
        </div>
        <div style={{ padding: "24px 20px" }}>
          {/* Skeleton bars — replace with Recharts chart in Step 8 */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {CHART_DAYS.map((day, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  background: C.border, borderRadius: 4,
                  height: `${50 + (i * 11) % 60}px`,
                  marginBottom: 6, position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: C.green + "66", borderRadius: 4,
                    height: `${55 + (i * 7) % 40}%`,
                  }} />
                </div>
                <span style={{ color: C.muted, fontSize: 11 }}>{day}</span>
              </div>
            ))}
          </div>
          <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 12 }}>
            Skeleton bars shown — connect <code style={{ fontFamily: font.mono }}>analytics_daily</code> table to see real data.
          </p>
        </div>
      </div>
    </div>
  );
}
