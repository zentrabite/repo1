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

// ---- AI Calls ----
export type CallOutcome = "order_placed" | "booking" | "question" | "missed" | "transferred";

export type DemoCall = {
  id: string;
  caller: string;
  phone: string;
  startedAt: string;
  durationSec: number;
  outcome: CallOutcome;
  orderId?: string;
  orderTotal?: number;
  costCents: number;
  transcript: { who: "caller" | "ai"; text: string }[];
  summary: string;
};

export const calls: DemoCall[] = [
  {
    id: "call-118",
    caller: "Olivia Martin",
    phone: "+61 412 558 901",
    startedAt: "2026-04-18T13:02:00",
    durationSec: 84,
    outcome: "order_placed",
    orderId: "o1290",
    orderTotal: 33.86,
    costCents: 12,
    summary: "Repeat customer ordered her usual margherita + garlic bread. AI recognised her by phone and pre-filled the order.",
    transcript: [
      { who: "ai",     text: "Hi! Thanks for calling Nonna's Kitchen. Is this Olivia?" },
      { who: "caller", text: "Yeah hi, can I get my usual?" },
      { who: "ai",     text: "Of course — that's a margherita and a garlic bread, delivered to 12 King William Street. Sound right?" },
      { who: "caller", text: "Yes please. And add a sparkling water." },
      { who: "ai",     text: "Done. Total comes to $33.86 on the card ending 4421. Should be with you in about 35 minutes." },
      { who: "caller", text: "Perfect, thanks." },
    ],
  },
  {
    id: "call-117",
    caller: "Unknown",
    phone: "+61 401 552 008",
    startedAt: "2026-04-18T12:48:00",
    durationSec: 42,
    outcome: "question",
    costCents: 6,
    summary: "Caller asked about gluten-free options. AI confirmed GF base available + listed three GF pizzas.",
    transcript: [
      { who: "ai",     text: "Hi, Nonna's Kitchen — how can I help?" },
      { who: "caller", text: "Do you do gluten-free?" },
      { who: "ai",     text: "Yes! We have a gluten-free base for $4 extra. Most pizzas can be made GF — margherita, pepperoni, and quattro formaggi are the most popular." },
      { who: "caller", text: "Cool, I'll order online then." },
      { who: "ai",     text: "Sounds good. Have a great day!" },
    ],
  },
  {
    id: "call-116",
    caller: "James Kim",
    phone: "+61 424 712 030",
    startedAt: "2026-04-18T12:31:00",
    durationSec: 96,
    outcome: "booking",
    costCents: 14,
    summary: "Booked a table for 4 on Saturday 7pm. Calendar synced.",
    transcript: [
      { who: "ai",     text: "Welcome back James! What can I do for you today?" },
      { who: "caller", text: "I want to book a table for 4 on Saturday around 7." },
      { who: "ai",     text: "We have 7:00pm available for a table of 4 — would you like the booth or the window seat?" },
      { who: "caller", text: "Booth thanks." },
      { who: "ai",     text: "Booked. You'll get a text confirmation in a moment." },
    ],
  },
  {
    id: "call-115",
    caller: "Daniel O'Brien",
    phone: "+61 411 223 450",
    startedAt: "2026-04-18T12:14:00",
    durationSec: 28,
    outcome: "transferred",
    costCents: 4,
    summary: "Caller asked to speak to a person about a previous order issue — transferred to manager.",
    transcript: [
      { who: "ai",     text: "Hi, Nonna's Kitchen, how can I help?" },
      { who: "caller", text: "I had an issue with my order last night, can I speak to someone?" },
      { who: "ai",     text: "No worries, transferring you to Marco now. One moment." },
    ],
  },
  {
    id: "call-114",
    caller: "Unknown",
    phone: "+61 433 778 220",
    startedAt: "2026-04-18T11:52:00",
    durationSec: 0,
    outcome: "missed",
    costCents: 0,
    summary: "Caller hung up before AI could answer (rang for 1.2s).",
    transcript: [
      { who: "ai", text: "(no answer — caller hung up before pickup)" },
    ],
  },
  {
    id: "call-113",
    caller: "Sofia De Luca",
    phone: "+61 429 002 447",
    startedAt: "2026-04-18T11:34:00",
    durationSec: 72,
    outcome: "order_placed",
    orderId: "o1293",
    orderTotal: 33.88,
    costCents: 10,
    summary: "VIP customer ordered pepperoni + tiramisu. Tier upgrade to Platinum mentioned by AI (next bracket).",
    transcript: [
      { who: "ai",     text: "Hi Sofia, thanks for calling — pepperoni and tiramisu again?" },
      { who: "caller", text: "Haha you know me too well. Yes please, plus a Coke." },
      { who: "ai",     text: "On it. By the way — you're 60 points away from our top tier. One more order this month and you unlock free delivery for life." },
      { who: "caller", text: "Sweet! Okay, see you soon." },
    ],
  },
  {
    id: "call-112",
    caller: "Hana Tanaka",
    phone: "+61 439 651 208",
    startedAt: "2026-04-18T11:08:00",
    durationSec: 38,
    outcome: "question",
    costCents: 5,
    summary: "Asked about today's specials. AI quoted the lunch combo.",
    transcript: [
      { who: "ai",     text: "Hi Hana! What can I get you?" },
      { who: "caller", text: "Just calling to see what your lunch special is today?" },
      { who: "ai",     text: "It's the margherita + Caesar salad combo for $24 — saves you $7. Available till 3pm." },
      { who: "caller", text: "Lovely thanks, I'll order online." },
    ],
  },
];

