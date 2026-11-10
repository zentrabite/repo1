// The one made-up restaurant behind every demo.
//
// The CRM (/demo/live), the ordering site (/demo/merchant) and the customer app
// (/demo/app) all show Nonna's Kitchen, a wood-fired pizzeria in Adelaide.
// Anything that appears in more than one demo lives here: who the business is,
// the menu and prices, the rewards program, the deals, and the regular customer
// who is signed in on the ordering site and the app. Each demo keeps its own
// look and its own screen-only data.
//
// It's all sample data. The address is on a lane that doesn't exist, and the
// phone numbers come from the ranges the ACMA keeps for fiction ((08) 5550 and
// 0491 57x), so none of them can reach a real business or person.

// ---- The business --------------------------------------------------------

export const sampleBusiness = {
  name: "Nonna's Kitchen",
  kind: "Wood-fired pizzeria",
  city: "Adelaide",
  state: "SA",
  address: "18 Basil Lane, Adelaide SA 5000",
  phone: "(08) 5550 1288",
  hours: "Mon – Sun · 11:30am – 10:30pm",
  closes: "10:30 pm",
  opened: 2019,
  subdomain: "nonnas-kitchen",
  /** Owner on the CRM's Settings > Team list. */
  owner: { name: "Liam Potter", email: "liam@nonnas-kitchen.com.au" },
} as const;

// ---- Menu ----------------------------------------------------------------
// The CRM menu, the POS, every CRM order, the ordering site and the app all
// read these names and prices. Order lines are built with `line()`, which only
// accepts a name from this list, so a typo or a stale price fails the type check.

export type SampleCategory = "Pizzas" | "Burgers" | "Sides" | "Drinks" | "Desserts";

export const sampleCategories: readonly SampleCategory[] = ["Pizzas", "Burgers", "Sides", "Drinks", "Desserts"];

export type SampleMenuItem = {
  id: string;
  category: SampleCategory;
  name: string;
  price: number;
  emoji: string;
  desc: string;
  /** false = 86'd in the CRM. The ordering site and the app hide it. */
  available: boolean;
  popular?: boolean;
  vegetarian?: boolean;
};

export const sampleMenu = [
  { id: "p1",  category: "Pizzas",   name: "Margherita",       price: 18.5, emoji: "🍕", desc: "San Marzano tomato, fior di latte, basil",       available: true,  popular: true, vegetarian: true },
  { id: "p2",  category: "Pizzas",   name: "Pepperoni",        price: 22.0, emoji: "🌶️", desc: "Cured pork pepperoni, mozzarella",               available: true,  popular: true },
  { id: "p3",  category: "Pizzas",   name: "Quattro formaggi", price: 24.0, emoji: "🧀", desc: "Mozzarella, gorgonzola, parmesan, taleggio",     available: true,  vegetarian: true },
  { id: "p4",  category: "Pizzas",   name: "Veggie supreme",   price: 21.0, emoji: "🫑", desc: "Capsicum, mushroom, olives, onion, rocket",      available: true,  vegetarian: true },
  { id: "p5",  category: "Pizzas",   name: "Hawaiian",         price: 20.5, emoji: "🍍", desc: "Ham, pineapple, mozzarella",                     available: true },
  { id: "p6",  category: "Pizzas",   name: "Quattro stagioni", price: 23.5, emoji: "🍄", desc: "Out of artichoke — back tomorrow",               available: false },
  { id: "b1",  category: "Burgers",  name: "Wagyu burger",     price: 26.5, emoji: "🍔", desc: "180g wagyu, smoked cheddar, brioche",            available: true,  popular: true },
  { id: "b2",  category: "Burgers",  name: "Chicken burger",   price: 22.0, emoji: "🍔", desc: "Buttermilk fried chicken, slaw",                 available: true },
  { id: "s1",  category: "Sides",    name: "Garlic bread",     price: 7.5,  emoji: "🥖", desc: "Wood-fired, garlic butter, sea salt",            available: true,  vegetarian: true },
  { id: "s2",  category: "Sides",    name: "Caesar salad",     price: 13.5, emoji: "🥗", desc: "Cos, croutons, parmesan, soft egg",              available: true },
  { id: "s3",  category: "Sides",    name: "Wings",            price: 14.0, emoji: "🍗", desc: "8 pieces, smoky paprika glaze",                  available: true },
  { id: "s4",  category: "Sides",    name: "Fries",            price: 7.0,  emoji: "🍟", desc: "Hand-cut, sea salt, aioli",                      available: true,  vegetarian: true },
  { id: "d1",  category: "Drinks",   name: "Coke",             price: 4.0,  emoji: "🥤", desc: "330ml can",                                      available: true,  vegetarian: true },
  { id: "d2",  category: "Drinks",   name: "Sparkling water",  price: 4.0,  emoji: "💧", desc: "500ml bottle",                                   available: true,  vegetarian: true },
  { id: "d3",  category: "Drinks",   name: "Peroni",           price: 8.5,  emoji: "🍺", desc: "330ml bottle",                                   available: true,  vegetarian: true },
  { id: "ds1", category: "Desserts", name: "Tiramisu",         price: 8.5,  emoji: "🍰", desc: "Mascarpone, espresso, savoiardi. Made in-house", available: true,  vegetarian: true },
  { id: "ds2", category: "Desserts", name: "Cannoli",          price: 6.5,  emoji: "🥐", desc: "Ricotta, pistachio, orange peel",                available: true,  vegetarian: true },
] as const satisfies readonly SampleMenuItem[];

