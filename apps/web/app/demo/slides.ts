// Slide content for /demo. Each slide pairs a feature with a clear
// business-impact line ("how this changes your numbers").

export type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  impact: { metric: string; value: string; sub: string }[];
  visual: VisualKind;
};

export type VisualKind =
  | "intro"
  | "ai-brain"
  | "stock"
  | "pos"
  | "app-website"
  | "live-orders"
  | "storefronts"
  | "winback"
  | "delivery"
  | "automations"
  | "stripe"
  | "reporting"
  | "crm"
  | "outro";

export const slides: Slide[] = [
  {
    id: "intro",
    eyebrow: "Welcome",
    title: "ZentraBite — the Business Operating System for small operators.",
    body:
      "This is a guided tour of the whole system. You'll see how ZentraBite runs your orders, customers, stock, and revenue — and exactly how every feature changes your numbers.",
    bullets: [
      "Replaces 5+ disconnected tools with one system",
      "Built for restaurants, salons, gyms, retail, services & more",
      "Use ← → arrows or click the controls",
    ],
    impact: [
      { metric: "Avg. setup time", value: "48 hours", sub: "from signup to first sale" },
      { metric: "Avg. revenue lift", value: "+18%", sub: "within 90 days" },
      { metric: "Cost replaced", value: "$420/mo", sub: "of POS + ordering + loyalty + SMS tools" },
    ],
    visual: "intro",
  },
  {
    id: "ai-brain",
    eyebrow: "The Brain",
    title: "AI that tells you what to do next.",
    body:
      "ZentraBite's Business Intelligence Layer reads every sale, customer, and stock movement — then sends you a daily brief with predictions, alerts, and one-tap actions.",
    bullets: [
      "Daily AI email at 7am — predictions + action list",
      "Spots at-risk customers, stock shortages, and upsell opportunities",
      "Reply \"act\" and ZentraBite executes the recommendation",
      "One brain, not ten dashboards",
    ],
    impact: [
      { metric: "Time on reports", value: "−4 hrs/wk", sub: "AI writes the summary for you" },
      { metric: "Revenue actions taken", value: "3–5 per day", sub: "nudged automatically" },
      { metric: "Decisions automated", value: "62%", sub: "of operator admin (avg)" },
    ],
    visual: "ai-brain",
  },
  {
    id: "stock",
    eyebrow: "Operations",
    title: "AI stock take + predictive ordering.",
    body:
      "ZentraBite tracks every ingredient, SKU, and consumable. It learns your use rate, flags expiry, watches deliveries — and tells you exactly what to reorder today.",
    bullets: [
      "Live inventory with par levels + days-of-cover",
      "Expiry awareness — waste gets flagged before it happens",
      "Predictive reorders with one-tap accept to supplier",
      "Delivery tracking so you always know what's coming in",
    ],
    impact: [
      { metric: "Food/stock waste", value: "−27%", sub: "avg in first 90 days" },
      { metric: "Stockouts", value: "→ near zero", sub: "on tracked items" },
      { metric: "Reorder time", value: "−85%", sub: "vs manual ordering" },
    ],
    visual: "stock",
  },
  {
    id: "pos",
    eyebrow: "Operations",
    title: "Integrated POS — one screen for everything.",
    body:
      "Dine-in, takeaway, and online orders all flow into the same screen. No separate terminal, no monthly hardware lease, no integration glue.",
    bullets: [
      "Split bills, apply discounts, accept tips",
      "Tap-to-Pay, Stripe Terminal, Apple Pay, cash",
      "Auto-prints to your kitchen printer",
      "End-of-day cash reconciliation in one tap",
    ],
    impact: [
      { metric: "POS savings", value: "$129/mo", sub: "vs Square / Lightspeed combos" },
      { metric: "Faster service", value: "−22 sec", sub: "average ticket entry time" },
      { metric: "Fewer errors", value: "−40%", sub: "kitchen tickets corrected mid-service" },
    ],
    visual: "pos",
  },
  {
    id: "app-website",
    eyebrow: "Done-for-you",
    title: "We build your custom app and website.",
    body:
      "Most restaurants can't afford an agency to build a native app or a proper website. We include both as part of your subscription — designed, built, and launched by our team in under two weeks.",
    bullets: [
      "Native iOS + Android apps, fully white-labelled",
      "SEO-optimised website with menu and online ordering",
      "Push notifications, saved cards, loyalty in-app",
      "You own the App Store / Play Store listings",
    ],
    impact: [
      { metric: "Agency saved", value: "$15-40k", sub: "typical app + website build" },
      { metric: "Time to live", value: "10 days", sub: "from kickoff to launch" },
      { metric: "App-customer LTV", value: "2.4×", sub: "vs web-only customers" },
    ],
    visual: "app-website",
  },
  {
    id: "live-orders",
    eyebrow: "Operations",
    title: "Every order, beeping the moment it lands.",
    body:
      "The second a customer pays, the order hits every screen — POS, kitchen display, owner's phone, dashboard. It chimes, toasts, and auto-progresses through every stage.",
    bullets: [
      "Sub-second realtime sync across devices",
      "Owner gets SMS/push the moment a ticket arrives",
      "Missed-ticket alarm if a New ticket sits > 90s",
      "Customer-facing live tracker URL",
    ],
    impact: [
      { metric: "Missed orders", value: "→ 0", sub: "down from ~3% during rush" },
      { metric: "Avg. complete time", value: "−4 min", sub: "from order placed to ready" },
      { metric: "1★ reviews", value: "−61%", sub: "fewer 'forgot my order' complaints" },
    ],
    visual: "live-orders",
  },
  {
    id: "storefronts",
    eyebrow: "Channels",
    title: "Commission-free storefronts.",
    body:
      "A branded ordering page on your own subdomain (or your own domain) — Apple Pay, Google Pay, saved cards, scheduled pickups. Stripe takes its standard fee. We take zero.",
    bullets: [
      "0% commission, ever",
      "Mobile-first checkout (Apple Pay / Google Pay)",
      "Scheduled and pre-orders supported",
      "Custom subdomain or full custom domain",
    ],
    impact: [
      { metric: "Per-order saving", value: "$4.80", sub: "avg vs Uber Eats 18% take" },
      { metric: "Storefront orders", value: "32%", sub: "of total within 6 months (avg)" },
      { metric: "Margin recovered", value: "+$3,600/mo", sub: "for a $40k/mo restaurant" },
    ],
    visual: "storefronts",
  },
  {
    id: "winback",
    eyebrow: "Growth",
    title: "Winback engine — built right in.",
    body:
      "Points accrue on every order, customers tier from Bronze to VIP, and the moment someone goes quiet a targeted winback offer fires automatically. No plugin, no extra app.",
    bullets: [
      "1 point per $1 (configurable)",
      "Birthday bonus auto-delivered",
      "Winback SMS fires when a customer lapses past their usual interval",
      "Works on storefront, app, and POS",
    ],
    impact: [
      { metric: "Repeat-order rate", value: "+27%", sub: "for opted-in members" },
      { metric: "VIP customers", value: "12%", sub: "drive 41% of revenue (avg)" },
      { metric: "Winback cost", value: "$0", sub: "vs $99-249/mo for standalone tools" },
    ],
    visual: "winback",
  },
  {
    id: "delivery",
    eyebrow: "Operations",
    title: "Smart delivery routing — cheapest wins.",
    body:
      "When an order hits Ready, we ping every available delivery option — your own drivers, Uber Direct, DoorDash Drive — and dispatch to whichever is cheapest right now.",
    bullets: [
      "Uber Direct + DoorDash Drive integrated",
      "Own-driver app for in-house couriers",
      "Pin rules by distance, time-of-day, order value",
      "Per-ticket override from the dashboard",
    ],
    impact: [
      { metric: "Delivery cost", value: "−28%", sub: "vs single-provider average" },
      { metric: "Failed deliveries", value: "−18%", sub: "from auto-failover" },
      { metric: "Avg. delivery time", value: "−5 min", sub: "via cheapest-and-fastest logic" },
    ],
    visual: "delivery",
  },
  {
    id: "automations",
    eyebrow: "Growth",
    title: "SMS & email automations that pay for themselves.",
    body:
      "Win-back, abandoned cart, post-order receipts, birthday rewards, review asks — every flow tied back to the customer record, every dollar attributed.",
    bullets: [
      "SMS via Twilio at wholesale rates",
      "Email via Resend on your verified domain",
      "Built-in win-back, abandoned-cart, birthday templates",
      "Per-campaign revenue attribution",
    ],
    impact: [
      { metric: "Win-back recovery", value: "5.8%", sub: "of lapsed customers / month avg" },
      { metric: "Abandoned-cart save", value: "11%", sub: "of dropped checkouts recovered" },
      { metric: "Avg. ROI", value: "12×", sub: "$1 spent on SMS = $12 returned" },
    ],
    visual: "automations",
  },
  {
    id: "stripe",
    eyebrow: "Money",
    title: "Stripe Connect — daily payouts, zero hassle.",
    body:
      "10-minute onboarding inside the dashboard, then every successful charge lands in your Stripe balance and pays out daily to your bank.",
    bullets: [
      "Daily T+1 payouts in Australia",
      "Cards, Apple Pay, Google Pay, BNPL",
      "One-click refunds with reason codes",
      "Chargeback evidence wizard",
    ],
    impact: [
      { metric: "Time to first payout", value: "Next business day", sub: "after first order" },
      { metric: "Refund time", value: "10 sec", sub: "vs 5+ minutes manually" },
      { metric: "Disputes won", value: "+34%", sub: "with our evidence wizard" },
    ],
    visual: "stripe",
  },
  {
    id: "reporting",
    eyebrow: "Money",
    title: "Real reporting — Xero-ready, GST-split, on time.",
    body:
      "Every order, refund, fee, and tip auto-reconciles. The 1st of every month a clean PDF summary hits your inbox. One click exports a Xero-ready CSV.",
    bullets: [
      "GST line items split (10% AU compliant)",
      "Channel breakdown: storefront / POS / app / delivery",
      "Daily, weekly, monthly, custom-range reports",
      "Year-end tax summary for your accountant",
    ],
    impact: [
      { metric: "Monthly admin time", value: "−4 hrs", sub: "saved on reconciliation" },
      { metric: "Accountant fee", value: "−$280/mo", sub: "average (less manual cleanup)" },
      { metric: "Time to BAS", value: "10 min", sub: "from start to lodged" },
    ],
    visual: "reporting",
  },
  {
    id: "crm",
    eyebrow: "Growth",
    title: "Customer CRM — own your customers, finally.",
    body:
      "Every order auto-creates and enriches a customer record. Segment by spend, postcode, last-order date, favourite item — then act on it.",
    bullets: [
      "Auto-deduped by email + phone",
      "Lifetime value, favourites, last-order date",
      "Saved segments and CSV export",
      "Direct-action SMS / email from any segment",
    ],
    impact: [
      { metric: "Database after 6 mo", value: "1,400+", sub: "owned customer records (avg)" },
      { metric: "Repeat customer share", value: "48%", sub: "of orders by month 6" },
      { metric: "Aggregator dependency", value: "−52%", sub: "less reliance on Uber/DoorDash" },
    ],
    visual: "crm",
  },
  {
    id: "outro",
    eyebrow: "Ready?",
    title: "That's the whole operating system.",
    body:
      "One subscription runs your whole business. Onboarded in 48 hours, free trial for 14 days, no credit card to start. The live demo dashboard lets you click through everything in real time with sample data.",
    bullets: [
      "14-day free trial — no card required",
      "Free onboarding call with a real human",
      "Cancel anytime, export your data anytime",
    ],
    impact: [
      { metric: "Setup", value: "48 hrs", sub: "from signup to live" },
      { metric: "Trial", value: "14 days", sub: "no credit card required" },
      { metric: "Support", value: "Same-day", sub: "Australian-based, real humans" },
    ],
    visual: "outro",
  },
];
