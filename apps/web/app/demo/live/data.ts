// Fake data for the interactive demo at /demo/live.
// Deterministic (no Math.random in render path) so hydration stays stable.

export type OrderStatus = "new" | "cooking" | "ready" | "out" | "delivered" | "cancelled";
export type OrderChannel = "storefront" | "pos" | "app" | "uber" | "doordash";

export type DemoOrder = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  placedAt: string; // ISO
  status: OrderStatus;
  channel: OrderChannel;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  fees: number;
  tip: number;
  total: number;
  deliveryEta?: string;
  notes?: string;
};

export type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Bronze" | "Silver" | "Gold" | "VIP";
  points: number;
  ltv: number;
  orders: number;
  lastOrderAt: string;
  firstOrderAt: string;
  favourite: string;
  postcode: string;
  status: "active" | "lapsing" | "lapsed";
};

export type DemoCampaign = {
  id: string;
  name: string;
  channel: "sms" | "email";
  trigger: string;
  status: "live" | "paused" | "draft";
  sent30d: number;
  recovered30d: number;
  revenue30d: number;
  template: string;
};

export const business = {
  name: "Nonna's Kitchen",
  type: "Pizzeria · Adelaide, SA",
  logo: "🍕",
  today: "Saturday, 18 Apr",
};

// ---- Customers ----
export const customers: DemoCustomer[] = [
  { id: "c01", name: "Olivia Martin",    email: "olivia.m@gmail.com",       phone: "+61 412 558 901", tier: "VIP",    points: 1240, ltv: 2480.50, orders: 38, lastOrderAt: "2026-04-17T19:22:00", firstOrderAt: "2024-11-02T18:40:00", favourite: "Margherita + Garlic bread", postcode: "5000", status: "active" },
  { id: "c02", name: "James Kim",        email: "james.kim@outlook.com",    phone: "+61 424 712 030", tier: "Gold",   points: 780,  ltv: 1642.20, orders: 27, lastOrderAt: "2026-04-16T20:05:00", firstOrderAt: "2024-09-22T19:10:00", favourite: "Pepperoni",                  postcode: "5006", status: "active" },
  { id: "c03", name: "Priya Sharma",     email: "priya.s@yahoo.com",        phone: "+61 433 880 124", tier: "Gold",   points: 612,  ltv: 1288.00, orders: 22, lastOrderAt: "2026-04-18T12:40:00", firstOrderAt: "2024-12-12T13:22:00", favourite: "Quattro formaggi",           postcode: "5008", status: "active" },
  { id: "c04", name: "Daniel O'Brien",   email: "dan.obrien@gmail.com",     phone: "+61 411 223 450", tier: "Silver", points: 320,  ltv: 782.80,  orders: 14, lastOrderAt: "2026-04-14T19:55:00", firstOrderAt: "2025-02-01T20:00:00", favourite: "Wagyu burger",               postcode: "5062", status: "active" },
  { id: "c05", name: "Hana Tanaka",      email: "hana.tanaka@gmail.com",    phone: "+61 439 651 208", tier: "Silver", points: 285,  ltv: 624.50,  orders: 12, lastOrderAt: "2026-04-11T18:10:00", firstOrderAt: "2025-01-15T19:30:00", favourite: "Margherita",                 postcode: "5000", status: "active" },
  { id: "c06", name: "Ethan Wright",     email: "e.wright@icloud.com",      phone: "+61 432 118 702", tier: "Silver", points: 240,  ltv: 548.20,  orders: 11, lastOrderAt: "2026-04-09T19:30:00", firstOrderAt: "2025-02-20T20:05:00", favourite: "Pepperoni + Wings",          postcode: "5063", status: "active" },
  { id: "c07", name: "Mia Novak",        email: "mia.novak@gmail.com",      phone: "+61 438 002 551", tier: "Bronze", points: 95,   ltv: 218.40,  orders: 6,  lastOrderAt: "2026-04-05T12:15:00", firstOrderAt: "2025-09-01T18:20:00", favourite: "Hawaiian",                   postcode: "5067", status: "active" },
  { id: "c08", name: "Lachlan Park",     email: "lachlan.p@outlook.com",    phone: "+61 422 559 104", tier: "Bronze", points: 60,   ltv: 142.80,  orders: 4,  lastOrderAt: "2026-03-28T19:40:00", firstOrderAt: "2025-11-12T19:30:00", favourite: "Veggie supreme",             postcode: "5015", status: "lapsing" },
  { id: "c09", name: "Amelia Rossi",     email: "amelia.r@gmail.com",       phone: "+61 410 445 220", tier: "Silver", points: 210,  ltv: 486.00,  orders: 9,  lastOrderAt: "2026-03-15T20:05:00", firstOrderAt: "2025-03-18T19:00:00", favourite: "Quattro stagioni",           postcode: "5031", status: "lapsing" },
  { id: "c10", name: "Henry Fitzgerald", email: "henry.fitz@gmail.com",     phone: "+61 437 776 091", tier: "Bronze", points: 40,   ltv: 92.40,   orders: 3,  lastOrderAt: "2026-02-22T18:30:00", firstOrderAt: "2025-12-04T19:10:00", favourite: "Margherita",                 postcode: "5045", status: "lapsed" },
  { id: "c11", name: "Sofia De Luca",    email: "s.deluca@icloud.com",      phone: "+61 429 002 447", tier: "VIP",    points: 1580, ltv: 3240.00, orders: 52, lastOrderAt: "2026-04-18T13:10:00", firstOrderAt: "2024-06-18T12:40:00", favourite: "Margherita + Tiramisu",      postcode: "5000", status: "active" },
  { id: "c12", name: "Noah Thompson",    email: "noah.t@gmail.com",         phone: "+61 413 881 209", tier: "Gold",   points: 520,  ltv: 1122.60, orders: 19, lastOrderAt: "2026-04-17T12:22:00", firstOrderAt: "2024-10-30T13:00:00", favourite: "Pepperoni",                  postcode: "5006", status: "active" },
  { id: "c13", name: "Zara Ahmed",       email: "zara.ahmed@gmail.com",     phone: "+61 438 112 005", tier: "Silver", points: 190,  ltv: 412.00,  orders: 8,  lastOrderAt: "2026-04-10T20:15:00", firstOrderAt: "2025-04-22T19:40:00", favourite: "Veggie supreme",             postcode: "5067", status: "active" },
  { id: "c14", name: "Max Bennett",      email: "max.bennett@outlook.com",  phone: "+61 422 665 009", tier: "Bronze", points: 70,   ltv: 164.80,  orders: 5,  lastOrderAt: "2026-04-02T19:40:00", firstOrderAt: "2025-08-10T19:30:00", favourite: "Wagyu burger",               postcode: "5015", status: "lapsing" },
  { id: "c15", name: "Eva Petrov",       email: "eva.petrov@gmail.com",     phone: "+61 415 334 881", tier: "Silver", points: 170,  ltv: 388.00,  orders: 7,  lastOrderAt: "2026-04-12T19:30:00", firstOrderAt: "2025-05-08T20:10:00", favourite: "Margherita",                 postcode: "5031", status: "active" },
];

