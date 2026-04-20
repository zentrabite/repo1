// Super Admin demo data — deterministic, fake. Shared by the list view and detail view.

export type ModuleId =
  | "orders"
  | "loyalty"
  | "campaigns"
  | "ai_calls"
  | "driver_dispatch"
  | "stock"
  | "reviews"
  | "analytics"
  | "custom_website"
  | "ordering_app"
  | "sms"
  | "email";

export const MODULE_CATALOGUE: { id: ModuleId; label: string; desc: string; cost: number; dependencies?: ModuleId[] }[] = [
  { id: "orders",          label: "Orders & POS",            cost: 29, desc: "Storefront, order board, KDS, payments" },
  { id: "loyalty",         label: "Loyalty & rewards",       cost: 19, desc: "Points, tiers, redemptions" },
  { id: "campaigns",       label: "Campaigns & winback",     cost: 29, desc: "Automated SMS/email with attribution", dependencies: ["sms", "email"] },
  { id: "ai_calls",        label: "AI phone ordering",       cost: 29, desc: "Twilio + AI voice agent (credit-metered)" },
  { id: "driver_dispatch", label: "Driver dispatch",         cost: 19, desc: "Internal roster + Uber/DoorDash fallback" },
  { id: "stock",           label: "Stock & AI ordering",     cost: 19, desc: "Par levels, expiry, reorder suggestions" },
  { id: "reviews",         label: "Reviews & feedback",      cost: 9,  desc: "Auto-ask + AI reply draft" },
  { id: "analytics",       label: "Advanced analytics",      cost: 19, desc: "Cohort retention, heatmaps" },
  { id: "custom_website",  label: "Custom ordering website", cost: 19, desc: "Branded subdomain" },
  { id: "ordering_app",    label: "Branded customer app",    cost: 29, desc: "iOS + Android PWA" },
  { id: "sms",             label: "SMS channel",             cost: 0,  desc: "Used by campaigns & automations" },
  { id: "email",           label: "Email channel",           cost: 0,  desc: "Used by campaigns & automations" },
];

export type TenantHealth = "healthy" | "attention" | "at_risk";

export type Tenant = {
  id: string;
  name: string;
  category: string;
  plan: "Starter" | "Growth" | "Scale";
  locations: number;
  modules: Partial<Record<ModuleId, boolean>>;
  mrr: number; // monthly recurring in AUD
  ordersMonth: number;
  aiCredits: { used: number; cap: number };
  lastActive: string; // ISO
  health: TenantHealth;
  owner: string;
  subdomain: string;
  stripeStatus: "active" | "past_due" | "incomplete";
};

