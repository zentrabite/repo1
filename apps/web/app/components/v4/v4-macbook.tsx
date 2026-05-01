export function V4Macbook() {
  return (
    <section id="macbook-section">
      <div className="macbook-wrap">
        <div className="macbook-tilt" id="mbTilt">
          <div className="mb-outer">
            <div className="mb-lid">
              <div className="mb-bezel">
                <div className="mb-camera" />
                <div className="mb-screen">
                  <div className="db-wrap">
                    <div className="db-nav">
                      <div className="db-nav-section">Main</div>
                      <div className="db-nav-item on">📦 Orders</div>
                      <div className="db-nav-item">👥 Customers</div>
                      <div className="db-nav-item">🍽️ Menu</div>
                      <div className="db-nav-section">Grow</div>
                      <div className="db-nav-item">📣 Campaigns</div>
                      <div className="db-nav-item">⭐ Rewards</div>
                      <div className="db-nav-item">🤖 AI Calls</div>
                      <div className="db-nav-section">Ops</div>
                      <div className="db-nav-item">🚚 Delivery</div>
                      <div className="db-nav-item">💰 Financials</div>
                      <div className="db-nav-item">📦 Stock</div>
                      <div className="db-nav-item">🏪 POS</div>
                    </div>
                    <div className="db-main">
                      <div className="db-topbar">
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div className="db-page-title">Orders</div>
                          <div className="db-live">
                            <span className="db-live-dot" />
                            Live
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: "var(--st)" }}>
                          Mon 28 Apr · 12:34 PM
                        </div>
                      </div>
                      <div className="db-stats">
                        <div className="db-s">
                          <div className="db-sl">Live orders</div>
                          <div className="db-sv g">7</div>
                        </div>
                        <div className="db-s">
                          <div className="db-sl">Revenue today</div>
                          <div className="db-sv">$1,842</div>
                        </div>
                        <div className="db-s">
                          <div className="db-sl">Avg. ticket</div>
                          <div className="db-sv">$38.20</div>
                        </div>
                        <div className="db-s">
                          <div className="db-sl">Customers</div>
                          <div className="db-sv">48</div>
                        </div>
                      </div>
                      <div className="db-orders">
                        <Order
                          id="#1289"
                          name="Olivia M."
                          items="2× Margherita · Garlic bread"
                          amount="$42.50"
                          tag="New"
                          tone="green"
                        />
                        <Order
                          id="#1288"
                          name="James K."
                          items="Wagyu burger · Fries · Coke"
                          amount="$31.80"
                          tag="Cooking"
                          tone="orange"
                        />
                        <Order
                          id="#1287"
                          name="Priya S."
                          items="3× Pad thai · Spring rolls"
                          amount="$58.40"
                          tag="On the way"
                          tone="steel"
                        />
                        <Order
                          id="#1286"
                          name="Nathan C."
                          items="1× Chicken pesto pasta"
                          amount="$24.00"
                          tag="Ready"
                          tone="blue"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-hinge" />
            <div className="mb-base">
              <div className="mb-trackpad" />
              <div className="mb-foot-left" />
              <div className="mb-foot-right" />
            </div>
            <div className="mb-glow" />
          </div>
        </div>
      </div>
    </section>
  );
}

const TONES = {
  green: {
    bg: "rgba(0,182,122,0.14)",
    color: "#00b67a",
    border: "1px solid rgba(0,182,122,0.28)",
  },
  orange: {
    bg: "rgba(255,107,53,0.14)",
    color: "#ff6b35",
    border: "1px solid rgba(255,107,53,0.28)",
  },
  steel: {
    bg: "rgba(107,124,147,0.14)",
    color: "#6b7c93",
    border: "1px solid rgba(107,124,147,0.22)",
  },
  blue: {
    bg: "rgba(91,156,246,0.12)",
    color: "#5b9cf6",
    border: "1px solid rgba(91,156,246,0.25)",
  },
} as const;

function Order({
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
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className="db-order">
      <div className="db-oid">{id}</div>
      <div>
        <div className="db-oname">{name}</div>
        <div className="db-oitems">{items}</div>
      </div>
      <div className="db-oamt">{amount}</div>
      <div
        className="db-tag"
        style={{ background: t.bg, color: t.color, border: t.border }}
      >
        {tag}
      </div>
    </div>
  );
}