// Customer lookup
export const customerById: Record<string, DemoCustomer> = Object.fromEntries(customers.map((c) => [c.id, c]));

// ---- Orders ----
// Mix of statuses so the Orders page looks alive.
export const orders: DemoOrder[] = [
  { id: "o1294", number: "#1294", customerId: "c03", customerName: "Priya Sharma",    placedAt: "2026-04-18T12:40:00", status: "new",       channel: "storefront", items: [{ name: "Margherita",     qty: 2, price: 18.5 }, { name: "Garlic bread", qty: 1, price: 7.5 }], subtotal: 44.5, fees: 1.28, tip: 3.0, total: 48.78, notes: "No basil please" },
  { id: "o1293", number: "#1293", customerId: "c11", customerName: "Sofia De Luca",    placedAt: "2026-04-18T13:10:00", status: "cooking",   channel: "app",        items: [{ name: "Pepperoni",      qty: 1, price: 22.0 }, { name: "Tiramisu",     qty: 1, price: 8.5 }],  subtotal: 30.5, fees: 0.88, tip: 2.5, total: 33.88 },
  { id: "o1292", number: "#1292", customerId: "c12", customerName: "Noah Thompson",    placedAt: "2026-04-18T12:22:00", status: "ready",     channel: "pos",        items: [{ name: "Quattro formaggi",qty: 1, price: 24.0 }, { name: "Coke",         qty: 2, price: 4.0 }],  subtotal: 32.0, fees: 0.00, tip: 0.0, total: 32.00 },
  { id: "o1291", number: "#1291", customerId: "c02", customerName: "James Kim",        placedAt: "2026-04-18T11:55:00", status: "out",       channel: "uber",       items: [{ name: "Pepperoni",      qty: 2, price: 22.0 }, { name: "Wings",        qty: 1, price: 14.0 }], subtotal: 58.0, fees: 1.67, tip: 5.0, total: 64.67, deliveryEta: "12:35pm" },
  { id: "o1290", number: "#1290", customerId: "c01", customerName: "Olivia Martin",    placedAt: "2026-04-18T11:40:00", status: "delivered", channel: "app",        items: [{ name: "Margherita",     qty: 1, price: 18.5 }, { name: "Garlic bread", qty: 1, price: 7.5 }, { name: "Sparkling water", qty: 1, price: 4.0 }], subtotal: 30.0, fees: 0.86, tip: 3.0, total: 33.86 },
  { id: "o1289", number: "#1289", customerId: "c05", customerName: "Hana Tanaka",      placedAt: "2026-04-18T11:15:00", status: "delivered", channel: "storefront", items: [{ name: "Margherita",     qty: 1, price: 18.5 }, { name: "Caesar salad", qty: 1, price: 13.5 }], subtotal: 32.0, fees: 0.92, tip: 2.5, total: 35.42 },
  { id: "o1288", number: "#1288", customerId: "c04", customerName: "Daniel O'Brien",   placedAt: "2026-04-17T19:55:00", status: "delivered", channel: "doordash",   items: [{ name: "Wagyu burger",   qty: 1, price: 26.5 }, { name: "Fries",        qty: 1, price: 7.0 }, { name: "Coke", qty: 1, price: 4.0 }], subtotal: 37.5, fees: 1.08, tip: 0.0, total: 38.58 },
  { id: "o1287", number: "#1287", customerId: "c06", customerName: "Ethan Wright",     placedAt: "2026-04-17T19:30:00", status: "delivered", channel: "app",        items: [{ name: "Pepperoni",      qty: 1, price: 22.0 }, { name: "Wings",        qty: 1, price: 14.0 }], subtotal: 36.0, fees: 1.04, tip: 4.0, total: 41.04 },
  { id: "o1286", number: "#1286", customerId: "c13", customerName: "Zara Ahmed",       placedAt: "2026-04-17T20:15:00", status: "delivered", channel: "storefront", items: [{ name: "Veggie supreme", qty: 1, price: 21.0 }, { name: "Garlic bread", qty: 1, price: 7.5 }], subtotal: 28.5, fees: 0.82, tip: 2.0, total: 31.32 },
  { id: "o1285", number: "#1285", customerId: "c15", customerName: "Eva Petrov",       placedAt: "2026-04-17T19:30:00", status: "delivered", channel: "app",        items: [{ name: "Margherita",     qty: 1, price: 18.5 }],                                                                                   subtotal: 18.5, fees: 0.54, tip: 1.5, total: 20.54 },
  { id: "o1284", number: "#1284", customerId: "c01", customerName: "Olivia Martin",    placedAt: "2026-04-16T19:22:00", status: "delivered", channel: "app",        items: [{ name: "Margherita",     qty: 1, price: 18.5 }, { name: "Tiramisu",     qty: 1, price: 8.5 }],  subtotal: 27.0, fees: 0.78, tip: 2.5, total: 30.28 },
  { id: "o1283", number: "#1283", customerId: "c02", customerName: "James Kim",        placedAt: "2026-04-16T20:05:00", status: "delivered", channel: "pos",        items: [{ name: "Pepperoni",      qty: 1, price: 22.0 }, { name: "Coke",         qty: 1, price: 4.0 }],  subtotal: 26.0, fees: 0.00, tip: 0.0, total: 26.00 },
  { id: "o1282", number: "#1282", customerId: "c11", customerName: "Sofia De Luca",    placedAt: "2026-04-15T19:40:00", status: "delivered", channel: "app",        items: [{ name: "Margherita",     qty: 2, price: 18.5 }, { name: "Tiramisu",     qty: 1, price: 8.5 }],  subtotal: 45.5, fees: 1.32, tip: 4.5, total: 51.32 },
  { id: "o1281", number: "#1281", customerId: "c12", customerName: "Noah Thompson",    placedAt: "2026-04-15T12:22:00", status: "delivered", channel: "storefront", items: [{ name: "Pepperoni",      qty: 1, price: 22.0 }],                                                                                   subtotal: 22.0, fees: 0.64, tip: 2.0, total: 24.64 },
  { id: "o1280", number: "#1280", customerId: "c07", customerName: "Mia Novak",        placedAt: "2026-04-14T12:15:00", status: "delivered", channel: "uber",       items: [{ name: "Hawaiian",       qty: 1, price: 20.5 }, { name: "Garlic bread", qty: 1, price: 7.5 }],  subtotal: 28.0, fees: 0.81, tip: 0.0, total: 28.81 },
];

