// ─── Business config ─────────────────────────────────────────────────────────
// Replace with live Supabase + settings values once connected.

export const BIZ = {
  name:     "Your Business",
  location: "Location",
  logo:     "🏪",
  // All metrics come from Supabase — zeroed until connected
  revenue:      0,
  directPct:    0,
  repeatRate:   0,
  aiCredits:    120,
  aiUsed:       0,
  aiCost:       0.45,
  smsCredits:   1000,
  smsUsed:      0,
  rewardsIssued:0,
  winbackRev:   0,
  customers:    0,
  vip:          0,
  atRisk:       0,
  newCust:      0,
  uberRev:      0,
  menulogRev:   0,
  directRev:    0,
  uberFees:     0,
  menulogFees:  0,
};

// ─── Orders ──────────────────────────────────────────────────────────────────
// Populated by Supabase realtime once storefront is live.
export const ORDERS: {
  id:string; cust:string; items:string; src:string;
  total:number; fee:number; profit:number; status:string; rwdPts:number;
}[] = [];

// ─── Customers ───────────────────────────────────────────────────────────────
// Populated from Supabase customers table.
export const CUSTOMERS: {
  id:number; name:string; email:string; phone:string;
  orders:number; ltv:number; avgOrd:number; pts:number;
  last:string; src:string; seg:string; tier:string; tags:string[];
}[] = [];

// ─── Automation templates ────────────────────────────────────────────────────
// These are the product's built-in campaign types.
// Stats (sent/conv/rev) come from Supabase once Twilio is wired up.
export const CAMPAIGNS = [
  { name:"Win-Back",         trigger:"14 days inactive",       template:"Hey {name}, we miss you! $10 off your next order: {link}", type:"SMS",   status:"inactive", sent:0, conv:0, rev:0 },
  { name:"Birthday",         trigger:"3 days before birthday", template:"Happy birthday {name}! Here's 15% off: {link}",           type:"SMS",   status:"inactive", sent:0, conv:0, rev:0 },
  { name:"Welcome",          trigger:"First order placed",     template:"Welcome {name}! 10% off your next order: {link}",         type:"Email", status:"inactive", sent:0, conv:0, rev:0 },
  { name:"Loyalty Milestone",trigger:"Customer hits 500 pts",  template:"You've unlocked Silver tier! $15 off: {link}",            type:"SMS",   status:"inactive", sent:0, conv:0, rev:0 },
  { name:"Re-engagement",    trigger:"30 days inactive",       template:"It's been a while {name}. Here's $15 on us: {link}",     type:"Email", status:"inactive", sent:0, conv:0, rev:0 },
  { name:"Review Request",   trigger:"2hrs after delivery",    template:"How was your order? Leave us a review: {link}",          type:"Email", status:"inactive", sent:0, conv:0, rev:0 },
];

// ─── AI transcript ────────────────────────────────────────────────────────────
// Product feature demo — shows how Sarah AI handles a call.
export const AI_LOG = [
  { role:"AI",   text:"Hi, this is Sarah calling from your restaurant. Am I speaking with Emma?" },
  { role:"Cust", text:"Yes, that's me!" },
  { role:"AI",   text:"Great! We noticed it's been a while since your last visit. We'd love to welcome you back with $10 off your next order — would you like to place one now?" },
  { role:"Cust", text:"Oh that sounds lovely! Can I get a Margherita and some garlic bread?" },
  { role:"AI",   text:"Of course! That's $31 minus your $10 discount — just $21. Shall I confirm that for pickup in 25 minutes?" },
  { role:"Cust", text:"Yes please!" },
  { role:"AI",   text:"Done! Your order is confirmed. You've also earned 210 reward points. Thanks Emma!" },
];

// ─── Menu ────────────────────────────────────────────────────────────────────
// Empty until merchant adds their own items via the Menu Builder.
export const MENU_DATA: { cat:string; items:{ name:string; price:number; avail:boolean; mods:string[] }[] }[] = [];

// ─── Rewards table ────────────────────────────────────────────────────────────
// Populated from Supabase customers table (sorted by points).
export const REWARDS_TABLE: {
  name:string; email:string; pts:number; tier:string; last:string;
}[] = [];

// ─── Zentra Rewards offers ───────────────────────────────────────────────────
// No default offers — merchant creates their own via the form.
export const ZENTRA_REWARDS_OFFERS: {
  title:string; desc:string; status:string; redemptions:number; expires:string; type:string;
}[] = [];
