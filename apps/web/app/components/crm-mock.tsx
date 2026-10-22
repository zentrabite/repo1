import { Icon, type IconName } from "./zb-icon";

// A drawing of the CRM's Customers page for the homepage hero. Made-up data
// for a made-up pizzeria. Styles are .mock* in globals.css.

const NAV: { icon: IconName; label: string; on?: boolean }[] = [
  { icon: "dashboard", label: "Dashboard" },
  { icon: "orders", label: "Orders" },
  { icon: "customers", label: "Customers", on: true },
  { icon: "rewards", label: "Rewards" },
  { icon: "return", label: "Win-back" },
  { icon: "analytics", label: "Analytics" },
];

const ROWS: { name: string; visits: string; last: string; status: "active" | "lapsing" | "lapsed"; label: string }[] = [
  { name: "Olivia M.", visits: "23 orders", last: "4 days ago", status: "active", label: "Regular" },
  { name: "James K.", visits: "11 orders", last: "19 days ago", status: "lapsing", label: "Going quiet" },
  { name: "Priya S.", visits: "31 orders", last: "26 days ago", status: "lapsing", label: "Going quiet" },
  { name: "Nathan C.", visits: "6 orders", last: "2 months ago", status: "lapsed", label: "Lapsed" },
];

export function CrmMock() {
  return (
    <div
      className="mock"
      role="img"
      aria-label="The ZentraBite CRM showing a customer list. Two regulars are marked as going quiet and a win-back text is ready to send."
    >
      <div className="mock-bar">
        <div className="mock-url">dashboard.zentrabite.com</div>
      </div>
      <div className="mock-body">
        <div className="mock-side">
          <div className="mock-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/zentrabite-icon.svg" alt="" width={20} height={20} />
            Nonna&apos;s Kitchen
          </div>
          {NAV.map((n) => (
            <div key={n.label} className={`mock-nav${n.on ? " on" : ""}`}>
              <Icon name={n.icon} size={16} />
              {n.label}
            </div>
          ))}
        </div>
        <div className="mock-main">
          <div className="mock-head">
            <div className="mock-title">Customers</div>
            <div style={{ color: "var(--m-text-3)", fontSize: 12 }}>412 people</div>
          </div>
          <div className="mock-stats">
            <div className="mock-stat">
              <span style={{ color: "var(--m-text-3)", fontSize: 12 }}>Regulars</span>
              <b>186</b>
            </div>
            <div className="mock-stat">
              <span style={{ color: "var(--m-text-3)", fontSize: 12 }}>Going quiet</span>
              <b style={{ color: "#ff9a70" }}>14</b>
            </div>
            <div className="mock-stat">
              <span style={{ color: "var(--m-text-3)", fontSize: 12 }}>Birthdays</span>
              <b>5</b>
            </div>
          </div>
          <div className="mock-table">
            <div className="mock-row">
              <span>Customer</span>
              <span>Orders</span>
              <span>Last order</span>
              <span>Status</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.name} className="mock-row">
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span className="sub">{r.visits}</span>
                <span className="sub">{r.last}</span>
                <span className={`mock-pill ${r.status}`}>{r.label}</span>
              </div>
            ))}
          </div>
          <div className="mock-callout">
            <div>
              <div style={{ fontWeight: 600 }}>Win-back text ready</div>
              <span>14 regulars, sending Thursday at 4pm</span>
            </div>
            <div className="mock-btn">Review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
