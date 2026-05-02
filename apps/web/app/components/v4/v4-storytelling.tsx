/**
 * "Every part of your business, in one system" — sticky-nav storytelling
 * section with 5 panels (Orders / Customers / AI / Rewards / Campaigns).
 *
 * The active panel is set by V4Effects' IntersectionObserver scroll-spy.
 */
export function V4Storytelling() {
  return (
    <section id="storytelling">
      <div className="story-inner">
        <div className="story-heading reveal">
          <div className="s-eyebrow">Deep dive</div>
          <h2 className="s-h2">
            Every part of your business,
            <br />
            in one system.
          </h2>
          <p className="s-p">
            Change an order status and the stock, dispatch, and customer record
            all update automatically.
          </p>
        </div>

        <div className="story-layout">
          <div className="story-nav" id="storyNav">
            <NavItem
              panel="orders"
              title="Order Management"
              sub="Real-time · multi-channel"
              active
            />
            <NavItem
              panel="customers"
              title="Customer CRM"
              sub="Profiles · LTV · churn risk"
            />
            <NavItem panel="ai" title="AI Co-pilot" sub="Daily brief · voice calls" />
            <NavItem
              panel="rewards"
              title="Rewards Engine"
              sub="Tiers · points · redemptions"
            />
            <NavItem
              panel="campaigns"
              title="Campaigns & Zentra Rewards"
              sub="SMS · email · AI calls"
            />
          </div>

          <div className="story-content" id="storyContent">
            <OrdersPanel />
            <CustomersPanel />
            <AiPanel />
            <RewardsPanel />
            <CampaignsPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

function NavItem({
  panel,
  title,
  sub,
  active = false,
}: {
  panel: string;
  title: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`story-nav-item${active ? " active" : ""}`}
      data-panel={panel}
    >
      <div className="story-nav-title">{title}</div>
      <div className="story-nav-sub">{sub}</div>
    </div>
  );
}

function Chrome({ url }: { url: string }) {
  return (
    <div className="s-chrome">
      <span className="s-dot" style={{ background: "#ff5f57" }} />
      <span className="s-dot" style={{ background: "#febc2e" }} />
      <span className="s-dot" style={{ background: "#28c840" }} />
      <div className="s-url">{url}</div>
    </div>
  );
}

function OrdersPanel() {
  return (
    <div className="story-panel active" data-panel="orders">
      <div className="story-panel-inner">
        <div className="story-panel-header">
          <div className="story-panel-eyebrow">📦 Order Management</div>
          <h3 className="story-panel-title">
            Every order, in real time.
            <br />
            Across every channel.
          </h3>
          <p className="story-panel-desc">
            Your POS, storefront, and third-party aggregators all feed the same
            board. Status changes trigger kitchen screens, driver dispatch,
            stock deductions, and customer SMS automatically — nothing falls
            through.
          </p>
        </div>
        <div className="panel-bullets">
          <div className="pb">
            <span className="pb-ico">🔄</span>
            <span>One board for POS, storefront, Uber Eats, DoorDash & Menulog — no switching apps</span>
          </div>
          <div className="pb">
            <span className="pb-ico">⚡</span>
            <span>Status change triggers kitchen display, driver dispatch, stock deduction & SMS in one action</span>
          </div>
          <div className="pb">
            <span className="pb-ico">📊</span>
            <span>Live stats: revenue, avg ticket, order count, and top items — updated every 30 seconds</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🚨</span>
            <span>Alerts when an item is low-stock mid-service, before you 86 it and lose revenue</span>
          </div>
        </div>
        <div className="story-screen">
          <Chrome url="dashboard.zentrabite.com.au/orders" />
          <div className="s-body">
            <div className="screen-orders">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div className="db-s">
                  <div className="db-sl">Live orders</div>
                  <div className="db-sv g">7</div>
                </div>
                <div className="db-s">
                  <div className="db-sl">Revenue today</div>
                  <div className="db-sv">$1,842</div>
                </div>
                <div className="db-s">
                  <div className="db-sl">Avg ticket</div>
                  <div className="db-sv">$38.20</div>
                </div>
              </div>
              <OrderRow
                id="#1289"
                name="Olivia M."
                items="2× Margherita · Garlic bread"
                amount="$42.50"
                tag="New"
                tone="green"
              />
              <OrderRow
                id="#1288"
                name="James K."
                items="Wagyu burger · Fries · Coke"
                amount="$31.80"
                tag="Cooking"
                tone="orange"
              />
              <OrderRow
                id="#1287"
                name="Priya S."
                items="3× Pad thai · Spring rolls"
                amount="$58.40"
                tag="On the way"
                tone="steel"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ORDER_TONES = {
  green: { bg: "rgba(0,182,122,0.14)", color: "#00b67a", border: "1px solid rgba(0,182,122,0.28)" },
  orange: { bg: "rgba(255,107,53,0.14)", color: "#ff6b35", border: "1px solid rgba(255,107,53,0.28)" },
  steel: { bg: "rgba(107,124,147,0.14)", color: "#6b7c93", border: "1px solid rgba(107,124,147,0.22)" },
} as const;

function OrderRow({
  id,
  name,
  items,
  amount,
  tag,
  tone,
}: {
  id: string;
  name: string;
  items: string;
  amount: string;
  tag: string;
  tone: keyof typeof ORDER_TONES;
}) {
  const t = ORDER_TONES[tone];
  return (
    <div className="db-order">
      <div className="db-oid">{id}</div>
      <div>
        <div className="db-oname">{name}</div>
        <div className="db-oitems">{items}</div>
      </div>
      <div className="db-oamt">{amount}</div>
      <div className="db-tag" style={{ background: t.bg, color: t.color, border: t.border }}>
        {tag}
      </div>
    </div>
  );
}

function CustomersPanel() {
  return (
    <div className="story-panel" data-panel="customers">
      <div className="story-panel-inner">
        <div className="story-panel-header">
          <div className="story-panel-eyebrow">👥 Customer CRM</div>
          <h3 className="story-panel-title">
            Know every customer.
            <br />
            Keep the good ones.
          </h3>
          <p className="story-panel-desc">
            Full profiles with spend history, visit frequency, lifetime value,
            and order patterns. Automatic segments for high-value, at-risk, and
            lapsed customers — ready to target instantly.
          </p>
        </div>
        <div className="panel-bullets">
          <div className="pb">
            <span className="pb-ico">📈</span>
            <span>Lifetime value, churn risk score, and favourite items calculated automatically per customer</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🏷️</span>
            <span>Auto-segments: VIP (top 10%), At-risk (dropping off), Lapsed (21+ days), First-timer</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🔍</span>
            <span>Search any customer and see their full order history, rewards balance, and AI recommendations</span>
          </div>
          <div className="pb">
            <span className="pb-ico">📞</span>
            <span>One-click to fire a personalised SMS, trigger an AI call, or add them to a campaign</span>
          </div>
        </div>
        <div className="story-screen">
          <Chrome url="dashboard.zentrabite.com.au/customers/priya-s" />
          <div className="s-body">
            <div className="screen-customers">
              <div className="cust-profile">
                <div className="cust-avatar">😊</div>
                <div className="cust-name">Priya S.</div>
                <div className="cust-meta">Member since Jan 2024 · Gold tier</div>
                <div className="cust-stats">
                  <Stat label="Lifetime value" value="$2,840" green />
                  <Stat label="Total orders" value="64" />
                  <Stat label="Avg order" value="$44.40" />
                  <Stat label="Last order" value="2 days ago" />
                  <div className="cust-stat">
                    <span className="cust-stat-l">Churn risk</span>
                    <span className="cust-stat-v" style={{ color: "#00b67a" }}>
                      Low
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="db-s">
                  <div className="db-sl">Favourite item</div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--cl)",
                      marginTop: 4,
                    }}
                  >
                    🍜 Pad Thai (ordered 28×)
                  </div>
                </div>
                <div className="db-s">
                  <div className="db-sl">Reward points</div>
                  <div className="db-sv g">2,840 pts</div>
                </div>
                <div className="db-s">
                  <div className="db-sl">Next reward</div>
                  <div style={{ fontSize: 10.5, color: "var(--cl)", marginTop: 4 }}>
                    Free dessert at 3,000 pts
                    <div
                      style={{
                        marginTop: 5,
                        height: 3,
                        background: "rgba(226,232,240,0.08)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: "94%",
                          height: "100%",
                          background: "var(--g)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="db-s">
                  <div className="db-sl">AI recommendation</div>
                  <div style={{ fontSize: 10.5, color: "var(--g)", marginTop: 4 }}>
                    ✨ Send &ldquo;almost there&rdquo; SMS — 160pts from Platinum
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="cust-stat">
      <span className="cust-stat-l">{label}</span>
      <span className={`cust-stat-v${green ? " g" : ""}`}>{value}</span>
    </div>
  );
}

function AiPanel() {
  return (
    <div className="story-panel" data-panel="ai">
      <div className="story-panel-inner">
        <div className="story-panel-header">
          <div className="story-panel-eyebrow">🤖 AI Co-pilot</div>
          <h3 className="story-panel-title">
            Your business, briefed
            <br />
            every morning.
          </h3>
          <p className="story-panel-desc">
            The AI scans your orders, customers, and stock overnight and
            delivers 5 actionable insights at 7 AM. It also makes AI voice
            calls to lapsed customers automatically and logs every outcome.
          </p>
        </div>
        <div className="panel-bullets">
          <div className="pb">
            <span className="pb-ico">🌅</span>
            <span>7 AM daily brief: top 5 actions ranked by revenue impact, specific to your business</span>
          </div>
          <div className="pb">
            <span className="pb-ico">📞</span>
            <span>AI voice calls lapsed customers at day 14 — sounds human, logs outcome, sends SMS fallback</span>
          </div>
          <div className="pb">
            <span className="pb-ico">💡</span>
            <span>Menu, stock, staffing, and campaign suggestions — all backed by your actual sales data</span>
          </div>
          <div className="pb">
            <span className="pb-ico">📉</span>
            <span>Revenue anomaly detection: flags dips before you notice them and tells you the root cause</span>
          </div>
        </div>
        <div className="story-screen">
          <Chrome url="dashboard.zentrabite.com.au/ai" />
          <div className="s-body">
            <div className="ai-brief-card">
              <div className="ai-brief-head">
                <span className="ai-brief-dot" />
                AI Daily Brief · Mon 28 Apr · 7:00 AM
              </div>
              <AiInsight>
                42 customers haven&rsquo;t ordered in 21+ days.{" "}
                <strong>AI calling starts at 10 AM</strong> — expected $340
                recovered.
              </AiInsight>
              <AiInsight>
                Saturday revenue down 18%. <strong>Burger stock ran out</strong>{" "}
                at 7 PM — raise par 40% next week.
              </AiInsight>
              <AiInsight>
                Priya S. is 160pts from Platinum. A{" "}
                <strong>personal SMS tonight</strong> could lock in Q2 loyalty.
              </AiInsight>
              <AiInsight>
                Uber Eats fees up 2.1%. <strong>14 customers</strong> could
                switch to direct — campaign queued.
              </AiInsight>
              <AiInsight>
                Tuesday 6–8 PM is your quietest slot. A $5 off campaign ={" "}
                <strong>~$280 extra revenue</strong>.
              </AiInsight>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiInsight({ children }: { children: React.ReactNode }) {
  return (
    <div className="ai-item">
      <div className="ai-dot" />
      <div>{children}</div>
    </div>
  );
}

function RewardsPanel() {
  return (
    <div className="story-panel" data-panel="rewards">
      <div className="story-panel-inner">
        <div className="story-panel-header">
          <div className="story-panel-eyebrow">⭐ Rewards Engine</div>
          <h3 className="story-panel-title">
            Earn points. Unlock tiers.
            <br />
            Redeem free items.
          </h3>
          <p className="story-panel-desc">
            Transparent, motivating rewards your customers actually understand.
            Every order earns points, tiers unlock real perks, and redemptions
            drive repeat visits — not confusion.
          </p>
        </div>
        <div className="panel-bullets">
          <div className="pb">
            <span className="pb-ico">🎯</span>
            <span>Configurable earn rate per tier — 1pt/$ Bronze, 1.5pt/$ Silver, 2pt/$ Gold & Platinum</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🎁</span>
            <span>Free-item redemptions, birthday bonuses, priority queuing, and VIP-only offers per tier</span>
          </div>
          <div className="pb">
            <span className="pb-ico">📱</span>
            <span>Customers track points via SMS link — no app download required. Frictionless by design.</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🔔</span>
            <span>AI auto-sends &ldquo;almost there&rdquo; nudge when a customer is within 200pts of the next tier</span>
          </div>
        </div>
        <div className="story-screen">
          <Chrome url="dashboard.zentrabite.com.au/rewards" />
          <div className="s-body">
            <div className="screen-rewards">
              <div className="tier-card">
                <div className="tier-icon">🥉</div>
                <div className="tier-name">Bronze</div>
                <div className="tier-pts">0 – 999 pts</div>
                <div className="tier-bar">
                  <div
                    className="tier-fill"
                    style={{
                      width: "100%",
                      background: "linear-gradient(90deg,#cd7f32,#e8a87c)",
                    }}
                  />
                </div>
                <div className="tier-perks">
                  <div className="tier-perk">✓ 1pt per $1 spent</div>
                  <div className="tier-perk">✓ Birthday bonus</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--st)", marginTop: 7 }}>
                  186 members
                </div>
              </div>
              <div
                className="tier-card"
                style={{
                  borderColor: "rgba(0,182,122,0.25)",
                  background: "rgba(0,182,122,0.06)",
                }}
              >
                <div className="tier-icon">🥈</div>
                <div className="tier-name" style={{ color: "var(--g)" }}>
                  Silver
                </div>
                <div className="tier-pts">1,000 – 2,499 pts</div>
                <div className="tier-bar">
                  <div
                    className="tier-fill"
                    style={{
                      width: "100%",
                      background: "linear-gradient(90deg,#8a9ba8,#c0cfd8)",
                    }}
                  />
                </div>
                <div className="tier-perks">
                  <div className="tier-perk">✓ 1.5pts per $1</div>
                  <div className="tier-perk">✓ Free delivery</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--g)", marginTop: 7 }}>
                  34 members
                </div>
              </div>
              <div className="tier-card">
                <div className="tier-icon">🥇</div>
                <div className="tier-name">Gold</div>
                <div className="tier-pts">2,500+ pts</div>
                <div className="tier-bar">
                  <div
                    className="tier-fill"
                    style={{
                      width: "100%",
                      background: "linear-gradient(90deg,#f0a500,#ffd700)",
                    }}
                  />
                </div>
                <div className="tier-perks">
                  <div className="tier-perk">✓ 2pts per $1</div>
                  <div className="tier-perk">✓ Priority support</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--st)", marginTop: 7 }}>
                  16 members
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignsPanel() {
  return (
    <div className="story-panel" data-panel="campaigns">
      <div className="story-panel-inner">
        <div className="story-panel-header">
          <div className="story-panel-eyebrow">📣 Campaigns & Zentra Rewards</div>
          <h3 className="story-panel-title">
            Automated campaigns that
            <br />
            run while you sleep.
          </h3>
          <p className="story-panel-desc">
            SMS, email, and AI voice campaigns triggered by customer behaviour
            — churn risk, first order, tier unlock, quiet period. Set it once
            and let it run. Every send is tracked to revenue.
          </p>
        </div>
        <div className="panel-bullets">
          <div className="pb">
            <span className="pb-ico">🤖</span>
            <span>AI voice calls lapsed customers — sounds natural, logs the conversation, SMS fallback if no answer</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🧠</span>
            <span>Behaviour triggers: first order, 14-day lapse, tier unlock, birthday, unredeemed rewards</span>
          </div>
          <div className="pb">
            <span className="pb-ico">💸</span>
            <span>Every campaign tied to revenue — see exact ROI per message, per campaign, per customer segment</span>
          </div>
          <div className="pb">
            <span className="pb-ico">🎯</span>
            <span>Quiet-slot promo: AI identifies your slowest hour and auto-creates a targeted offer to fill it</span>
          </div>
        </div>
        <div className="story-screen">
          <Chrome url="dashboard.zentrabite.com.au/campaigns" />
          <div className="s-body">
            <div className="screen-campaigns">
              <Campaign
                name="Zentra Rewards: 21-day lapse"
                meta="AI voice call → SMS fallback · Auto-trigger"
                statusColor="#00b67a"
                statusBg="rgba(0,182,122,0.12)"
                value="$4,280"
                valueLabel="recovered"
                statusLabel="● Active"
              />
              <Campaign
                name="First-order follow-up"
                meta='SMS at +2h · "How was it?" + 50pt bonus'
                statusColor="#00b67a"
                statusBg="rgba(0,182,122,0.12)"
                value="68%"
                valueLabel="2nd order rate"
                statusLabel="● Active"
              />
              <Campaign
                name="Tuesday quiet-slot promo"
                meta="SMS · $5 off 6–8 PM · 180 recipients"
                statusColor="#ff6b35"
                statusBg="rgba(255,107,53,0.12)"
                value="$940"
                valueLabel="projected"
                statusLabel="⏸ Scheduled"
              />
              <Campaign
                name="Gold tier upgrade"
                meta="Auto-SMS when 160pts from Platinum"
                statusColor="#00b67a"
                statusBg="rgba(0,182,122,0.12)"
                value="+23%"
                valueLabel="repeat rate"
                statusLabel="● Active"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campaign({
  name,
  meta,
  statusLabel,
  statusColor,
  statusBg,
  value,
  valueLabel,
}: {
  name: string;
  meta: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  value: string;
  valueLabel: string;
}) {
  return (
    <div className="campaign-card">
      <div>
        <div className="camp-name">{name}</div>
        <div className="camp-meta">{meta}</div>
        <div className="camp-status" style={{ background: statusBg, color: statusColor }}>
          {statusLabel}
        </div>
      </div>
      <div className="camp-sent">
        <div className="camp-sent-n">{value}</div>
        <div className="camp-sent-l">{valueLabel}</div>
      </div>
    </div>
  );
}
