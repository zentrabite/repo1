// Stylised mock visuals for each slide — pure SVG / div mockups,
// no real data, no API calls. Lightweight and deterministic.

import type { VisualKind } from "./slides";

export function SlideVisual({ kind }: { kind: VisualKind }) {
  switch (kind) {
    case "intro":
      return <IntroVisual />;
    case "ai-brain":
      return <AIBrainVisual />;
    case "stock":
      return <StockVisual />;
    case "pos":
      return <PosVisual />;
    case "app-website":
      return <AppWebVisual />;
    case "live-orders":
      return <LiveOrdersVisual />;
    case "storefronts":
      return <StorefrontVisual />;
    case "winback":
      return <WinbackVisual />;
    case "delivery":
      return <DeliveryVisual />;
    case "automations":
      return <AutomationsVisual />;
    case "stripe":
      return <StripeVisual />;
    case "reporting":
      return <ReportingVisual />;
    case "crm":
      return <CRMVisual />;
    case "outro":
      return <OutroVisual />;
  }
}

const baseCard: React.CSSProperties = {
  background: "var(--navy-55)",
  border: "1px solid var(--mist-9)",
  borderRadius: 16,
  padding: 22,
  backdropFilter: "blur(14px)",
  width: "100%",
  maxWidth: 480,
};

function IntroVisual() {
  return (
    <div
      style={{
        ...baseCard,
        textAlign: "center",
        padding: "36px 28px",
        background: "linear-gradient(135deg, rgba(0,182,122,0.18), rgba(28,45,72,0.55))",
      }}
    >
      <div style={{ fontSize: 60, marginBottom: 10 }}>🧠</div>
      <div style={{ fontFamily: "var(--font-outfit)", fontSize: 22, fontWeight: 700, marginBottom: 18 }}>
        The Business Operating System
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { icon: "🍽️", label: "Food & hospitality" },
          { icon: "✂️", label: "Personal services" },
          { icon: "💪", label: "Fitness & health" },
          { icon: "🛍️", label: "Retail & ecom" },
          { icon: "🔧", label: "Services & trades" },
          { icon: "📅", label: "Appointments" },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              padding: "10px 8px",
              borderRadius: 10,
              background: "rgba(15,25,42,0.55)",
              border: "1px solid var(--mist-9)",
              fontSize: 11,
              color: "var(--cloud)",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
            {c.label}
          </div>
        ))}
      </div>
      <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 14 }}>
        One system. Any small business.
      </div>
    </div>
  );
}

