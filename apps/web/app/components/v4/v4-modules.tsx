type Mod = {
  icon: string;
  name: string;
  detail: string;
  badge: "live" | "ai";
  badgeLabel: string;
};

const MODULES: Mod[] = [
  {
    icon: "📦",
    name: "Order Management",
    detail:
      "Real-time board across POS, storefront & aggregators. Auto-updates kitchen, dispatch & stock.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "👥",
    name: "Customer CRM",
    detail:
      "Full profiles with LTV, visit frequency, churn risk score & auto-segments (VIP, at-risk, lapsed).",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "⭐",
    name: "Rewards Engine",
    detail:
      "Points-per-dollar, Bronze → Platinum tiers, free-item redemptions. Customers actually understand it.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "📣",
    name: "Campaigns",
    detail:
      "SMS, email & AI voice campaigns triggered by customer behaviour. Every send tracked to revenue.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🤖",
    name: "AI Co-pilot",
    detail:
      "Daily 7 AM brief. AI voice win-back calls. Menu, stock & staffing recommendations from real data.",
    badge: "ai",
    badgeLabel: "✦ AI",
  },
  {
    icon: "🏪",
    name: "POS",
    detail:
      "Table orders, walk-ins & split bills. Syncs instantly to the order board, stock & financials.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🛍️",
    name: "Online Storefront",
    detail:
      "Branded ordering page, no third-party fees. Direct orders captured into CRM automatically.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🚚",
    name: "Delivery & Dispatch",
    detail:
      "Driver assignment, live ETA tracking, and customer SMS notifications — all in one screen.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "📦",
    name: "Stock & Inventory",
    detail:
      "Par-level alerts, auto-deduction per order, supplier reorder suggestions. Never 86 an item again.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "💰",
    name: "Financials",
    detail:
      "Daily P&L, channel breakdown, cost-of-goods, and tax-ready exports. No separate accounting app needed.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🍽️",
    name: "Menu Management",
    detail:
      "One menu, every channel. Update once and prices sync across POS, storefront & aggregators instantly.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "📊",
    name: "Analytics",
    detail:
      "Revenue by hour, day & channel. Top items, table turns, repeat rate. Drill to any transaction.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🔔",
    name: "Win-back Automations",
    detail:
      "Day-14 lapse trigger: AI call → SMS → $5 off. Fully automated. Avg $4,280/mo recovered.",
    badge: "ai",
    badgeLabel: "✦ AI",
  },
  {
    icon: "📋",
    name: "Kitchen Display",
    detail:
      "Real-time ticket display for kitchen staff. Status updates flow back to dispatch and customer SMS.",
    badge: "live",
    badgeLabel: "● Live",
  },
  {
    icon: "🔗",
    name: "Aggregator Sync",
    detail:
      "Uber Eats, DoorDash & Menulog orders pull into one board. Compare channel profitability side-by-side.",
    badge: "live",
    badgeLabel: "● Live",
  },
];

export function V4Modules() {
  return (
    <section id="modules">
      <div className="mod-inner">
        <div className="mod-head reveal">
          <div>
            <div className="s-eyebrow" style={{ marginBottom: 12 }}>
              The platform
            </div>
            <h2 className="mod-h2">
              15 modules. One login.
              <br />
              Everything connected.
            </h2>
          </div>
          <p className="mod-sub">
            Every module shares the same customer, order, and financial data —
            no integrations, no double-entry, no gaps.
          </p>
        </div>
        <div className="mod-grid reveal">
          {MODULES.map((m) => (
            <div key={m.name} className="mod-card">
              <div className="mod-ico">{m.icon}</div>
              <div className="mod-name">{m.name}</div>
              <div className="mod-detail">{m.detail}</div>
              <span className={`mod-badge ${m.badge}`}>{m.badgeLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