export const callsTodayStats = {
  total: 47,
  answeredByAi: 44,
  ordersFromCalls: 19,
  revenueFromCalls: 612.40,
  avgDurationSec: 58,
  totalCostAud: 4.32,
  staffHoursSaved: 3.8,
};

export const callOutcomeLabel: Record<CallOutcome, { label: string; color: string; bg: string }> = {
  order_placed: { label: "Order placed", color: "#00B67A", bg: "rgba(0,182,122,0.14)" },
  booking:      { label: "Booking",      color: "#6BB1FF", bg: "rgba(107,177,255,0.14)" },
  question:     { label: "Question",     color: "#C9A6FF", bg: "rgba(201,166,255,0.14)" },
  transferred:  { label: "Transferred",  color: "#FFC14B", bg: "rgba(255,193,75,0.14)" },
  missed:       { label: "Missed",       color: "#FF5A5A", bg: "rgba(255,90,90,0.14)" },
};

// ---- Menu ----
export type MenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  emoji: string;
  desc?: string;
  popular?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export const menu: MenuCategory[] = [
  {
    id: "pizzas",
    name: "Pizzas",
    items: [
      { id: "p1", name: "Margherita",       price: 18.5, available: true,  emoji: "🍕", desc: "San Marzano tomato, fior di latte, basil",     popular: true },
      { id: "p2", name: "Pepperoni",        price: 22.0, available: true,  emoji: "🍕", desc: "Cured pork pepperoni, mozzarella",              popular: true },
      { id: "p3", name: "Quattro formaggi", price: 24.0, available: true,  emoji: "🍕", desc: "Mozzarella, gorgonzola, parmesan, taleggio" },
      { id: "p4", name: "Veggie supreme",   price: 21.0, available: true,  emoji: "🍕", desc: "Capsicum, mushroom, olives, onion, rocket" },
      { id: "p5", name: "Hawaiian",         price: 20.5, available: true,  emoji: "🍕", desc: "Ham, pineapple, mozzarella" },
      { id: "p6", name: "Quattro stagioni", price: 23.5, available: false, emoji: "🍕", desc: "Out of artichoke — back tomorrow" },
    ],
  },
  {
    id: "burgers",
    name: "Burgers",
    items: [
      { id: "b1", name: "Wagyu burger", price: 26.5, available: true, emoji: "🍔", desc: "180g wagyu, smoked cheddar, brioche", popular: true },
      { id: "b2", name: "Chicken burger", price: 22.0, available: true, emoji: "🍔", desc: "Buttermilk fried chicken, slaw" },
    ],
  },
  {
    id: "sides",
    name: "Sides",
    items: [
      { id: "s1", name: "Garlic bread",   price: 7.5, available: true, emoji: "🥖" },
      { id: "s2", name: "Caesar salad",   price: 13.5, available: true, emoji: "🥗" },
      { id: "s3", name: "Wings (8pc)",    price: 14.0, available: true, emoji: "🍗" },
      { id: "s4", name: "Fries",          price: 7.0,  available: true, emoji: "🍟" },
    ],
  },
  {
    id: "drinks",
    name: "Drinks",
    items: [
      { id: "d1", name: "Coke",            price: 4.0, available: true,  emoji: "🥤" },
      { id: "d2", name: "Sparkling water", price: 4.0, available: true,  emoji: "💧" },
      { id: "d3", name: "Peroni",          price: 8.5, available: true,  emoji: "🍺" },
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    items: [
      { id: "ds1", name: "Tiramisu",       price: 8.5, available: true,  emoji: "🍰", desc: "Made fresh in-house" },
      { id: "ds2", name: "Cannoli",        price: 6.5, available: true,  emoji: "🥐" },
    ],
  },
];

// ---- Drivers / Delivery ----
export type DriverStatus = "idle" | "picking_up" | "delivering" | "returning";

export type DemoDriver = {
  id: string;
  name: string;
  initials: string;
  type: "in_house" | "uber_direct" | "tasker";
  status: DriverStatus;
  currentOrderId?: string;
  etaMin?: number;
  todayDeliveries: number;
  todayDistanceKm: number;
  rating: number;
};

export const drivers: DemoDriver[] = [
  { id: "drv1", name: "Marco Rossi",    initials: "MR", type: "in_house",    status: "delivering", currentOrderId: "o1291", etaMin: 8,  todayDeliveries: 7, todayDistanceKm: 32.4, rating: 4.9 },
  { id: "drv2", name: "Aisha Khan",     initials: "AK", type: "in_house",    status: "returning",  currentOrderId: "o1290", etaMin: 4,  todayDeliveries: 6, todayDistanceKm: 28.1, rating: 4.8 },
  { id: "drv3", name: "Tom Whitfield",  initials: "TW", type: "in_house",    status: "idle",                                              todayDeliveries: 5, todayDistanceKm: 24.7, rating: 4.7 },
  { id: "drv4", name: "Uber Direct #14",initials: "UD", type: "uber_direct", status: "picking_up", currentOrderId: "o1294", etaMin: 12, todayDeliveries: 3, todayDistanceKm: 0,    rating: 4.6 },
  { id: "drv5", name: "Tasker · Sam B.",initials: "SB", type: "tasker",      status: "idle",                                              todayDeliveries: 2, todayDistanceKm: 9.8,  rating: 4.5 },
];

export const driverStatusLabel: Record<DriverStatus, { label: string; color: string; bg: string }> = {
  idle:        { label: "Idle",          color: "#9CA8BD", bg: "rgba(156,168,189,0.14)" },
  picking_up:  { label: "Picking up",    color: "#FFC14B", bg: "rgba(255,193,75,0.14)" },
  delivering:  { label: "Delivering",    color: "#6BB1FF", bg: "rgba(107,177,255,0.14)" },
  returning:   { label: "Returning",     color: "#00B67A", bg: "rgba(0,182,122,0.14)" },
};

export const driverTypeLabel: Record<DemoDriver["type"], { label: string; color: string }> = {
  in_house:    { label: "In-house",   color: "var(--green)" },
  uber_direct: { label: "Uber Direct", color: "#000" },
  tasker:      { label: "Tasker",     color: "#FF6B35" },
};

export const deliveryToday = {
  totalDeliveries: 28,
  inHouseShare: 0.71,
  uberDirectShare: 0.21,
  taskerShare: 0.08,
  avgDeliveryMin: 27,
  onTimeRate: 0.94,
  costSavedAud: 142.20, // vs all aggregator
};

// ---- Rewards / Loyalty ----
export type RewardTier = {
  name: "Bronze" | "Silver" | "Gold" | "VIP";
  min: number;
  multiplier: number;
  perks: string[];
  color: string;
};

export const rewardTiers: RewardTier[] = [
  { name: "Bronze", min: 0,    multiplier: 1.0, perks: ["1 point per $1 spent"],                                  color: "#C28D5C" },
  { name: "Silver", min: 200,  multiplier: 1.25, perks: ["1.25× points", "Free side every 5th order"],            color: "#B6C4D6" },
  { name: "Gold",   min: 500,  multiplier: 1.5,  perks: ["1.5× points", "Free delivery under $30", "Birthday bonus"], color: "#FFC14B" },
  { name: "VIP",    min: 1000, multiplier: 2.0,  perks: ["2× points", "Free delivery", "Priority support", "Off-menu items"], color: "#C9A24A" },
];

export const earnRules = [
  { rule: "Order spend",          earn: "1 point per $1" },
  { rule: "Refer a friend",       earn: "+250 points (after their first order)" },
  { rule: "Birthday week",        earn: "+200 bonus points" },
  { rule: "Leave a 5★ review",    earn: "+50 points" },
  { rule: "Order direct (not Uber/DoorDash)", earn: "Bonus 0.5× points" },
];

// ---- Automations ----
export type DemoAutomation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: "live" | "paused";
  runs30d: number;
  category: "order" | "review" | "stock" | "staff";
};