function AIBrainVisual() {
  return (
    <div style={{ ...baseCard, padding: 20 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", marginBottom: 10 }}>
        inbox · 7:00am
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--cloud)", marginBottom: 2 }}>
        Your daily brief — Monday
      </div>
      <div style={{ fontSize: 11.5, color: "var(--steel)", marginBottom: 14 }}>
        $3,248 yesterday · 14% above avg
      </div>
      {[
        { tone: "warn", title: "Stock alert · Chicken thigh", body: "Out in 2 days. Reorder 18kg — $261." },
        { tone: "ok", title: "Winback recovered $840 last week", body: "22 lapsed orders back. Boost flow?" },
        { tone: "warn", title: "5 VIPs not seen in 21 days", body: "Combined LTV $4,120. Send winback?" },
      ].map((r, idx) => (
        <div
          key={idx}
          style={{
            padding: "9px 11px",
            borderRadius: 9,
            background: "rgba(15,25,42,0.55)",
            border: `1px solid ${r.tone === "warn" ? "rgba(255,107,53,0.35)" : "rgba(0,182,122,0.35)"}`,
            marginBottom: 7,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: r.tone === "warn" ? "var(--orange)" : "var(--green)", marginBottom: 2 }}>
            {r.title}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--steel)", lineHeight: 1.45 }}>{r.body}</div>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--steel)", textAlign: "center", fontStyle: "italic" }}>
        Reply "act" and ZentraBite executes it.
      </div>
    </div>
  );
}

function StockVisual() {
  const rows = [
    { name: "Chicken thigh", qty: "4.2kg", pct: 23, status: "critical", sug: "+18kg" },
    { name: "Mozzarella",    qty: "6.1kg", pct: 30, status: "low",      sug: "+14kg" },
    { name: "Pizza boxes",   qty: "42",    pct: 10, status: "critical", sug: "+360" },
    { name: "Pizza flour",   qty: "32kg",  pct: 53, status: "ok",       sug: "—" },
  ];
  const color = (s: string) => (s === "critical" ? "#ff5f57" : s === "low" ? "var(--orange)" : "var(--green)");
  return (
    <div style={{ ...baseCard, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cloud)" }}>Inventory · live</div>
        <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✨ AI reorder $838</div>
      </div>
      {rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--cloud)", marginBottom: 4 }}>
            <span>{r.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--steel)" }}>
              {r.qty}
              <span style={{ color: color(r.status), marginLeft: 8, fontWeight: 700 }}>{r.sug}</span>
            </span>
          </div>
          <div style={{ height: 6, background: "var(--mist-6)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${r.pct}%`, height: "100%", background: color(r.status) }} />
          </div>
        </div>
      ))}
      <button
        style={{
          marginTop: 8,
          width: "100%",
          padding: 10,
          borderRadius: 10,
          background: "var(--green)",
          color: "var(--navy)",
          border: "none",
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
        }}
      >
        Accept AI orders · send to suppliers
      </button>
    </div>
  );
}

function PosVisual() {
  return (
    <div style={baseCard}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--steel)", marginBottom: 14 }}>POS · Order #1294</div>
      {[
        { name: "Margherita Pizza", qty: 2, price: "$38.00" },
        { name: "Garlic Bread", qty: 1, price: "$8.00" },
        { name: "Tiramisu", qty: 1, price: "$12.00" },
      ].map((i) => (
        <div key={i.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--mist-6)", fontSize: 14 }}>
          <span style={{ color: "var(--cloud)" }}>{i.qty}× {i.name}</span>
          <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 600 }}>{i.price}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, alignItems: "center" }}>
        <span style={{ color: "var(--steel)", fontSize: 13 }}>Total inc. GST</span>
        <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 26, color: "var(--green)" }}>$58.00</span>
      </div>
      <button style={{ marginTop: 18, width: "100%", padding: 14, borderRadius: 10, background: "var(--green)", color: "white", border: "none", fontWeight: 700, fontSize: 14 }}>
        Tap to Pay · $58.00
      </button>
    </div>
  );
}

function AppWebVisual() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "stretch", maxWidth: 480, width: "100%" }}>
      <div style={{ ...baseCard, flex: 1, padding: 16 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(0,182,122,0.18), rgba(255,107,53,0.08))", borderRadius: 18, height: 280, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--navy)", fontSize: 14 }}>ZB</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, marginTop: 16 }}>Welcome back, Olivia</div>
            <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 4 }}>340 Winback points</div>
          </div>
          <button style={{ padding: "10px 14px", borderRadius: 10, background: "var(--green)", color: "white", border: "none", fontWeight: 600, fontSize: 12 }}>Reorder favourites</button>
        </div>
        <div style={{ textAlign: "center", color: "var(--steel)", fontSize: 11, marginTop: 8, fontFamily: "var(--font-mono)" }}>iOS / Android</div>
      </div>
      <div style={{ ...baseCard, flex: 1.2, padding: 14 }}>
        <div style={{ height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", color: "var(--steel)" }}>yourrestaurant.com.au</div>
        <div style={{ background: "linear-gradient(180deg, rgba(0,182,122,0.18), transparent)", borderRadius: 12, height: 80, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18 }}>
          Rossi&apos;s Kitchen
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 50, background: "rgba(255,255,255,0.04)", borderRadius: 8 }} />
          ))}
        </div>
        <button style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8, background: "var(--green)", color: "white", border: "none", fontWeight: 600, fontSize: 12 }}>Order now</button>
        <div style={{ textAlign: "center", color: "var(--steel)", fontSize: 11, marginTop: 8, fontFamily: "var(--font-mono)" }}>Custom website</div>
      </div>
    </div>
  );
}