// Most-recent-first
export const ordersByRecent = [...orders].sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1));
export const orderById: Record<string, DemoOrder> = Object.fromEntries(orders.map((o) => [o.id, o]));

// ---- Winback campaigns ----
export const campaigns: DemoCampaign[] = [
  {
    id: "wb01",
    name: "30-day silent winback",
    channel: "sms",
    trigger: "Customer has not ordered in 30 days",
    status: "live",
    sent30d: 184,
    recovered30d: 22,
    revenue30d: 1_188.40,
    template: "Hey {name}, we miss you 🍕 Here's 20% off your next order with us. Code: COMEBACK20",
  },
  {
    id: "wb02",
    name: "VIP birthday bonus",
    channel: "sms",
    trigger: "Customer birthday in 7 days (Gold+ only)",
    status: "live",
    sent30d: 12,
    recovered30d: 9,
    revenue30d: 428.00,
    template: "Happy early birthday {name}! 🎂 Enjoy +250 bonus points this week — on us.",
  },
  {
    id: "wb03",
    name: "Abandoned-cart nudge",
    channel: "email",
    trigger: "Cart abandoned > 20 min",
    status: "live",
    sent30d: 92,
    recovered30d: 11,
    revenue30d: 492.20,
    template: "You left a {favourite} in your cart, {name}. Still warm from the oven — complete your order?",
  },
  {
    id: "wb04",
    name: "Lapsed 60-day last chance",
    channel: "sms",
    trigger: "Customer has not ordered in 60 days",
    status: "live",
    sent30d: 48,
    recovered30d: 4,
    revenue30d: 168.80,
    template: "{name}, it's been a while 👋 One free garlic bread with your next order. Code: WELCOME",
  },
  {
    id: "wb05",
    name: "Post-delivery review ask",
    channel: "email",
    trigger: "Order delivered > 2 hours",
    status: "live",
    sent30d: 312,
    recovered30d: 0,
    revenue30d: 0,
    template: "How was your {favourite}, {name}? Leave a quick review — takes 20 seconds.",
  },
  {
    id: "wb06",
    name: "Gold tier upgrade celebration",
    channel: "sms",
    trigger: "Customer crosses Gold threshold",
    status: "paused",
    sent30d: 0,
    recovered30d: 0,
    revenue30d: 0,
    template: "Welcome to Gold, {name} ⭐ You now earn 1.5× points and get free delivery under $30.",
  },
];

