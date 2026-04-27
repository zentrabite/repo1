import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { Expandable } from "../components/expandable";

type FlowNode = { id: string; label: string; sub?: string; color?: string };
type FlowEdge = { from: string; to: string; label?: string };

export default function HowItWorksPage() {
  return (
    <>
      <Nav />
      <main style={{ paddingTop: 120, paddingBottom: 120, background: "var(--near-black)" }} className="grid-bg">
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>How it works</div>
            <h1 style={{ fontSize: "clamp(34px, 5.5vw, 52px)", margin: "0 0 14px", lineHeight: 1.08 }}>
              Six connected systems.
            </h1>
            <p style={{ fontSize: 16, color: "var(--steel)" }}>
              Tap any one to see the diagram.
            </p>
          </div>

          <FlowSection
            num="01"
            title="Order flow"
            tagline="From customer tap to completed delivery — every event is observable."
            body="A customer places an order on the storefront or app. The payment goes through Stripe. The moment the payment intent succeeds, the Supabase realtime channel fans the event out: your CRM board lights up, the kitchen ticket prints, stock auto-deducts from the recipe table, loyalty points credit to the customer, and the notification log records it all."
            nodes={[
              { id: "c", label: "Customer", sub: "web / app", color: "var(--orange)" },
              { id: "pay", label: "Stripe", sub: "payment intent" },
              { id: "o", label: "Orders DB", sub: "realtime row" },
              { id: "crm", label: "CRM", sub: "orders board", color: "var(--green)" },
              { id: "kds", label: "Kitchen", sub: "KDS ticket" },
              { id: "stk", label: "Stock", sub: "auto-deduct" },
              { id: "loy", label: "Loyalty", sub: "points credit" },
              { id: "drv", label: "Driver", sub: "dispatch" },
            ]}
            edges={[
              { from: "c", to: "pay" },
              { from: "pay", to: "o" },
              { from: "o", to: "crm" },
              { from: "o", to: "kds" },
              { from: "o", to: "stk" },
              { from: "o", to: "loy" },
              { from: "crm", to: "drv" },
            ]}
          />

          <FlowSection
            num="02"
            title="Rewards engine"
            tagline="No confusing 'pay with points'. Earn, unlock tier, redeem specific rewards."
            body="Every qualifying action writes to loyalty_transactions with points and a reason. A background job recomputes the customer's tier based on trailing-12-month spend. Redemptions unlock specific rewards (free coffee, free main, delivery credit) — they're never a vague currency at checkout. That keeps the math legible to both the customer and the owner."
            nodes={[
              { id: "act", label: "Action", sub: "order, review, referral", color: "var(--orange)" },
              { id: "pts", label: "Points", sub: "loyalty_transactions" },
              { id: "tier", label: "Tier", sub: "Regular → Silver → Gold", color: "var(--green)" },
              { id: "unl", label: "Unlocked rewards", sub: "specific items" },
              { id: "red", label: "Redeem", sub: "voucher code" },
              { id: "ck", label: "Checkout", sub: "applied" },
            ]}
            edges={[
              { from: "act", to: "pts" },
              { from: "pts", to: "tier" },
              { from: "tier", to: "unl" },
              { from: "unl", to: "red" },
              { from: "red", to: "ck" },
            ]}
          />

          <FlowSection
            num="03"
            title="Campaigns & automations"
            tagline="Triggers fire segments fire channels fire attributions."
            body="Automations are event-driven: a customer hits 30 days without ordering, a VIP has a birthday, a stock item goes critical. The rule engine matches them to a segment, waits out any delay, picks a channel (SMS, email, push), and sends. Every send opens a 7-day attribution window so you can see revenue recovered per campaign."
            nodes={[
              { id: "evt", label: "Event", sub: "order, time, customer", color: "var(--orange)" },
              { id: "rule", label: "Rule match", sub: "segment + delay" },
              { id: "ch", label: "Channel", sub: "SMS / email / push" },
              { id: "send", label: "Send", sub: "Twilio / Resend", color: "var(--green)" },
              { id: "att", label: "Attribution", sub: "7-day window" },
              { id: "rev", label: "Revenue linked", sub: "back to customer" },
            ]}
            edges={[
              { from: "evt", to: "rule" },
              { from: "rule", to: "ch" },
              { from: "ch", to: "send" },
              { from: "send", to: "att" },
              { from: "att", to: "rev" },
            ]}
          />

          <FlowSection
            num="04"
            title="AI voice calls"
            tagline="A phone line your customers will actually trust."
            body="Inbound calls hit a Twilio number. The AI agent classifies intent (place an order, check status, speak to a human) and handles it end-to-end or hands off. Order placement collects items and address, creates a pending order, and SMSes a payment link. Every minute of voice burns 10 credits logged in credit_transactions — you see exactly what each call cost."
            nodes={[
              { id: "call", label: "Inbound call", sub: "Twilio", color: "var(--orange)" },
              { id: "ivr", label: "AI agent", sub: "intent classify" },
              { id: "ord", label: "Place order", sub: "pending_order" },
              { id: "sms", label: "SMS link", sub: "pay now" },
              { id: "hand", label: "Human", sub: "handoff" },
              { id: "cr", label: "Credits", sub: "usage logged", color: "var(--green)" },
            ]}
            edges={[
              { from: "call", to: "ivr" },
              { from: "ivr", to: "ord" },
              { from: "ivr", to: "hand" },
              { from: "ord", to: "sms" },
              { from: "ivr", to: "cr" },
            ]}
          />

          <FlowSection
            num="05"
            title="Driver dispatch"
            tagline="Internal drivers first, third-party as overflow. Never stuck."
            body="The moment an order is marked ready, the dispatcher checks your rules. Internal driver online? Offer it. Nobody home? Fall back to Uber Direct or DoorDash Drive automatically. Live ETA streams back to the customer app. Proof-of-delivery closes the loop."
            nodes={[
              { id: "rd", label: "Order ready", sub: "mark ready event", color: "var(--orange)" },
              { id: "rule", label: "Dispatch rule", sub: "internal first" },
              { id: "int", label: "Internal driver", sub: "offer → accept", color: "var(--green)" },
              { id: "ub", label: "Uber / DoorDash", sub: "fallback" },
              { id: "live", label: "Live tracking", sub: "customer app" },
              { id: "done", label: "Delivered", sub: "pod attached" },
            ]}
            edges={[
              { from: "rd", to: "rule" },
              { from: "rule", to: "int" },
              { from: "rule", to: "ub" },
              { from: "int", to: "live" },
              { from: "ub", to: "live" },
              { from: "live", to: "done" },
            ]}
          />

          <FlowSection
            num="06"
            title="Super Admin → merchant configuration"
            tagline="ZentraBite turns modules on and off per business. The CRM re-hydrates instantly."
            body="You (the platform operator) flip a module from the Super Admin console. The update writes to businesses.modules_json. Every merchant CRM reads that map via useModule() on mount — disabled modules disappear from the sidebar, disabled API routes return 403, and billing recalculates. This is how we support a personal trainer and a 20-location franchise on the same codebase."
            nodes={[
              { id: "sa", label: "Super Admin", sub: "toggles module", color: "var(--orange)" },
              { id: "db", label: "businesses row", sub: "modules_json update" },
              { id: "crm", label: "Merchant CRM", sub: "re-hydrates", color: "var(--green)" },
              { id: "nav", label: "Sidebar", sub: "hides item" },
              { id: "api", label: "API routes", sub: "guarded" },
              { id: "bill", label: "Billing", sub: "recalculates" },
            ]}
            edges={[
              { from: "sa", to: "db" },
              { from: "db", to: "crm" },
              { from: "crm", to: "nav" },
              { from: "crm", to: "api" },
              { from: "db", to: "bill" },
            ]}
          />

          <div
            className="glass"
            style={{
              padding: 40,
              marginTop: 60,
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(0,182,122,0.14), rgba(28,45,72,0.55))",
              border: "1px solid rgba(0,182,122,0.3)",
            }}
          >
            <h2 style={{ fontSize: 24, margin: "0 0 10px", color: "var(--cloud)" }}>
              Want to see it on your business?
            </h2>
            <p style={{ color: "var(--steel)", fontSize: 15, maxWidth: 500, margin: "0 auto 22px" }}>
              20 minutes. We'll scope what you need.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/contact" className="btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                Book a call →
              </Link>
              <Link href="/demo" className="btn-secondary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                See the demo
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function FlowSection({
  num,
  title,
  tagline,
  body,
  nodes,
  edges,
}: {
  num: string;
  title: string;
  tagline: string;
  body: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}) {
  return (
    <section style={{ marginBottom: 18 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--green)",
              letterSpacing: "0.1em",
            }}
          >
            / {num}
          </div>
          <h2 style={{ fontSize: 22, margin: 0, color: "var(--cloud)" }}>{title}</h2>
        </div>
        <div style={{ color: "var(--steel)", fontSize: 14, marginTop: 6 }}>{tagline}</div>
        <Expandable summary="Show diagram & details">
          <p style={{ color: "var(--steel)", fontSize: 14.5, lineHeight: 1.65, marginTop: 0, marginBottom: 18 }}>
            {body}
          </p>
          <FlowDiagram nodes={nodes} edges={edges} />
        </Expandable>
      </div>
    </section>
  );
}

