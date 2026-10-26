import { Icon, type IconName } from "./zb-icon";

// A drawing of the CRM's Customers page for the homepage hero, with made-up
// data for a made-up pizzeria. `stage` drives the win-back story played by
// HeroStory. Styles are .mock* in globals.css.
//
// 0  normal list
// 1  James has gone quiet
// 2  a win-back text is ready
// 3  the text has been sent
// 4  James ordered again

const NAV: { icon: IconName; label: string; on?: boolean }[] = [
  { icon: "dashboard", label: "Dashboard" },
  { icon: "orders", label: "Orders" },
  { icon: "customers", label: "Customers", on: true },
  { icon: "rewards", label: "Rewards" },
  { icon: "return", label: "Win-back" },
  { icon: "analytics", label: "Analytics" },
];

type Status = "active" | "lapsing" | "lapsed" | "back";
type Row = { name: string; visits: string; last: string; status: Status; label: string };

const BASE: Row[] = [
  { name: "Olivia M.", visits: "23 orders", last: "4 days ago", status: "active", label: "Regular" },
  { name: "James K.", visits: "11 orders", last: "19 days ago", status: "active", label: "Regular" },
  { name: "Priya S.", visits: "31 orders", last: "26 days ago", status: "lapsing", label: "Going quiet" },
  { name: "Nathan C.", visits: "6 orders", last: "2 months ago", status: "lapsed", label: "Lapsed" },
];

function rowsFor(stage: number): Row[] {
  return BASE.map((r) => {
    if (r.name !== "James K.") return r;
    if (stage >= 4) return { ...r, visits: "12 orders", last: "Just now", status: "back", label: "Came back" };
    if (stage >= 1) return { ...r, status: "lapsing", label: "Going quiet" };
    return r;
  });
}

export function CrmMock({ stage = 0 }: { stage?: number }) {
  const rows = rowsFor(stage);
  const quiet = stage >= 1 && stage < 4 ? 14 : 13;
  return (
    <div className="mock" aria-hidden>
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
            <div className={`mock-stat${stage >= 1 && stage < 4 ? " bump" : ""}`}>
              <span style={{ color: "var(--m-text-3)", fontSize: 12 }}>Going quiet</span>
              <b style={{ color: "#ff9a70" }}>{quiet}</b>
            </div>
            <div className="mock-stat">
              <span style={{ color: "var(--m-text-3)", fontSize: 12 }}>Birthdays</span>
              <b>5</b>
            </div>
          </div>
          <div className="mock-table">
            <div className="mock-row">
              <span>Customer</span>
              <span>Last order</span>
              <span>Status</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.name}
                className={`mock-row${r.name === "James K." && stage >= 1 ? " focus" : ""}`}
              >
                <span>
                  <span style={{ fontWeight: 600, display: "block" }}>{r.name}</span>
                  <span className="sub">{r.visits}</span>
                </span>
                <span className="sub">{r.last}</span>
                <span className={`mock-pill ${r.status}`}>{r.label}</span>
              </div>
            ))}
          </div>
          <div className={`mock-callout${stage >= 2 ? " show" : ""}`}>
            <div>
              <div style={{ fontWeight: 600 }}>{stage >= 3 ? "Win-back text sent" : "Win-back text ready"}</div>
              <span>{stage >= 3 ? "James K. and 13 other regulars" : "14 regulars who've gone quiet"}</span>
            </div>
            <div className={`mock-btn${stage >= 3 ? " done" : ""}`}>{stage >= 3 ? "Sent ✓" : "Send"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