function LiveOrdersVisual() {
  return (
    <div style={baseCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green)", animation: "pulse 1.4s infinite" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>3 NEW · LIVE</span>
      </div>
      {[
        { id: "#1291", name: "Sarah L.", status: "New", color: "var(--green)" },
        { id: "#1290", name: "Marco D.", status: "Cooking", color: "var(--orange)" },
        { id: "#1289", name: "Aisha R.", status: "Out for delivery", color: "var(--steel)" },
      ].map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", marginBottom: 8, background: "var(--navy-40)", border: "1px solid var(--mist-6)", borderRadius: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)" }}>{o.id}</div>
            <div style={{ color: "var(--cloud)", fontSize: 14, fontWeight: 600 }}>{o.name}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: o.color, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid var(--mist-12)" }}>
            {o.status}
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </div>
  );
}

function StorefrontVisual() {
  return (
    <div style={{ ...baseCard, padding: 20 }}>
      <div style={{ background: "linear-gradient(135deg, rgba(0,182,122,0.22), rgba(255,107,53,0.10))", borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cloud)", opacity: 0.8 }}>zentrabite.com/store/rossi</div>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, marginTop: 10 }}>Rossi&apos;s Kitchen</div>
        <div style={{ color: "var(--cloud)", opacity: 0.7, fontSize: 12 }}>Order in 15 min · Apple Pay</div>
      </div>
      {[
        { name: "Margherita", price: "$19" },
        { name: "Pepperoni", price: "$22" },
      ].map((m) => (
        <div key={m.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginBottom: 6, background: "rgba(15,25,42,0.5)", border: "1px solid var(--mist-6)", borderRadius: 10, fontSize: 14 }}>
          <span style={{ color: "var(--cloud)" }}>{m.name}</span>
          <span style={{ color: "var(--green)", fontWeight: 700 }}>{m.price}</span>
        </div>
      ))}
      <button style={{ marginTop: 10, width: "100%", padding: 12, borderRadius: 10, background: "var(--green)", color: "white", border: "none", fontWeight: 700, fontSize: 13 }}>
        Checkout · $41
      </button>
    </div>
  );
}

function WinbackVisual() {
  return (
    <div style={{ ...baseCard, textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "var(--green-15)", border: "1px solid rgba(0,182,122,0.3)", color: "var(--green)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        ★ Gold Tier
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 56, marginTop: 18, color: "var(--cloud)" }}>1,240</div>
      <div style={{ color: "var(--steel)", fontSize: 13 }}>points · $12.40 off next order</div>
      <div style={{ marginTop: 22, padding: 14, background: "var(--navy-40)", borderRadius: 10, border: "1px solid var(--mist-6)" }}>
        <div style={{ fontSize: 13, color: "var(--cloud)", fontWeight: 600 }}>🎂 Birthday in 5 days</div>
        <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>+250 bonus points auto-applied</div>
      </div>
    </div>
  );
}

function DeliveryVisual() {
  return (
    <div style={baseCard}>
      <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 12, fontFamily: "var(--font-mono)" }}>QUOTING — order #1294 — 3.2km</div>
      {[
        { name: "Own driver (Marco)", price: "$3.80", winner: true },
        { name: "Uber Direct", price: "$6.40", winner: false },
        { name: "DoorDash Drive", price: "$5.90", winner: false },
      ].map((o) => (
        <div key={o.name} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", marginBottom: 8, background: o.winner ? "var(--green-15)" : "var(--navy-40)", border: o.winner ? "1px solid rgba(0,182,122,0.4)" : "1px solid var(--mist-6)", borderRadius: 10 }}>
          <span style={{ color: "var(--cloud)", fontSize: 14, fontWeight: o.winner ? 700 : 500 }}>
            {o.winner && "✓ "}{o.name}
          </span>
          <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, color: o.winner ? "var(--green)" : "var(--cloud)" }}>{o.price}</span>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: 10, fontSize: 12, color: "var(--green)", textAlign: "center", fontWeight: 600 }}>
        Auto-dispatched to Marco · Saves $2.10
      </div>
    </div>
  );
}