function FlowDiagram({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
  // Arrange nodes into a grid: up to 3 per row
  const cols = 3;
  const positions: Record<string, { x: number; y: number }> = {};
  const nodeW = 150;
  const nodeH = 62;
  const gapX = 60;
  const gapY = 60;
  nodes.forEach((n, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Alternate row direction (serpentine) so edges look natural
    const col = r % 2 === 0 ? c : cols - 1 - c;
    positions[n.id] = {
      x: col * (nodeW + gapX) + nodeW / 2,
      y: r * (nodeH + gapY) + nodeH / 2,
    };
  });
  const rows = Math.ceil(nodes.length / cols);
  const width = cols * nodeW + (cols - 1) * gapX;
  const height = rows * nodeH + (rows - 1) * gapY;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", minWidth: 360 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--green)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.from];
          const b = positions[e.to];
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${a.x} ${a.y} Q ${mx} ${my - 20} ${b.x} ${b.y}`}
                stroke="var(--green)"
                strokeOpacity="0.5"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#arrow)"
                strokeDasharray="4 4"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const p = positions[n.id]!;
          const fill = n.color || "var(--cloud)";
          return (
            <g key={n.id} transform={`translate(${p.x - nodeW / 2}, ${p.y - nodeH / 2})`}>
              <rect
                width={nodeW}
                height={nodeH}
                rx={10}
                fill="rgba(15,25,42,0.72)"
                stroke={fill}
                strokeOpacity={0.7}
                strokeWidth={1}
              />
              <text
                x={nodeW / 2}
                y={nodeH / 2 - 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill={fill}
                fontFamily="var(--font-outfit)"
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  x={nodeW / 2}
                  y={nodeH / 2 + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--steel)"
                >
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
