// What each feature page shows (12 Nov): a recorded clip of the demo where
// there is one, a screenshot of its demo screen where there isn't, and the
// demo screen "Try the live demo" opens. Everything is our demo restaurant,
// Nonna's Kitchen, with sample data.
//
// Clips are in public/media/app (scripts/record-app). Screenshots are in
// public/media/hero and public/media/features, taken from the demo with the
// demo banner hidden, at 2x, and saved at 1120x700 (phone shots at 780 wide).

import type { BusinessType } from "../components/home/business-type";

export type FeatureVisual =
  | { kind: "clip"; file: string; variant: "screen" | "phone"; label: string }
  | { kind: "still"; src: string; width: number; height: number; variant: "screen" | "phone"; alt: string }
  | { kind: "chat" };

const clip = (file: string, label: string, variant: "screen" | "phone" = "screen"): FeatureVisual => ({
  kind: "clip",
  file,
  variant,
  label,
});
const still = (src: string, alt: string): FeatureVisual => ({ kind: "still", src, width: 1120, height: 700, variant: "screen", alt });

export const VISUALS: Record<string, FeatureVisual> = {
  pos: clip("pos-desktop", "The ZentraBite POS. Pizzas, a side and a drink are rung up, the order is sent to the kitchen, and the till clears."),
  "custom-mobile-app": {
    kind: "still",
    src: "/media/features/fp-custom-mobile-app.webp",
    width: 780,
    height: 1619,
    variant: "phone",
    alt: "The restaurant's own customer app, with the customer's points, this week's deal and the dishes they order again.",
  },
  "custom-website": still("/media/hero/pv-website.webp", "A restaurant's own website made with ZentraBite, with a photo of its oven, an order button and this week's deals."),
  "live-orders": clip("orders-desktop", "The live orders board across every channel. A new order is opened and moved from New to Cooking to Ready."),
  fulfillment: still("/media/features/fp-fulfillment.webp", "The fulfilment checklist, with each order's stage from placed to delivered and a button for the next step."),
  storefronts: clip("storefront-phone", "A restaurant's own ordering site on a phone. Browse the menu, add a pizza, open the cart and reach checkout.", "phone"),
  winback: clip("rewards-desktop", "The rewards program. The tier ladder and points balance, then a reward is redeemed from the catalogue."),
  "delivery-routing": still("/media/hero/pv-delivery.webp", "Delivery routing, with quotes from several couriers and the cheapest one picked."),
  "sms-email": clip("winback-desktop", "Win-back campaigns with their results. Two text campaigns are opened to show the message each one sends."),
  "stripe-payouts": still("/media/features/fp-stripe-payouts.webp", "Fees and payouts, with Stripe's processing fees, text costs and the money paid into the bank."),
  "financial-reporting": still("/media/features/fp-financial-reporting.webp", "Financials, with revenue, orders, average ticket and repeat rate, and a chart of the last 14 days."),
  crm: clip("customer-desktop", "The customer list, filtered to VIPs. A VIP is opened to show their tier, points, spend and order history."),
  "stock-take": still("/media/hero/pv-stock.webp", "The stock screen, with items running low and a suggested reorder."),
  reviews: still("/media/hero/pv-reviews.webp", "Reviews from every platform in one list, with reply buttons."),
  "ai-calls": still("/media/features/fp-ai-calls.webp", "AI calls, with today's calls, what each caller wanted and a transcript of a call that became an order."),
  automations: still("/media/features/fp-automations.webp", "Automations, with each rule's trigger, what it does and how often it has run."),
  rostering: still("/media/features/fp-rostering.webp", "The weekly roster, with each person's shifts by day and role."),
  "ai-assistant": { kind: "chat" },
};

/** The demo screen "Try the live demo" opens on each feature page. */
export const DEMO_PATH: Record<string, string> = {
  pos: "/demo/live/pos",
  "custom-mobile-app": "/demo/app",
  "custom-website": "/demo/merchant",
  "live-orders": "/demo/live/orders",
  fulfillment: "/demo/live/fulfillment",
  storefronts: "/demo/merchant",
  winback: "/demo/live/rewards",
  "delivery-routing": "/demo/live/delivery",
  "sms-email": "/demo/live/winback",
  "stripe-payouts": "/demo/live/financials",
  "financial-reporting": "/demo/live/financials",
  crm: "/demo/live/customers",
  "stock-take": "/demo/live/stock",
  reviews: "/demo/live/reviews",
  "ai-calls": "/demo/live/ai-calls",
  automations: "/demo/live/automations",
  rostering: "/demo/live/rostering",
  "ai-assistant": "/demo/live",
};

/** Where a list reads better with a wide screen than the page's own picture. */
const LIST_PIC: Record<string, string> = {
  storefronts: "/media/hero/pv-ordering.webp",
};

/** The part whose screen each group on /features shows first. (The customer list is already at the top.) */
export const GROUP_LEAD: Record<string, string> = {
  win: "custom-website",
  keep: "winback",
  run: "live-orders",
  numbers: "financial-reporting",
};

/** The picture for a feature in lists: a still, or a clip's first frame. */
export function previewOf(slug: string): { src: string; variant: "screen" | "phone" } | null {
  const listPic = LIST_PIC[slug];
  if (listPic) return { src: listPic, variant: "screen" };
  const v = VISUALS[slug];
  if (!v || v.kind === "chat") return null;
  if (v.kind === "clip") return { src: `/media/app/${v.file}.webp`, variant: v.variant };
  return { src: v.src, variant: v.variant };
}

/** Which parts suit each way customers buy, for "How do your customers buy?" on /features. */
export const FITS: Record<BusinessType, string[] | "all"> = {
  order: "all",
  book: [
    "custom-website",
    "storefronts",
    "custom-mobile-app",
    "reviews",
    "ai-calls",
    "crm",
    "winback",
    "sms-email",
    "automations",
    "live-orders",
    "pos",
    "rostering",
    "stripe-payouts",
    "financial-reporting",
    "ai-assistant",
  ],
  quote: [
    "custom-website",
    "storefronts",
    "custom-mobile-app",
    "reviews",
    "ai-calls",
    "crm",
    "winback",
    "sms-email",
    "automations",
    "live-orders",
    "rostering",
    "stripe-payouts",
    "financial-reporting",
    "ai-assistant",
  ],
};
