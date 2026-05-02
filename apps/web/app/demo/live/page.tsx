import Link from "next/link";
import {
  ordersByRecent,
  customers,
  campaigns,
  financials,
  formatAUD,
  statusLabel,
  channelLabel,
  timeAgo,
} from "./data";

export default function DemoDashboardPage() {
  const live = ordersByRecent.filter((o) => ["new", "cooking", "ready", "out"].includes(o.status));
  const today = ordersByRecent.slice(0, 6);
  const topCustomer = [...customers].sort((a, b) => b.ltv - a.ltv)[0]!;
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const recoveredRevenue = liveCampaigns.reduce((sum, c) => sum + c.revenue30d, 0);

  const stats = [
    { label: "Today's revenue",  value: formatAUD(financials.today.revenue), sub: `${financials.today.orders} orders · avg ${formatAUD(financials.today.avgTicket)}`, color: "var(--green)" },
    { label: "Live orders",      value: String(live.length),                  sub: "right now in the kitchen", color: "var(--cloud)" },
    { label: "Recovered (30d)",  value: formatAUD(recoveredRevenue),          sub: "from winback automations", color: "var(--green)" },
    { label: "Repeat-customer rate", value: `${Math.round(financials.last30.repeatRate * 100)}%`, sub: "of last-30-day orders", color: "var(--cloud)" },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              padding: 18,
              borderRadius: 14,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-6)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 30, color: s.color, marginTop: 8 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-col: Live orders + Revenue chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }} className="demo-two-col">
        {/* Live orders */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "var(--navy-40)",
            border: "1px solid var(--mist-6)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
                Live orders
              </div>
              <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
                Beeps every device the second a ticket lands.
              </div>
            </div>
            <Link
              href="/demo/live/orders"
              style={{
                fontSize: 13,
                color: "var(--green)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View all →
            </Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {today.map((o) => {
              const s = statusLabel[o.status];
              return (
                <Link
                  key={o.id}
                  href={`/demo/live/orders?id=${o.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 90px 110px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(15,25,42,0.55)",
                    border: "1px solid var(--mist-9)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                  className="demo-row"
                >
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--steel)", fontSize: 12 }}>{o.number}</div>
                  <div>
                    <div style={{ color: "var(--cloud)", fontWeight: 600, fontSize: 14 }}>{o.customerName}</div>
                    <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--steel)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {channelLabel[o.channel]}
                  </div>
                  <div
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      color: s.color,
                      background: s.bg,
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Revenue chart */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "var(--navy-40)",
            border: "1px solid var(--mist-6)",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)" }}>
              Revenue · last 14 days
            </div>
            <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>
              {formatAUD(financials.last30.revenue)} in the last 30 days
            </div>
          </div>
          <RevenueChart />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "var(--steel)" }}>
            <span>2 weeks ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Three-col bottom: revenue split, top customer, winback teaser */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "var(--navy-40)",
            border: "1px solid var(--mist-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)", marginBottom: 12 }}>
            Revenue by channel · 30d
          </div>
          {financials.bySource.map((s) => (
            <div key={s.source} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--cloud)" }}>{s.source}</span>
                <span style={{ color: "var(--steel)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{formatAUD(s.amount)}</span>
              </div>
              <div style={{ height: 6, background: "rgba(15,25,42,0.6)", borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${s.pct * 100}%`,
                    height: "100%",
                    background: s.commission > 0 ? "var(--orange)" : "var(--green)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 10, fontStyle: "italic" }}>
            Orange channels charge commission. Green channels are commission-free.
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(0,182,122,0.13), rgba(28,45,72,0.6))",
            border: "1px solid rgba(0,182,122,0.28)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Top customer · all time
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: "var(--green)",
                color: "var(--navy)",
                fontFamily: "var(--font-outfit)",
                fontWeight: 800,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {topCustomer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ color: "var(--cloud)", fontWeight: 700, fontSize: 15 }}>{topCustomer.name}</div>
              <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>
                {topCustomer.tier} · {topCustomer.orders} orders
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
            <Stat label="Lifetime value" value={formatAUD(topCustomer.ltv)} />
            <Stat label="Points balance" value={`${topCustomer.points.toLocaleString()} pts`} />
            <Stat label="Favourite" value={topCustomer.favourite} small />
          </div>
          <Link
            href={`/demo/live/customers?id=${topCustomer.id}`}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 14,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(0,182,122,0.12)",
              color: "var(--green)",
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open customer profile →
          </Link>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "var(--navy-40)",
            border: "1px solid var(--mist-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)", marginBottom: 4 }}>
            Winback engine · 30 days
          </div>
          <div style={{ fontSize: 12.5, color: "var(--steel)", marginBottom: 14 }}>
            Automated SMS + email recovering lapsed customers.
          </div>
          {liveCampaigns.slice(0, 3).map((c) => (
            <div
              key={c.id}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "rgba(15,25,42,0.55)",
                border: "1px solid var(--mist-9)",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, color: "var(--cloud)", fontWeight: 600 }}>{c.name}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11.5, color: "var(--steel)" }}>
                <span>{c.sent30d} sent</span>
                <span style={{ color: "var(--green)" }}>{c.recovered30d} recovered</span>
                <span style={{ color: "var(--cloud)", fontFamily: "var(--font-mono)" }}>{formatAUD(c.revenue30d)}</span>
              </div>
            </div>
          ))}
          <Link
            href="/demo/live/winback"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 8,
              fontSize: 13,
              color: "var(--green)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open Winback engine →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: small ? 12.5 : 13.5 }}>
      <span style={{ color: "var(--steel)" }}>{label}</span>
      <span style={{ color: "var(--cloud)", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function RevenueChart() {
  const data = [
    1782.20, 2120.40, 1488.10, 1620.60, 1742.80, 1882.40, 2640.00,
    2922.20, 2380.10, 1560.00, 1702.80, 1820.20, 1964.40, 2486.00,
  ];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 320;
  const h = 120;
  const stepX = w / (data.length - 1);
  const path = data
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / (max - min)) * (h - 12) - 6;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 140, display: "block" }}>
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,182,122,0.36)" />
          <stop offset="100%" stopColor="rgba(0,182,122,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rev-grad)" />
      <path d={path} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = i * stepX;
        const y = h - ((v - min) / (max - min)) * (h - 12) - 6;
        return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 4 : 2} fill="var(--green)" />;
      })}
    </svg>
  );
}