export const tenants: Tenant[] = [
  {
    id: "t-harbour",
    name: "Harbour Lane Pizza Co",
    category: "Restaurant",
    plan: "Growth",
    locations: 2,
    modules: {
      orders: true, loyalty: true, campaigns: true, ai_calls: true, driver_dispatch: true,
      stock: true, reviews: true, analytics: true, custom_website: true, ordering_app: true,
      sms: true, email: true,
    },
    mrr: 289,
    ordersMonth: 1842,
    aiCredits: { used: 1820, cap: 2500 },
    lastActive: "2026-04-20T09:14:00",
    health: "healthy",
    owner: "Marco Benedetti",
    subdomain: "harbourlane",
    stripeStatus: "active",
  },
  {
    id: "t-nonnas",
    name: "Nonna's Kitchen",
    category: "Restaurant",
    plan: "Growth",
    locations: 1,
    modules: {
      orders: true, loyalty: true, campaigns: true, ai_calls: false, driver_dispatch: true,
      stock: true, reviews: true, analytics: false, custom_website: true, ordering_app: false,
      sms: true, email: true,
    },
    mrr: 189,
    ordersMonth: 978,
    aiCredits: { used: 430, cap: 1000 },
    lastActive: "2026-04-20T07:40:00",
    health: "healthy",
    owner: "Liam Potter",
    subdomain: "nonnas",
    stripeStatus: "active",
  },
  {
    id: "t-velo",
    name: "Velo Fitness",
    category: "Personal trainer",
    plan: "Starter",
    locations: 1,
    modules: {
      orders: false, loyalty: true, campaigns: true, ai_calls: false, driver_dispatch: false,
      stock: false, reviews: true, analytics: true, custom_website: true, ordering_app: true,
      sms: true, email: true,
    },
    mrr: 89,
    ordersMonth: 0,
    aiCredits: { used: 240, cap: 500 },
    lastActive: "2026-04-19T18:22:00",
    health: "healthy",
    owner: "Jasmine Wu",
    subdomain: "velofit",
    stripeStatus: "active",
  },
  {
    id: "t-sienna",
    name: "Sienna Beauty Studio",
    category: "Appointment-based",
    plan: "Starter",
    locations: 1,
    modules: {
      orders: false, loyalty: true, campaigns: true, ai_calls: true, driver_dispatch: false,
      stock: true, reviews: true, analytics: false, custom_website: true, ordering_app: false,
      sms: true, email: true,
    },
    mrr: 119,
    ordersMonth: 0,
    aiCredits: { used: 890, cap: 1000 },
    lastActive: "2026-04-20T08:05:00",
    health: "attention",
    owner: "Sienna Collins",
    subdomain: "sienna",
    stripeStatus: "active",
  },
  {
    id: "t-uncommon",
    name: "Uncommon Coffee",
    category: "Café",
    plan: "Growth",
    locations: 3,
    modules: {
      orders: true, loyalty: true, campaigns: true, ai_calls: false, driver_dispatch: false,
      stock: true, reviews: true, analytics: true, custom_website: true, ordering_app: true,
      sms: true, email: true,
    },
    mrr: 246,
    ordersMonth: 3210,
    aiCredits: { used: 620, cap: 2500 },
    lastActive: "2026-04-20T08:48:00",
    health: "healthy",
    owner: "Owen Davies",
    subdomain: "uncommon",
    stripeStatus: "active",
  },
  {
    id: "t-tide",
    name: "Tide Pilates",
    category: "Fitness studio",
    plan: "Starter",
    locations: 1,
    modules: {
      orders: false, loyalty: true, campaigns: true, ai_calls: false, driver_dispatch: false,
      stock: false, reviews: true, analytics: false, custom_website: true, ordering_app: false,
      sms: true, email: true,
    },
    mrr: 79,
    ordersMonth: 0,
    aiCredits: { used: 60, cap: 500 },
    lastActive: "2026-04-15T07:20:00",
    health: "at_risk",
    owner: "Kate Morrison",
    subdomain: "tidepilates",
    stripeStatus: "past_due",
  },
  {
    id: "t-bondi",
    name: "Bondi Bagel Bros",
    category: "Café / takeaway",
    plan: "Growth",
    locations: 2,
    modules: {
      orders: true, loyalty: true, campaigns: true, ai_calls: true, driver_dispatch: true,
      stock: true, reviews: true, analytics: true, custom_website: true, ordering_app: true,
      sms: true, email: true,
    },
    mrr: 298,
    ordersMonth: 2540,
    aiCredits: { used: 2100, cap: 2500 },
    lastActive: "2026-04-20T09:01:00",
    health: "attention",
    owner: "Dean Phillips",
    subdomain: "bondibagel",
    stripeStatus: "active",
  },
  {
    id: "t-thistle",
    name: "Thistle & Thorn Bakery",
    category: "Bakery",
    plan: "Starter",
    locations: 1,
    modules: {
      orders: true, loyalty: true, campaigns: false, ai_calls: false, driver_dispatch: false,
      stock: true, reviews: false, analytics: false, custom_website: true, ordering_app: false,
      sms: false, email: true,
    },
    mrr: 68,
    ordersMonth: 412,
    aiCredits: { used: 0, cap: 500 },
    lastActive: "2026-04-19T16:30:00",
    health: "healthy",
    owner: "Isla Brown",
    subdomain: "thistle",
    stripeStatus: "active",
  },
];

export function tenantHealthLabel(h: TenantHealth) {
  return h === "healthy" ? "Healthy" : h === "attention" ? "Needs attention" : "At risk";
}

export function tenantHealthColor(h: TenantHealth) {
  return h === "healthy" ? "#00B67A" : h === "attention" ? "#FFC14B" : "#FF6B6B";
}

export const platformKpis = {
  tenants: tenants.length,
  activeTenants: tenants.filter((t) => t.stripeStatus === "active" && t.health !== "at_risk").length,
  mrr: tenants.reduce((s, t) => s + t.mrr, 0),
  ordersThisMonth: tenants.reduce((s, t) => s + t.ordersMonth, 0),
  creditsUsed: tenants.reduce((s, t) => s + t.aiCredits.used, 0),
  creditsCap: tenants.reduce((s, t) => s + t.aiCredits.cap, 0),
};