export const automations: DemoAutomation[] = [
  { id: "a01", name: "Auto-print kitchen ticket",       trigger: "Order paid",                       action: "Send to kitchen printer + KDS",          status: "live",   runs30d: 1238, category: "order" },
  { id: "a02", name: "Refund + apologise on bad review", trigger: "Review submitted ≤ 3★",            action: "Manager Slack + auto-credit $10",       status: "live",   runs30d: 6,   category: "review" },
  { id: "a03", name: "Low-stock SMS alert",              trigger: "Inventory item < threshold",       action: "SMS owner + auto-86 menu item",         status: "live",   runs30d: 14,  category: "stock" },
  { id: "a04", name: "VIP arrival ping",                 trigger: "VIP places order",                 action: "Notify floor manager",                  status: "live",   runs30d: 38,  category: "staff" },
  { id: "a05", name: "Late-order recovery",              trigger: "Order > 35 min in cooking",        action: "Apology SMS + 15% credit",              status: "live",   runs30d: 4,   category: "order" },
  { id: "a06", name: "Closing stock check",              trigger: "10:00pm daily",                    action: "Prompt staff to count + log",           status: "paused", runs30d: 0,   category: "stock" },
];

// ---- Analytics extras ----
export const analytics = {
  // Hourly orders today (24-hour)
  ordersByHour: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
    18, 22, 14, 6, 4, 9, 24, 32, 28, 14, 5, 1,
  ],
  topItems30d: [
    { name: "Margherita",       sold: 412, revenue: 7_622.00 },
    { name: "Pepperoni",        sold: 318, revenue: 6_996.00 },
    { name: "Quattro formaggi", sold: 184, revenue: 4_416.00 },
    { name: "Garlic bread",     sold: 502, revenue: 3_765.00 },
    { name: "Wagyu burger",     sold: 96,  revenue: 2_544.00 },
    { name: "Tiramisu",         sold: 144, revenue: 1_224.00 },
  ],
  segments: {
    vips:    { count: 28,  pct: 0.06 },
    regular: { count: 184, pct: 0.41 },
    new:     { count: 96,  pct: 0.21 },
    lapsing: { count: 64,  pct: 0.14 },
    lapsed:  { count: 80,  pct: 0.18 },
  },
  postcodes: [
    { postcode: "5000", orders: 312, revenue: 14_822.40 },
    { postcode: "5006", orders: 188, revenue: 8_932.20 },
    { postcode: "5067", orders: 142, revenue: 6_812.80 },
    { postcode: "5031", orders: 118, revenue: 5_492.40 },
    { postcode: "5045", orders: 98,  revenue: 4_578.20 },
  ],
};