function AutomationsVisual() {
  return (
    <div style={baseCard}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", marginBottom: 12 }}>WIN-BACK · LIVE</div>
      <div style={{ padding: 14, background: "var(--navy-40)", borderRadius: 10, border: "1px solid var(--mist-6)", marginBottom: 10 }}>
        <div style={{ color: "var(--steel)", fontSize: 11 }}>To: Olivia M. · 12:42pm</div>
        <div style={{ color: "var(--cloud)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
          Hey Olivia, we miss you 🍕 Here&apos;s 20% off your next pizza. Code: WELCOME20
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: 12, background: "var(--navy-40)", borderRadius: 8, border: "1px solid var(--mist-6)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: "var(--green)" }}>23</div>
          <div style={{ fontSize: 11, color: "var(--steel)" }}>Customers reactivated</div>
        </div>
        <div style={{ padding: 12, background: "var(--navy-40)", borderRadius: 8, border: "1px solid var(--mist-6)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: "var(--cloud)" }}>$782</div>
          <div style={{ fontSize: 11, color: "var(--steel)" }}>Recovered this month</div>
        </div>
      </div>
    </div>
  );
}

function StripeVisual() {
  return (
    <div style={baseCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "var(--steel)", fontSize: 13 }}>Available balance</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>● Connected</span>
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 44, color: "var(--cloud)" }}>$3,847.20</div>
      <div style={{ color: "var(--steel)", fontSize: 13, marginBottom: 18 }}>Next payout · tomorrow 9am</div>
      {[
        { date: "Today", value: "+$1,842.50" },
        { date: "Yesterday", value: "+$1,623.00" },
        { date: "Tue, 14 Apr", value: "+$1,498.30" },
      ].map((p) => (
        <div key={p.date} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--mist-6)", fontSize: 13 }}>
          <span style={{ color: "var(--steel)" }}>{p.date}</span>
          <span style={{ color: "var(--green)", fontFamily: "var(--font-outfit)", fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ReportingVisual() {
  return (
    <div style={baseCard}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", marginBottom: 14 }}>MARCH 2026 · MONTHLY</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Revenue", value: "$48,210", color: "var(--cloud)" },
          { label: "Net (after fees)", value: "$45,180", color: "var(--green)" },
          { label: "GST collected", value: "$4,383", color: "var(--cloud)" },
          { label: "Refunds", value: "$172", color: "var(--orange)" },
        ].map((s) => (
          <div key={s.label} style={{ padding: 12, background: "var(--navy-40)", borderRadius: 8, border: "1px solid var(--mist-6)" }}>
            <div style={{ fontSize: 10, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button style={{ width: "100%", padding: 11, borderRadius: 10, background: "var(--green-15)", color: "var(--green)", border: "1px solid rgba(0,182,122,0.4)", fontWeight: 600, fontSize: 13 }}>
        Export to Xero ↓
      </button>
    </div>
  );
}

function CRMVisual() {
  return (
    <div style={baseCard}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", marginBottom: 12 }}>CUSTOMER · OLIVIA M.</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 999, background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy)", fontWeight: 800, fontSize: 20 }}>OM</div>
        <div>
          <div style={{ color: "var(--cloud)", fontWeight: 700, fontSize: 16 }}>Olivia Martin</div>
          <div style={{ color: "var(--steel)", fontSize: 12 }}>VIP · 24 orders · $1,418 LTV</div>
        </div>
      </div>
      {[
        { label: "Favourite item", value: "Margherita Pizza" },
        { label: "Last order", value: "3 days ago" },
        { label: "Avg. order", value: "$59.10" },
        { label: "Birthday", value: "May 12" },
      ].map((r) => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
          <span style={{ color: "var(--steel)" }}>{r.label}</span>
          <span style={{ color: "var(--cloud)", fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function OutroVisual() {
  return (
    <div
      style={{
        ...baseCard,
        textAlign: "center",
        padding: "48px 32px",
        background: "linear-gradient(135deg, rgba(0,182,122,0.22), rgba(28,45,72,0.55))",
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 16 }}>🚀</div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 26, color: "var(--cloud)" }}>
        Ready to launch?
      </div>
      <div style={{ color: "var(--steel)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
        Try the live demo dashboard with sample data, or start your free trial now.
      </div>
    </div>
  );
}
