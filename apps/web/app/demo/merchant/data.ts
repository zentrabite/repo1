// Nonna's Kitchen as its customers see it.
// Shared by /demo/merchant (ordering site) and /demo/app (customer app).
//
// Who the restaurant is, the menu, prices, deals, rewards and the signed-in
// customer all come from ../sample-business, the same data the CRM demo uses.
// Only the ordering site's own look (its colours) is set here.

import {
  canRedeem,
  menuItem,
  sampleBusiness,
  sampleCategories,
  sampleCustomer,
  sampleCustomerOrders,
  sampleDeals,
  sampleDelivery,
  sampleMenuItems,
  sampleRewards,
  sampleTiers,
  type SampleCategory,
  type SampleItemName,
  type SampleMenuItem,
  type SampleOrder,
  type SampleTier,
} from "../sample-business";

export const brand = {
  name: sampleBusiness.name,
  tagline: "Wood-fired. Neighbourhood. Forever.",
  primary: "#E8641F",       // warm orange
  primaryDark: "#C24A10",
  cream: "#FAF3E5",
  ink: "#1A1612",
  accent: "#24493F",        // forest
  phone: sampleBusiness.phone,
  address: sampleBusiness.address,
  hours: sampleBusiness.hours,
  opened: sampleBusiness.opened,
};

export type MenuItem = {
  id: string;
  category: SampleCategory;
  name: string;
  description: string;
  price: number;
  photo: string;
  popular?: boolean;
  vegetarian?: boolean;
};

function toMenuItem({ id, category, name, desc, price, photo, popular, vegetarian }: SampleMenuItem): MenuItem {
  return { id, category, name, description: desc, price, photo, popular, vegetarian };
}

// Items the restaurant has 86'd in the CRM don't show here.
export const menu: MenuItem[] = sampleMenuItems.filter((m) => m.available).map(toMenuItem);

export const menuByCategory = menu.reduce<Record<string, MenuItem[]>>((acc, m) => {
  acc[m.category] = acc[m.category] || [];
  acc[m.category]!.push(m);
  return acc;
}, {});

export const categories = sampleCategories.filter((c) => menuByCategory[c]?.length);

/** The menu item with this name, as the ordering site shows it. */
export function itemNamed(name: SampleItemName): MenuItem {
  return toMenuItem(menuItem(name));
}

export const featuredDeals = sampleDeals;

export const loyalty = {
  name: "Dough Club",
  tagline: "The more you bake with us, the more you bake-off.",
  earnRate: "1 point per $1 spent",
  tiers: sampleTiers,
  /** Rewards you spend points on, cheapest first. Perks that cost nothing sit in the tiers. */
  unlocks: sampleRewards.filter((r) => r.cost > 0).sort((a, b) => a.cost - b.cost),
  canRedeem,
};

export type Tier = SampleTier;

export function tierFor(points: number): Tier {
  let current = sampleTiers[0]!;
  for (const t of sampleTiers) if (points >= t.min) current = t;
  return current;
}

/** The tier after this one, or null at the top. */
export function tierAfter(t: Tier): Tier | null {
  const i = sampleTiers.findIndex((x) => x.name === t.name);
  return sampleTiers[i + 1] ?? null;
}

/** The customer signed in on the ordering site and in the app. She's in the CRM too. */
export const member = sampleCustomer;

export type MemberOrder = SampleOrder & { lines: { item: MenuItem; qty: number }[] };

/** Her latest orders, newest first. The first one is cooking right now. */
export const memberOrders: MemberOrder[] = sampleCustomerOrders.map((o) => ({
  ...o,
  lines: o.items.map((l) => ({ item: itemNamed(l.name), qty: l.qty })),
}));

/** The number her next order will get (the CRM's latest is #1294). */
export const nextOrderNumber = "#1295";

/** Delivery is free for VIPs and over $50, otherwise a flat fee. */
export function deliveryFee(subtotal: number, tier = member.tier): number {
  if (tier === "VIP" || subtotal >= sampleDelivery.freeOver) return 0;
  return sampleDelivery.fee;
}

export function orderSummary(o: SampleOrder): string {
  return o.items.map((l) => (l.qty > 1 ? `${l.qty}× ${l.name}` : l.name)).join(" · ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today · 1:10 PM" or "15 Apr · 7:40 PM". Worked out by hand so the server
 *  and the browser always print the same thing. The demo's today is 18 Apr. */
export function orderWhen(iso: string): string {
  const [date = "", time = ""] = iso.split("T");
  const [, m = 1, d = 1] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const clock = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
  return date === "2026-04-18" ? `Today · ${clock}` : `${d} ${MONTHS[m - 1]} · ${clock}`;
}

/** "15 Apr" */
export function orderDay(iso: string): string {
  const [, m = 1, d = 1] = (iso.split("T")[0] ?? "").split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(n);
}
