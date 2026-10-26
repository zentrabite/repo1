// How the features are grouped on the homepage explorer and on /features.
// Each item points at an entry in ./data.ts by slug. `name` and `short` are
// the short labels used in lists, the feature page has the full copy.

import type { IconName } from "../components/zb-icon";

export type FeatureGroup = {
  id: string;
  title: string;
  note: string;
  icon: IconName;
  items: { slug: string; name: string; short: string }[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "win",
    title: "Win customers",
    note: "Get found, then take orders, bookings and calls direct.",
    icon: "storefront",
    items: [
      { slug: "custom-website", name: "Website", short: "Your own site, filled in from your current one" },
      { slug: "storefronts", name: "Online ordering", short: "Your menu or products, with card payments" },
      { slug: "custom-mobile-app", name: "Customer app", short: "An app your customers add to their phone" },
      { slug: "reviews", name: "Reviews", short: "Every review in one place, plus review requests" },
      { slug: "ai-calls", name: "AI phone calls", short: "Picks up when you can't, takes orders and bookings" },
    ],
  },
  {
    id: "keep",
    title: "Keep them coming back",
    note: "Know your regulars and notice when they drift off.",
    icon: "rewards",
    items: [
      { slug: "crm", name: "Customer list", short: "Every customer with their history and spend" },
      { slug: "winback", name: "Rewards and win-back", short: "Points, tiers, birthday bonuses and a nudge when they go quiet" },
      { slug: "sms-email", name: "Texts and emails", short: "Offers and reminders that send themselves" },
      { slug: "automations", name: "Automations", short: "Your own rules, like a thank you after a first order" },
    ],
  },
  {
    id: "run",
    title: "Run the day",
    note: "Switch on the parts your business needs.",
    icon: "orders",
    items: [
      { slug: "live-orders", name: "Orders", short: "One live board for every order" },
      { slug: "pos", name: "POS", short: "Take payments at the counter on the same system" },
      { slug: "stock-take", name: "Stock", short: "Counts, low-stock alerts and reorder drafts" },
      { slug: "delivery-routing", name: "Delivery", short: "Your own drivers, or the best courier for each order" },
      { slug: "fulfillment", name: "Shipping", short: "Pick, pack and track orders that go in the post" },
      { slug: "rostering", name: "Rostering", short: "Staff shifts next to your sales" },
    ],
  },
  {
    id: "numbers",
    title: "Know your numbers",
    note: "See what's working and what isn't.",
    icon: "analytics",
    items: [
      { slug: "stripe-payouts", name: "Payments", short: "Stripe pays into your own bank account" },
      { slug: "financial-reporting", name: "Reports", short: "Sales, GST and exports for Xero or your accountant" },
      { slug: "ai-assistant", name: "AI assistant", short: "Ask about your own business in plain English" },
    ],
  },
];

export const FEATURE_COUNT = FEATURE_GROUPS.reduce((n, g) => n + g.items.length, 0);

export function groupOf(slug: string): FeatureGroup | undefined {
  return FEATURE_GROUPS.find((g) => g.items.some((i) => i.slug === slug));
}