export type SampleItemName = (typeof sampleMenu)[number]["name"];

/** The same list, typed loosely for looping over. */
export const sampleMenuItems: readonly SampleMenuItem[] = sampleMenu;

const itemByName = new Map<string, SampleMenuItem>(sampleMenuItems.map((m) => [m.name, m]));

/** The menu item with this name. Names are checked by the type system. */
export function menuItem(name: SampleItemName): SampleMenuItem {
  return itemByName.get(name)!;
}

// ---- Orders --------------------------------------------------------------

export type SampleOrderLine = { name: SampleItemName; qty: number; price: number };
export type SampleOrderStatus = "new" | "cooking" | "ready" | "out" | "delivered" | "cancelled";
export type SampleOrderChannel = "storefront" | "pos" | "app" | "uber" | "doordash";

export type SampleOrder = {
  id: string;
  number: string;
  placedAt: string; // ISO, local Adelaide time
  status: SampleOrderStatus;
  channel: SampleOrderChannel;
  items: SampleOrderLine[];
  subtotal: number;
  /** Card fee, shown as "Stripe fee" in the CRM. */
  fees: number;
  tip: number;
  total: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** One order line at the menu price. */
export function line(name: SampleItemName, qty = 1): SampleOrderLine {
  return { name, qty, price: menuItem(name).price };
}

/** Subtotal and total worked out from the lines, so they always add up. */
export function priced(items: SampleOrderLine[], fees: number, tip: number) {
  const subtotal = cents(items.reduce((s, l) => s + l.price * l.qty, 0));
  return { items, subtotal, fees, tip, total: cents(subtotal + fees + tip) };
}

// ---- Delivery ------------------------------------------------------------

export const sampleDelivery = { fee: 6, freeOver: 50 } as const;

// ---- Rewards -------------------------------------------------------------

export type SampleTierName = "Bronze" | "Silver" | "Gold" | "VIP";

export type SampleTier = { name: SampleTierName; min: number; multiplier: number; perks: string[] };

export const sampleTiers: SampleTier[] = [
  { name: "Bronze", min: 0,    multiplier: 1.0,  perks: ["1 point per $1 spent"] },
  { name: "Silver", min: 200,  multiplier: 1.25, perks: ["1.25× points", "Free side every 5th order"] },
  { name: "Gold",   min: 500,  multiplier: 1.5,  perks: ["1.5× points", "Free delivery under $30", "Birthday bonus"] },
  { name: "VIP",    min: 1000, multiplier: 2.0,  perks: ["2× points", "Free delivery", "Priority support", "Off-menu items"] },
];

const TIER_RANK: Record<SampleTierName, number> = { Bronze: 0, Silver: 1, Gold: 2, VIP: 3 };

export type SampleReward = {
  id: string;
  name: string;
  cost: number;
  category: "treat" | "discount" | "delivery" | "status";
  tierMin: SampleTierName;
  redeems30d: number;
};

/** What points unlock. The CRM's catalogue, the ordering site and the app all list these. */
export const sampleRewards: SampleReward[] = [
  { id: "r01", name: "Free coffee on your next visit",   cost: 100,  category: "treat",    tierMin: "Bronze", redeems30d: 128 },
  { id: "r02", name: "Free garlic bread side",           cost: 150,  category: "treat",    tierMin: "Bronze", redeems30d: 76 },
  { id: "r03", name: "$10 off any order",                cost: 500,  category: "discount", tierMin: "Silver", redeems30d: 41 },
  { id: "r04", name: "Free delivery (under 5km)",        cost: 250,  category: "delivery", tierMin: "Silver", redeems30d: 83 },
  { id: "r05", name: "Free main (up to $24)",            cost: 1000, category: "treat",    tierMin: "Gold",   redeems30d: 19 },
  { id: "r06", name: "20% off a whole order (1 use)",    cost: 800,  category: "discount", tierMin: "Gold",   redeems30d: 22 },
  { id: "r07", name: "Bring a friend — free pizza",      cost: 1200, category: "treat",    tierMin: "VIP",    redeems30d: 6 },
  { id: "r08", name: "Skip-the-queue priority prep",     cost: 0,    category: "status",   tierMin: "VIP",    redeems30d: 54 },
];

export function tierRank(t: SampleTierName): number {
  return TIER_RANK[t];
}

/** A customer can redeem a reward once they have the points and the tier. */
export function canRedeem(r: SampleReward, tier: SampleTierName, points: number): boolean {
  return TIER_RANK[tier] >= TIER_RANK[r.tierMin] && points >= r.cost;
}

// ---- Deals ---------------------------------------------------------------
// Set prices for a few menu items. What you save is worked out from the menu.

export type SampleDeal = { id: string; title: string; subtitle: string; items: SampleItemName[]; price: number; saves: number; emoji: string };

function deal(id: string, title: string, subtitle: string, items: SampleItemName[], price: number, emoji: string): SampleDeal {
  const full = items.reduce((s, n) => s + menuItem(n).price, 0);
  return { id, title, subtitle, items, price, saves: cents(full - price), emoji };
}

export const sampleDeals: SampleDeal[] = [
  deal("d01", "Lunch combo",         "Margherita + Caesar salad · until 3pm",  ["Margherita", "Caesar salad"], 24, "🍕🥗"),
  deal("d02", "Family pack",         "Margherita, Pepperoni, garlic bread + tiramisu", ["Margherita", "Pepperoni", "Garlic bread", "Tiramisu"], 47.5, "👨‍👩‍👧"),
  deal("d03", "Midweek pizza + beer", "Margherita + a Peroni · Tue – Thu",     ["Margherita", "Peroni"], 23, "🍺"),
];

// ---- The regular ---------------------------------------------------------
// Sofia De Luca is the VIP in the CRM. She's also the customer signed in on the
// ordering site and the app, so her points, tier and orders match everywhere.

export const sampleCustomer = {
  id: "c11",
  name: "Sofia De Luca",
  firstName: "Sofia",
  email: "s.deluca@example.com",
  phone: "+61 491 571 804",
  tier: "VIP" as SampleTierName,
  points: 1580,
  ltv: 3240.0,
  /** Every order she has ever placed. Only the latest few are listed in the data. */
  orders: 52,
  firstOrderAt: "2024-06-18T12:40:00",
  lastOrderAt: "2026-04-18T13:10:00",
  memberSince: "Jun 2024",
  favourite: "Margherita + Tiramisu",
  postcode: "5000",
  address: "8 Grenfell St, Adelaide SA 5000",
  card: { brand: "Visa", last4: "4821" },
};

/** Sofia's five latest orders, newest first. #1293 is cooking right now. */
export const sampleCustomerOrders: SampleOrder[] = [
  { id: "o1293", number: "#1293", placedAt: "2026-04-18T13:10:00", status: "cooking",   channel: "app",        ...priced([line("Pepperoni"), line("Tiramisu")], 0.88, 2.5) },
  { id: "o1282", number: "#1282", placedAt: "2026-04-15T19:40:00", status: "delivered", channel: "app",        ...priced([line("Margherita", 2), line("Tiramisu")], 1.32, 4.5) },
  { id: "o1266", number: "#1266", placedAt: "2026-04-11T18:55:00", status: "delivered", channel: "storefront", ...priced([line("Margherita"), line("Garlic bread"), line("Tiramisu")], 1.0, 2.0) },
  { id: "o1251", number: "#1251", placedAt: "2026-04-07T19:20:00", status: "delivered", channel: "app",        ...priced([line("Quattro formaggi"), line("Margherita"), line("Peroni", 2)], 1.73, 4.0) },
  { id: "o1238", number: "#1238", placedAt: "2026-04-03T12:30:00", status: "delivered", channel: "pos",        ...priced([line("Margherita"), line("Sparkling water")], 0, 0) },
];