// ---- Financials ----
export const financials = {
  today: { revenue: 1842.60, orders: 38, avgTicket: 48.49 },
  wtd:   { revenue: 9220.00, orders: 189, avgTicket: 48.78 },
  mtd:   { revenue: 38_402.40, orders: 812, avgTicket: 47.29 },
  last30: { revenue: 58_912.80, orders: 1238, avgTicket: 47.59, repeatRate: 0.54 },
  bySource: [
    { source: "Storefront (own)", amount: 18_824.40, pct: 0.32, commission: 0 },
    { source: "Mobile app",       amount: 14_728.20, pct: 0.25, commission: 0 },
    { source: "POS (in-store)",   amount: 11_782.56, pct: 0.20, commission: 0 },
    { source: "Uber Eats",         amount: 8_836.92,  pct: 0.15, commission: 1_767.38 },
    { source: "DoorDash",          amount: 4_720.72,  pct: 0.08, commission: 944.14 },
  ],
  // 14-day daily revenue (in AUD). Latest is rightmost.
  daily: [
    { day: "Sat", revenue: 1782.20 },
    { day: "Sun", revenue: 2120.40 },
    { day: "Mon", revenue: 1488.10 },
    { day: "Tue", revenue: 1620.60 },
    { day: "Wed", revenue: 1742.80 },
    { day: "Thu", revenue: 1882.40 },
    { day: "Fri", revenue: 2640.00 },
    { day: "Sat", revenue: 2922.20 },
    { day: "Sun", revenue: 2380.10 },
    { day: "Mon", revenue: 1560.00 },
    { day: "Tue", revenue: 1702.80 },
    { day: "Wed", revenue: 1820.20 },
    { day: "Thu", revenue: 1964.40 },
    { day: "Fri", revenue: 2486.00 },
  ],
  fees30d: {
    stripe: 1_023.60,
    sms: 46.20,
    aggregatorCommission: 2_711.52,
    payouts: 55_131.48,
  },
};

// ---- Helpers ----
export const channelLabel: Record<OrderChannel, string> = {
  storefront: "Storefront",
  pos: "POS",
  app: "Mobile app",
  uber: "Uber Eats",
  doordash: "DoorDash",
};

export const statusLabel: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new:       { label: "New",             color: "#00B67A", bg: "rgba(0,182,122,0.14)" },
  cooking:   { label: "Cooking",         color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
  ready:     { label: "Ready",           color: "#FFC14B", bg: "rgba(255,193,75,0.14)" },
  out:       { label: "Out for delivery",color: "#6BB1FF", bg: "rgba(107,177,255,0.14)" },
  delivered: { label: "Delivered",       color: "#9CA8BD", bg: "rgba(156,168,189,0.12)" },
  cancelled: { label: "Cancelled",       color: "#FF5A5A", bg: "rgba(255,90,90,0.14)" },
};

export function formatAUD(n: number): string {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", { weekday: "short", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string, nowISO = "2026-04-18T13:20:00"): string {
  const diffMin = Math.max(0, Math.round((new Date(nowISO).getTime() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.round(diffMin / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
