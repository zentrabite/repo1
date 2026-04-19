// Central source of truth for every feature tile + detail page.
// The marketing-grid reads `summary` tiles; the /features/[slug] page
// reads the richer fields (overview, steps, bullets, relatedSlugs).

export type FeatureTag = "Done-for-you";

export type Feature = {
  slug: string;
  icon: string;
  title: string;
  tagline: string;          // short line, shown under the hero on the detail page
  summary: string;          // tile body on the homepage grid
  tag?: FeatureTag;         // optional pill (e.g. "Done-for-you")
  eyebrow: string;          // category label
  overview: string[];       // 1-3 paragraphs, intro of the detail page
  howItWorks: { title: string; body: string }[];
  bullets: string[];        // bullet list of specifics ("What's included")
  whoItsFor: string;        // short paragraph
  relatedSlugs: string[];
};

export const features: Feature[] = [
  {
    slug: "pos",
    icon: "🖥️",
    title: "Integrated POS system",
    tagline: "One screen for dine-in, takeaway, and online — no separate terminal, no extra fees.",
    summary:
      "Dine-in, takeaway, and online orders on one screen. Split bills, apply discounts, print kitchen tickets, run end-of-day reports — no separate terminal or fees.",
    eyebrow: "Operations",
    overview: [
      "ZentraBite ships with a full-featured cloud POS built into the dashboard — no separate hardware, no monthly terminal fees, no integrations to babysit. The same system that takes your online orders also rings up the walk-ins.",
      "Because dine-in, takeaway, and delivery all flow into one order list, your kitchen sees every ticket in the order they came in, regardless of channel. Service stays fair and the pass stays clear.",
    ],
    howItWorks: [
      {
        title: "Open the POS tab",
        body: "Any staff member logs into the dashboard on an iPad, tablet, or counter computer — the POS is a full-screen mode designed for touch.",
      },
      {
        title: "Ring up the order",
        body: "Tap menu items, apply modifiers (extra cheese, no onion), discounts, and tips. Split bills by item, by person, or by custom amount.",
      },
      {
        title: "Take payment",
        body: "Tap to Pay on iPhone, card reader (Stripe Terminal), Apple Pay, cash, or split tender. Every method reconciles automatically at end of day.",
      },
      {
        title: "Kitchen print + track",
        body: "Receipts auto-print to your printer and the ticket appears on your live order board beside every online order — kitchen never has to refresh.",
      },
    ],
    bullets: [
      "Unified order list: dine-in + takeaway + online",
      "Split by item, by person, or by custom amount",
      "Apply discounts, void items, refund in one tap",
      "Stripe Terminal, Tap to Pay on iPhone, cash, split tender",
      "Modifiers, variants, and kitchen notes",
      "End-of-day summary with cash reconciliation",
    ],
    whoItsFor:
      "Anyone running a single-screen counter or a busy service pass. If you've ever run separate software for online and in-store, this is what replaces both.",
    relatedSlugs: ["live-orders", "stripe-payouts", "financial-reporting"],
  },
  {
    slug: "custom-mobile-app",
    icon: "📱",
    title: "Custom mobile app — built for you",
    tag: "Done-for-you",
    tagline: "Your own branded iOS and Android app, designed and launched by our team.",
    summary:
      "We design, build, and launch your own branded iOS and Android app. Push notifications, saved cards, loyalty built in. You keep the app, the customers, and the data.",
    eyebrow: "Done-for-you",
    overview: [
      "Most restaurants can't justify hiring an agency to build a native app — so they don't, and miss out on the highest-LTV customer surface there is. ZentraBite includes app design and launch as part of your subscription: we build it, we ship it to the stores, you own it.",
      "The app is white-labelled end to end. Your logo, your colours, your domain on the splash screen. It plugs directly into your ZentraBite menu, loyalty, and payment stack — the same customer data powers every channel.",
    ],
    howItWorks: [
      {
        title: "Brand kickoff",
        body: "30-minute call to pull your logo, colours, and any existing brand assets. We generate a clickable design mockup within 3 business days.",
      },
      {
        title: "Approve the design",
        body: "You review, we iterate once, you sign off. Menu, ordering flow, loyalty, profile, and push-notification UI are all included.",
      },
      {
        title: "Store submission",
        body: "We handle the Apple Developer and Google Play submissions on your company's accounts (or set them up for you). Expect 7-10 days for review.",
      },
      {
        title: "Launch + retention",
        body: "App goes live. We push an announcement SMS to your existing customers. Repeat-order rate on app customers typically 2-3× higher than web.",
      },
    ],
    bullets: [
      "Native iOS + Android (React Native under the hood)",
      "Push notifications for order status and promos",
      "Saved cards, Apple Pay, Google Pay",
      "Winback engine and reward redemption in-app",
      "Order history, reorder in one tap",
      "You own the app listings and Apple/Google accounts",
    ],
    whoItsFor:
      "Restaurants with a repeat customer base who want to move them off aggregator apps. Single locations and chains alike.",
    relatedSlugs: ["custom-website", "winback", "storefronts"],
  },
  {
    slug: "custom-website",
    icon: "🌐",
    title: "Custom website — built for you",
    tag: "Done-for-you",
    tagline: "A beautiful, fast, SEO-ready restaurant site with ordering wired up on day one.",
    summary:
      "Beautiful, fast, SEO-ready restaurant website with your menu, photos, and online ordering wired up on day one. You approve a design, we ship it in under two weeks.",
    eyebrow: "Done-for-you",
    overview: [
      "A beautiful, fast, SEO-optimised website for your restaurant — designed, built, and launched by our team. The menu on the site is the same menu in your POS, so price and availability changes flow through automatically.",
      "Unlike Wix, Squarespace, or agency sites, you don't pay hosting separately, and you never get stuck waiting for your developer to change opening hours.",
    ],
    howItWorks: [
      {
        title: "Design kickoff",
        body: "We send a 3-template shortlist matched to your vibe (modern / classic / minimal). You pick one and provide photos, copy, and hours.",
      },
      {
        title: "We build in 7-10 days",
        body: "Your site goes up at yourdomain.com.au with menu, online ordering, table booking (if applicable), gallery, about, and contact.",
      },
      {
        title: "You review + approve",
        body: "Two rounds of revisions included. Copy changes, image swaps, layout tweaks — we handle them.",
      },
      {
        title: "Launch + ongoing",
        body: "Site goes live. Content updates (new menu items, specials, photos) are handled through the dashboard — no emails to designers.",
      },
    ],
    bullets: [
      "SEO-optimised for \"[your cuisine] near [your suburb]\" searches",
      "Menu auto-syncs with your POS",
      "Online ordering + Apple Pay on mobile",
      "Table reservations (optional integration with SevenRooms/OpenTable)",
      "Google Business Profile integration",
      "Lightning-fast hosting included (99.9% uptime)",
    ],
    whoItsFor:
      "Restaurants whose current site is 5+ years old, or who've never had a proper one. Also anyone paying $300+/month to an agency for hosting and trivial edits.",
    relatedSlugs: ["custom-mobile-app", "storefronts", "sms-email"],
  },
  {
    slug: "live-orders",
    icon: "🧾",
    title: "Live order management",
    tagline: "Every order beeps, appears instantly, and auto-tracks from New to Delivered.",
    summary:
      "Every incoming order beeps, toasts, and auto-refreshes — realtime across POS, kitchen, and dashboard. No more missed tickets.",
    eyebrow: "Operations",
    overview: [
      "The second a customer pays, the order lands on every screen in your restaurant simultaneously — POS, kitchen display, owner's phone, and dashboard. It beeps, a toast pops, and the counter ticks up. No refreshing required.",
      "The order then auto-progresses through New → Cooking → Ready → Out for delivery → Delivered. Staff move tickets with a single tap; the customer sees the same status update on their order-tracking page.",
    ],
    howItWorks: [
      {
        title: "Order arrives",
        body: "Whether it came from your storefront, mobile app, or POS walk-in, the moment Stripe confirms payment we push it to every connected device via Supabase Realtime.",
      },
      {
        title: "Alert everyone",
        body: "A chime plays on the screens you've enabled. Owner gets an optional SMS or push notification. Email receipt fires to the customer.",
      },
      {
        title: "Move through stages",
        body: "Tap to advance. Each stage broadcasts back out to every screen and the customer's tracker — no one is ever looking at stale data.",
      },
      {
        title: "Delivery hand-off",
        body: "When the ticket hits Ready, our delivery engine auto-dispatches to the cheapest available driver — yours, a freelance rider, or Uber/DoorDash.",
      },
    ],
    bullets: [
      "Sub-second realtime updates (Supabase Realtime)",
      "Audible chime + on-screen toast + optional SMS/push to owner",
      "One-tap stage progression with automatic timestamps",
      "Customer-facing status tracker URL",
      "Live order counter on the dashboard home",
      "Missed-ticket alarm if a ticket sits New > 90 seconds",
    ],
    whoItsFor:
      "Any service that cannot afford to miss a ticket — which is every restaurant, every day, at 7pm on a Friday.",
    relatedSlugs: ["pos", "delivery-routing", "storefronts"],
  },
  {
    slug: "storefronts",
    icon: "🛍️",
    title: "Commission-free storefronts",
    tagline: "Your own branded ordering page. Keep 100% of the revenue Uber would have taken.",
    summary:
      "Your own branded ordering page. Keep 100% of the revenue Uber and DoorDash would have skimmed — pay only Stripe's standard fees.",
    eyebrow: "Channels",
    overview: [
      "Uber Eats and DoorDash charge 15-30% per order. ZentraBite storefronts charge 0%. You build a menu, we host the ordering page on your own subdomain (or your own domain), and every order goes straight to you.",
      "The storefront is mobile-first, Apple Pay / Google Pay enabled, and automatically pulls from the menu you already maintain in the dashboard. Customers save cards for next time; repeat orders are one tap.",
    ],
    howItWorks: [
      {
        title: "Build your menu",
        body: "In the dashboard's Menu builder — add categories, items, photos, modifiers. Enable/disable items in a tap when you run out.",
      },
      {
        title: "Publish your storefront",
        body: "Turns on instantly at zentrabite.com/store/your-slug — or point your own domain at it (e.g. order.yourrestaurant.com.au).",
      },
      {
        title: "Customers order + pay",
        body: "Mobile-friendly checkout with Apple Pay, Google Pay, and saved cards. Delivery radius auto-calculated from postcodes.",
      },
      {
        title: "You keep the money",
        body: "Stripe takes standard processing fees (1.75% + 30¢ AU). You take the rest. Money lands in your bank daily.",
      },
    ],
    bullets: [
      "Mobile-first, Apple Pay + Google Pay checkout",
      "Auto-calculated delivery radius and fees",
      "Scheduled orders (pre-order for later)",
      "Promo codes, tier discounts, first-order offers",
      "Custom subdomain or full custom domain",
      "Real-time menu sync with POS availability",
    ],
    whoItsFor:
      "Any restaurant tired of watching Uber keep 30% of every margin. Works solo or alongside the aggregators while you migrate repeat customers.",
    relatedSlugs: ["custom-website", "custom-mobile-app", "live-orders"],
  },
  {
    slug: "winback",
    icon: "🔁",
    title: "Winback engine",
    tagline: "Built-in points and tiers that bring quiet customers back — automatically.",
    summary:
      "Points, tiers, and automated winback flows that re-engage lapsed customers the moment they go quiet. Zero extra plugins.",
    eyebrow: "Growth",
    overview: [
      "The Winback engine is a full rewards + reactivation program built directly into ZentraBite — no separate plugin, no integration fees, no reconciliation drama. Every order automatically earns points, every customer is tiered by 12-month spend, and the moment someone goes quiet the engine fires a targeted winback offer.",
      "Because the data lives in the same database as your orders and customer CRM, you can trigger things other loyalty tools can't: Gold-tier-only winback campaigns, birthday auto-rewards, and tier-upgrade SMS the moment someone crosses a threshold.",
    ],
    howItWorks: [
      {
        title: "Points per order",
        body: "Default: 1 point per $1 spent. You choose the rate. Points land the moment Stripe confirms payment.",
      },
      {
        title: "Tier progression",
        body: "Bronze → Silver → Gold → VIP. Tiers recalculate on rolling 12-month spend, so customers can fall back — keeping them motivated.",
      },
      {
        title: "Redeem at checkout",
        body: "Customer sees their balance in cart, taps Redeem, discount applies instantly. Works on storefront, app, and POS.",
      },
      {
        title: "Automated rewards",
        body: "Birthday bonus points, tier-up celebration SMS, win-back offers — all fire automatically based on customer state.",
      },
    ],
    bullets: [
      "1 point per $1 spent (configurable)",
      "4 tiers with independent earn rates and perks",
      "Birthday rewards auto-delivered",
      "Redemption at checkout on every channel",
      "Customer-facing rewards page inside your app",
      "Segment by tier for targeted SMS/email",
    ],
    whoItsFor:
      "Restaurants with enough repeat traffic to care about turning it into more. If 30%+ of orders come from known customers, this pays for itself quickly.",
    relatedSlugs: ["sms-email", "crm", "custom-mobile-app"],
  },
  {
    slug: "delivery-routing",
    icon: "🚚",
    title: "Smart delivery routing",
    tagline: "Auto-dispatch to whichever driver is cheapest right now — yours, Uber, or DoorDash.",
    summary:
      "Auto-assign to your own driver, nearest rider, or fall through to Uber Direct / DoorDash Drive — whichever is cheapest right now.",
    eyebrow: "Operations",
    overview: [
      "Delivery economics change by the minute. ZentraBite's routing engine polls every available option the second an order hits Ready — your own drivers, Uber Direct, DoorDash Drive — and assigns to whichever has the lowest quoted price at that exact moment.",
      "You can also pin rules: always use own drivers under 2km, always use Uber over 8km, never use DoorDash between 11pm and 6am. Full override on any individual ticket.",
    ],
    howItWorks: [
      {
        title: "Order reaches Ready",
        body: "The second a ticket is flipped to Ready, the engine kicks in.",
      },
      {
        title: "Quote across providers",
        body: "In parallel, we ask Uber Direct, DoorDash Drive, and your own driver pool for a quote and ETA.",
      },
      {
        title: "Pick cheapest eligible",
        body: "Applies your rules (distance, time-of-day, provider preference), then dispatches to the winner.",
      },
      {
        title: "Track + hand-off",
        body: "Live tracking URL goes to the customer. Your dashboard shows the driver's real-time location until delivered.",
      },
    ],
    bullets: [
      "Uber Direct integration (Australia + US + UK)",
      "DoorDash Drive integration (US + Australia + Canada)",
      "Own-driver app for in-house couriers",
      "Pin rules by distance, time, order value",
      "Per-ticket override from the dashboard",
      "Saves typically 20-35% on delivery cost",
    ],
    whoItsFor:
      "Any restaurant currently using a single delivery provider, or dispatching manually via phone. Routing usually pays for the platform subscription in delivery savings alone.",
    relatedSlugs: ["live-orders", "storefronts", "financial-reporting"],
  },
  {
    slug: "sms-email",
    icon: "💬",
    title: "SMS & email automations",
    tagline: "Win-back, abandoned-cart, review asks, and birthday offers — firing automatically.",
    summary:
      "Win-back campaigns, abandoned-cart nudges, post-order receipts, review asks — all triggered the moment customer state changes.",
    eyebrow: "Growth",
    overview: [
      "Sitting on top of your customer CRM is a full SMS and email automation engine. You set the trigger — customer quiet for 30 days, birthday coming up, order completed, cart abandoned — and ZentraBite fires the right message at the right time with the right offer.",
      "Every template is editable, A/B-testable, and tied back to revenue. You can see exactly how many dollars each automation has recovered since it turned on.",
    ],
    howItWorks: [
      {
        title: "Pick a trigger",
        body: "Customer-level events (silent for 30 days, tier upgraded, birthday in 7 days) or order-level (confirmed, delivered, refunded).",
      },
      {
        title: "Compose the message",
        body: "Visual editor for SMS and email. Merge tags for name, favourite item, last order. Optional promo code auto-generated and tied to the recipient.",
      },
      {
        title: "Schedule or go live",
        body: "Send once, on a recurring schedule, or live with every trigger event. Pause any automation instantly.",
      },
      {
        title: "Track recovered revenue",
        body: "Each redemption attributes back to the campaign, so you see exact ROI per flow.",
      },
    ],
    bullets: [
      "SMS via Twilio at wholesale rates",
      "Email via Resend, on your verified domain",
      "Win-back, abandoned-cart, post-order, birthday templates",
      "A/B testing on subject lines and offers",
      "Suppression on unsubscribes and spam complaints",
      "Revenue attribution per campaign",
    ],
    whoItsFor:
      "Restaurants with at least a few hundred opted-in customers. Automations commonly recover 4-8% of lapsed customers per month.",
    relatedSlugs: ["crm", "winback", "custom-mobile-app"],
  },
  {
    slug: "stripe-payouts",
    icon: "💳",
    title: "Stripe Connect payouts",
    tagline: "Daily payouts, full dispute handling, zero payment-integration headaches.",
    summary:
      "Money lands in your bank account daily, not monthly. Full Connect onboarding, live balance, refunds, and disputes in one view.",
    eyebrow: "Money",
    overview: [
      "Payments run through Stripe Connect. During onboarding (a guided 10-minute flow inside the dashboard) Stripe verifies your business, issues your merchant account, and sets up payouts to your bank. From that moment, every order's funds land in your account — typically next business day.",
      "You never leave ZentraBite to manage it. Your live balance, upcoming payout, past payouts, card-brand breakdown, refund history, and any active disputes all live in one place.",
    ],
    howItWorks: [
      {
        title: "Complete Connect onboarding",
        body: "10-minute guided flow inside the dashboard. We collect ABN, bank account, and ID as required by Australian regulation.",
      },
      {
        title: "Stripe verifies",
        body: "Usually instant; sometimes Stripe requests a follow-up document. We handle the back-and-forth inside the dashboard.",
      },
      {
        title: "Take orders → get paid",
        body: "Every successful charge lands in your Stripe balance. Payouts run daily to your bank (configurable: weekly or monthly).",
      },
      {
        title: "Refund or dispute in one click",
        body: "Full or partial refunds from the order page. Dispute evidence submission wizard walks you through the rare chargeback.",
      },
    ],
    bullets: [
      "Daily payouts (T+1 in Australia) by default",
      "Cards, Apple Pay, Google Pay, Link, BNPL",
      "Automatic GST line-item handling",
      "One-click refunds with reason codes",
      "Chargeback evidence submission wizard",
      "Stripe Tax add-on available",
    ],
    whoItsFor:
      "Everyone on ZentraBite — Stripe Connect is the payment backbone, not optional.",
    relatedSlugs: ["financial-reporting", "live-orders", "pos"],
  },
  {
    slug: "financial-reporting",
    icon: "📊",
    title: "Real financial reporting",
    tagline: "Monthly reconciled reports, GST-ready, Xero-ready, your-accountant-ready.",
    summary:
      "Revenue, fees, refunds, and payout reconciliation by channel. Export to Xero or CSV at the end of each month, GST-ready.",
    eyebrow: "Money",
    overview: [
      "Every order, refund, tip, fee, and payout is tracked and reconciled. At any point you can pull a report by date range, by channel (storefront / POS / delivery / app), or by customer cohort. At the end of the month, one click exports a fully GST-split Xero-ready CSV.",
      "If your accountant uses MYOB, QuickBooks, or Xero, the export drops straight in. No stitching together PDFs or matching Stripe payouts to bank deposits by hand.",
    ],
    howItWorks: [
      {
        title: "Every transaction logged",
        body: "Each order, refund, and fee writes to our ledger with full GST breakdown and channel attribution.",
      },
      {
        title: "Daily auto-reconciliation",
        body: "Stripe payouts match back to source transactions automatically. You see one clean line per deposit, not 200.",
      },
      {
        title: "Monthly report",
        body: "1st of the month, a PDF summary hits your email. Revenue, fees, refunds, GST collected, net payout.",
      },
      {
        title: "Xero / CSV export",
        body: "One-click export for any date range. Drops straight into Xero's Bank Reconciliation, no massaging.",
      },
    ],
    bullets: [
      "GST-split line items (10% GST compliant)",
      "Channel breakdown: storefront / POS / app / delivery",
      "Refund + dispute tracking with reasons",
      "Daily, weekly, monthly, or custom-range reports",
      "Xero / MYOB / QuickBooks CSV export",
      "Year-end tax summary for your accountant",
    ],
    whoItsFor:
      "Anyone who's ever spent a Sunday night trying to match Stripe payouts to bank deposits. You'll never do it again.",
    relatedSlugs: ["stripe-payouts", "pos", "delivery-routing"],
  },
  {
    slug: "crm",
    icon: "👥",
    title: "Customer CRM",
    tagline: "Every buyer is a saved contact with order history, LTV, favourites, and birthday.",
    summary:
      "Every buyer is a saved contact with order history, lifetime value, favourite items, and birthday. Segment and target in a click.",
    eyebrow: "Growth",
    overview: [
      "Every person who orders from you — on your storefront, app, or POS — becomes a customer record in your CRM. That record accumulates everything: order history, lifetime value, favourite items, delivery addresses, birthday, loyalty tier, SMS/email opt-ins.",
      "Filter and segment in seconds: \"customers in 5243 postcode who ordered pizza in the last 90 days and haven't ordered in 14\" is one query. Export to CSV, send a targeted SMS, or pin a custom offer just to that segment.",
    ],
    howItWorks: [
      {
        title: "Auto-created on first order",
        body: "No manual entry. First name, phone, email, address are captured at checkout, and the record is deduplicated by email + phone.",
      },
      {
        title: "Profile fills itself",
        body: "Every subsequent order enriches the profile — favourite items ranked by frequency, avg order value, channel preference, last-seen date.",
      },
      {
        title: "Segment on the fly",
        body: "Build filters with any combination of fields. Save segments to reuse. No SQL required.",
      },
      {
        title: "Take action",
        body: "From a segment, send SMS, email, pin a promo code, or export CSV. All tied back to attribution.",
      },
    ],
    bullets: [
      "Dedup by email + phone, merge duplicates",
      "Order history with line items and channel",
      "Lifetime value, avg order, last-order date",
      "Favourite items (top 5) auto-ranked",
      "SMS + email consent tracking",
      "CSV export — you own this data, always",
    ],
    whoItsFor:
      "Restaurants that want to stop renting their customer list from Uber Eats. After 3-6 months on ZentraBite you'll have a real, exportable database of people who've bought from you.",
    relatedSlugs: ["winback", "sms-email", "live-orders"],
  },
];

export function getFeature(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug);
}

export function getRelated(slugs: string[]): Feature[] {
  return slugs.map(getFeature).filter((f): f is Feature => Boolean(f));
}
