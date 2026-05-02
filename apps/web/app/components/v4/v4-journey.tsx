type Tag = "auto" | "ai" | "earn" | "win";

type Step = {
  num: string;
  icon: string;
  label: string;
  desc: string;
  tag: { kind: Tag; label: string };
  start?: boolean;
  end?: boolean;
};

const ROW_A: Step[] = [
  {
    num: "Step 01",
    icon: "🛒",
    label: "First Order",
    desc: "Via POS, your storefront, Uber Eats, or DoorDash — all channels feed one board.",
    tag: { kind: "earn", label: "Any channel" },
    start: true,
  },
  {
    num: "Step 02",
    icon: "👤",
    label: "Profile Auto-Created",
    desc: "Name, contact, spend, channel, and order history saved instantly. Zero manual entry.",
    tag: { kind: "auto", label: "Automatic" },
  },
  {
    num: "Step 03",
    icon: "⭐",
    label: "Points Credited",
    desc: "Bronze tier activated. Points added instantly. Reward progress shown on next visit.",
    tag: { kind: "earn", label: "Loyalty active" },
  },
  {
    num: "Step 04",
    icon: "💬",
    label: '"How was it?" SMS',
    desc: "Sent 2 hours after order. Includes a 50pt bonus for their next visit. 68% return rate.",
    tag: { kind: "auto", label: "Auto-sent" },
  },
  {
    num: "Step 05",
    icon: "🤖",
    label: "AI Monitors Daily",
    desc: "Churn risk scored every night. Spend patterns tracked. Tier progress calculated.",
    tag: { kind: "ai", label: "AI powered" },
  },
];

const ROW_B: Step[] = [
  {
    num: "Step 09",
    icon: "♾️",
    label: "Forever Client",
    desc: "Platinum tier. VIP comms, priority support, 2× points, highest LTV customer segment.",
    tag: { kind: "earn", label: "♛ VIP status" },
    end: true,
  },
  {
    num: "Step 08",
    icon: "🏆",
    label: "Platinum Nudge",
    desc: 'AI detects they\'re 160pts from the next tier and fires a personal "almost there" SMS.',
    tag: { kind: "ai", label: "AI triggered" },
  },
  {
    num: "Step 07",
    icon: "🔄",
    label: "They Return",
    desc: "Silver tier unlocked. Spend history deepens. AI refines their churn risk model.",
    tag: { kind: "earn", label: "Tier up" },
  },
  {
    num: "Step 06",
    icon: "📣",
    label: "Zentra Rewards Campaign",
    desc: "At day 14 of silence: AI voice call → SMS fallback → $5 off offer. $4,280 avg recovered/mo.",
    tag: { kind: "win", label: "Day 14 auto" },
  },
  {
    num: "Loop",
    icon: "📈",
    label: "Revenue Compounds",
    desc: "Each cycle: higher tier, higher spend, lower churn risk. The flywheel builds itself.",
    tag: { kind: "auto", label: "Flywheel" },
  },
];

export function V4Journey() {
  return (
    <section id="journey">
      <div className="journey-inner">
        <div className="journey-heading reveal">
          <div className="s-eyebrow">Customer Journey</div>
          <h2 className="j-h2">
            From first order
            <br />
            <span style={{ color: "var(--g)" }}>to forever client.</span>
          </h2>
          <p className="j-sub">
            ZentraBite automates every step of the retention loop. Set it up
            once — it runs forever.
          </p>
        </div>

        <div className="j-track reveal">
          <div className="j-row j-row-a">
            {ROW_A.map((s, i) => (
              <Node key={s.num} step={s} arrowAfter={i < ROW_A.length - 1} />
            ))}
          </div>

          <div className="j-corner">
            <div className="j-corner-line" />
            <div className="j-corner-label">↓ Goes quiet? Trigger Zentra Rewards ↓</div>
          </div>

          <div className="j-row j-row-b">
            {ROW_B.map((s, i) => (
              <Node key={s.num} step={s} arrowAfter={i < ROW_B.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({ step, arrowAfter }: { step: Step; arrowAfter: boolean }) {
  const cls = [
    "j-node",
    step.start ? "j-start" : "",
    step.end ? "j-end" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className={cls}>
        <div className="j-step-num">{step.num}</div>
        <div className="j-icon">{step.icon}</div>
        <div className="j-label">{step.label}</div>
        <div className="j-desc">{step.desc}</div>
        <span className={`j-tag ${step.tag.kind}`}>{step.tag.label}</span>
      </div>
      {arrowAfter && (
        <div className="j-arrow-cell">
          <span className="j-arr">›</span>
        </div>
      )}
    </>
  );
}
