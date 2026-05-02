// ─── Supabase data fetching utilities ────────────────────────────────────────
// All dashboard data comes through these functions.
// They use the browser client (RLS enforced — each merchant sees only their data).
//
// Usage in a page:
//   const orders = await getRecentOrders(businessId)

import { supabase } from "./supabase";
import type {
  Order, Customer, Campaign, MenuItem, MenuCategory, AnalyticsDaily,
  WinbackRule, AiCallProfile, RosterShift, AiRecommendation,
} from "./database.types";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(businessId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [ordersRes, analyticsRes, customersRes, creditsRes] = await Promise.all([
    // Today's orders
    supabase
      .from("orders")
      .select("total, source")
      .eq("business_id", businessId)
      .gte("created_at", `${today}T00:00:00`),

    // Last 12 months of analytics
    supabase
      .from("analytics_daily")
      .select("date, total_revenue, direct_orders, agg_orders, new_customers")
      .eq("business_id", businessId)
      .order("date", { ascending: true })
      .limit(365),

    // Customer segment counts
    supabase
      .from("customers")
      .select("segment")
      .eq("business_id", businessId),

    // SMS credits (from business settings)
    supabase
      .from("businesses")
      .select("settings")
      .eq("id", businessId)
      .single(),
  ]);

  const orders     = ordersRes.data ?? [];
  const analytics  = analyticsRes.data ?? [];
  const customers  = customersRes.data ?? [];

  const todayRevenue = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
  const directPct    = orders.length > 0
    ? Math.round(orders.filter((o: any) => o.source === "direct").length / orders.length * 100)
    : 0;

  const vipCount     = customers.filter((c: any) => c.segment === "VIP").length;
  const atRiskCount  = customers.filter((c: any) => c.segment === "At Risk").length;
  const newCount     = customers.filter((c: any) => c.segment === "New").length;

  return {
    todayOrders:   orders.length,
    todayRevenue,
    directPct,
    totalCustomers: customers.length,
    vip:           vipCount,
    atRisk:        atRiskCount,
    newCust:       newCount,
    analytics12mo: analytics,
  };
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getOrders(businessId: string, source?: string) {
  let query = supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (source && source !== "All") {
    query = query.eq("source", source.toLowerCase().replace(" ", "_"));
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Order[];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function getCustomers(businessId: string, segment?: string) {
  let query = supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("total_spent", { ascending: false });

  if (segment && segment !== "All") {
    query = query.eq("segment", segment);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Customer[];
}

export async function getCustomerOrders(customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function createCustomer(businessId: string, data: {
  name: string; phone: string; email: string;
}) {
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      source: "manual",
      segment: "New",
    })
    .select("*")
    .single();
  if (error) throw error;
  return customer as Customer;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function getCampaigns(businessId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at");
  if (error) throw error;
  return data as Campaign[];
}

export async function updateCampaign(
  campaignId: string,
  updates: { name?: string; template?: string; active?: boolean; trigger_days?: number; discount_amount?: number }
) {
  const { error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", campaignId);
  if (error) throw error;
}

export async function createCampaign(businessId: string, data: {
  type: string; name: string; template: string;
  active: boolean; trigger_days: number; discount_amount: number; cooldown_days: number;
}) {
  const { error } = await supabase
    .from("campaigns")
    .insert({ business_id: businessId, ...data });
  if (error) throw error;
}

// ─── Menu ────────────────────────────────────────────────────────────────────

export async function getMenu(businessId: string) {
  const [catsRes, itemsRes] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order"),
  ]);

  const cats  = (catsRes.data  ?? []) as MenuCategory[];
  const items = (itemsRes.data ?? []) as MenuItem[];

  // Nest items under their categories
  const categorised = cats.map(cat => ({
    ...cat,
    items: items.filter(item => item.category_id === cat.id),
  }));

  // Items with no category go into a virtual "General" section so they're never lost
  const uncategorised = items.filter(item => !item.category_id || !cats.find(c => c.id === item.category_id));
  if (uncategorised.length > 0) {
    categorised.push({
      id: "__uncategorised__",
      business_id: businessId,
      name: "General",
      sort_order: 9999,
      items: uncategorised,
    } as any);
  }

  return categorised;
}

export async function toggleMenuItemAvailability(itemId: string, available: boolean) {
  const { error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", itemId);
  if (error) throw error;
}

export async function updateMenuItem(itemId: string, updates: Partial<MenuItem>) {
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);
  if (error) throw error;
}

export async function createMenuCategory(businessId: string, name: string) {
  const { data, error } = await supabase
    .from("menu_categories")
    .insert({ business_id: businessId, name, sort_order: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return data as MenuCategory;
}

export async function createMenuItem(businessId: string, data: {
  category_id: string | null;
  name: string;
  price: number;
  description: string;
  image_url?: string | null;
}) {
  const { data: item, error } = await supabase
    .from("menu_items")
    .insert({ business_id: businessId, ...data, available: true, sort_order: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return item as MenuItem;
}

export async function deleteMenuItem(itemId: string) {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
  if (error) throw error;
}

// ─── Analytics / Financials ───────────────────────────────────────────────────

export async function getAnalytics(businessId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const { data, error } = await supabase
    .from("analytics_daily")
    .select("*")
    .eq("business_id", businessId)
    .gte("date", from.toISOString().split("T")[0])
    .order("date");
  if (error) throw error;
  return data as AnalyticsDaily[];
}

// ─── SMS Stats ───────────────────────────────────────────────────────────────

export async function getSmsStats(businessId: string) {
  const { data, error } = await supabase
    .from("sms_logs")
    .select("status, converted")
    .eq("business_id", businessId);
  if (error) throw error;
  const logs = data ?? [];
  const sent      = logs.length;
  const converted = logs.filter((l: any) => l.converted).length;
  return { sent, converted };
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export async function getCustomersByPoints(businessId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, points_balance, total_spent")
    .eq("business_id", businessId)
    .gt("points_balance", 0)
    .order("points_balance", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Dashboard: extended widgets ──────────────────────────────────────────────

// Sum of revenue_attributed from campaign_events in the last N days.
export async function getRecoveredRevenue(businessId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("campaign_events")
    .select("revenue_attributed")
    .eq("business_id", businessId)
    .eq("event_type", "redeemed")
    .gte("created_at", from.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.revenue_attributed ?? 0), 0);
}

// Repeat customer rate over the last N days.
// A repeat customer is anyone with >1 paid order in the window.
export async function getRepeatRate(businessId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("business_id", businessId)
    .gte("created_at", from.toISOString())
    .not("customer_id", "is", null);
  if (error) throw error;

  const rows = data ?? [];
  const counts = new Map<string, number>();
  for (const r of rows) {
    const id = (r as any).customer_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const total  = counts.size;
  const repeat = Array.from(counts.values()).filter(n => n > 1).length;
  return {
    totalCustomers:  total,
    repeatCustomers: repeat,
    repeatRate:      total === 0 ? 0 : Math.round((repeat / total) * 100),
  };
}

// Revenue, bucketed per day, for the last N days (for the trend chart).
export async function getRevenueByDay(businessId: string, days = 14) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("business_id", businessId)
    .gte("created_at", from.toISOString());
  if (error) throw error;

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().split("T")[0], 0);
  }
  for (const row of data ?? []) {
    const day = new Date((row as any).created_at).toISOString().split("T")[0];
    buckets.set(day, (buckets.get(day) ?? 0) + Number((row as any).total ?? 0));
  }
  return Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue }));
}

// Revenue grouped by channel/source for the last N days.
export async function getRevenueByChannel(businessId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("orders")
    .select("total, source")
    .eq("business_id", businessId)
    .gte("created_at", from.toISOString());
  if (error) throw error;

  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const ch = (r as any).source || "direct";
    map.set(ch, (map.get(ch) ?? 0) + Number((r as any).total ?? 0));
  }
  return Array.from(map.entries())
    .map(([channel, revenue]) => ({ channel, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

// Customer who's spent the most — lifetime.
export async function getTopCustomer(businessId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, total_spent, total_orders")
    .eq("business_id", businessId)
    .order("total_spent", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

// Top 3 win-back rules by revenue recovered.
export async function getTopWinbacks(businessId: string, limit = 3) {
  const { data, error } = await supabase
    .from("winback_rules")
    .select("id, name, redemptions, revenue, is_active")
    .eq("business_id", businessId)
    .order("revenue", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Win-back rules (CRUD) ────────────────────────────────────────────────────

export async function getWinbackRules(businessId: string) {
  const { data, error } = await supabase
    .from("winback_rules")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WinbackRule[];
}

export async function createWinbackRule(businessId: string, input: {
  name: string; inactive_days: number; offer_type: string;
  offer_value: number; channel: string; template: string;
  cooldown_days: number; is_active: boolean;
}) {
  const { data, error } = await supabase
    .from("winback_rules")
    .insert({ business_id: businessId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as WinbackRule;
}

export async function updateWinbackRule(id: string, updates: Partial<WinbackRule>) {
  const { error } = await supabase
    .from("winback_rules")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWinbackRule(id: string) {
  const { error } = await supabase.from("winback_rules").delete().eq("id", id);
  if (error) throw error;
}

// ─── AI Call profile (singleton per business) ─────────────────────────────────

export async function getAiCallProfile(businessId: string) {
  const { data, error } = await supabase
    .from("ai_call_profiles")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AiCallProfile | null;
}

export async function upsertAiCallProfile(businessId: string, input: Partial<AiCallProfile>) {
  const { data, error } = await supabase
    .from("ai_call_profiles")
    .upsert(
      { business_id: businessId, ...input, updated_at: new Date().toISOString() },
      { onConflict: "business_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as AiCallProfile;
}

// ─── Rostering ────────────────────────────────────────────────────────────────

export async function getShifts(businessId: string, weekStartISO: string, weekEndISO: string) {
  const { data, error } = await supabase
    .from("roster_shifts")
    .select("*")
    .eq("business_id", businessId)
    .gte("shift_start", weekStartISO)
    .lte("shift_start", weekEndISO)
    .order("shift_start");
  if (error) throw error;
  return (data ?? []) as RosterShift[];
}

export async function createShift(businessId: string, input: {
  employee_name: string; role?: string | null;
  shift_start: string; shift_end: string;
  hourly_rate?: number | null; notes?: string | null;
}) {
  const { data, error } = await supabase
    .from("roster_shifts")
    .insert({ business_id: businessId, status: "scheduled", ...input })
    .select()
    .single();
  if (error) throw error;
  return data as RosterShift;
}

export async function updateShift(id: string, updates: Partial<RosterShift>) {
  const { error } = await supabase.from("roster_shifts").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteShift(id: string) {
  const { error } = await supabase.from("roster_shifts").delete().eq("id", id);
  if (error) throw error;
}

// ─── AI recommendations ───────────────────────────────────────────────────────

export async function getRecommendations(businessId: string, limit = 5) {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "open")
    .order("priority")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AiRecommendation[];
}

export async function dismissRecommendation(id: string) {
  const { error } = await supabase
    .from("ai_recommendations")
    .update({ status: "dismissed" })
    .eq("id", id);
  if (error) throw error;
}

// ─── Fulfillment (e-commerce shipping pipeline) ──────────────────────────────

// The fulfillment pipeline is picked → packed → shipped → delivered.
// Each stage stamps a timestamp on the orders row.
export type FulfillmentStage = "placed" | "picked" | "packed" | "shipped" | "delivered";

export const FULFILLMENT_STAGES: FulfillmentStage[] = [
  "placed", "picked", "packed", "shipped", "delivered",
];

const STAGE_COLUMN: Record<FulfillmentStage, string> = {
  placed:    "placed_at",
  picked:    "picked_at",
  packed:    "packed_at",
  shipped:   "shipped_at",
  delivered: "delivered_at",
};

// Derives the current stage from which timestamps are set.
export function currentStage(order: Order): FulfillmentStage {
  if (order.delivered_at) return "delivered";
  if (order.shipped_at)   return "shipped";
  if (order.packed_at)    return "packed";
  if (order.picked_at)    return "picked";
  return "placed";
}

// Fetches every fulfillment-eligible order (shipping or delivery) for the
// business. Dine-in and takeaway orders aren't shown here — they live on
// the /orders page.
export async function getFulfillmentOrders(
  businessId: string,
  opts: { type?: "shipping" | "delivery" | "all"; limit?: number } = {},
) {
  const { type = "all", limit = 200 } = opts;
  let q = supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (type === "all") {
    q = q.in("fulfillment_type", ["shipping", "delivery"]);
  } else {
    q = q.eq("fulfillment_type", type);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Order[];
}

// Stamps the given stage's timestamp on the order. If `now` is false we
// clear it (un-check). Returns the updated row.
export async function stampFulfillment(
  orderId: string,
  stage: FulfillmentStage,
  on = true,
) {
  const column = STAGE_COLUMN[stage];
  const { data, error } = await supabase
    .from("orders")
    .update({ [column]: on ? new Date().toISOString() : null })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}

// Merchant-editable carrier + tracking info.
export async function updateTracking(orderId: string, input: {
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
}) {
  const { data, error } = await supabase
    .from("orders")
    .update(input)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}

// ─── Analytics: top items ─────────────────────────────────────────────────────

// Reads the orders.items JSON and aggregates by item name.
// Works without an order_items table (which the current schema doesn't have).
export async function getTopMenuItems(businessId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await supabase
    .from("orders")
    .select("items, total")
    .eq("business_id", businessId)
    .gte("created_at", from.toISOString());
  if (error) throw error;

  const map = new Map<string, { qty: number; revenue: number }>();
  for (const o of data ?? []) {
    const items = Array.isArray((o as any).items) ? (o as any).items : [];
    for (const it of items) {
      const name = it?.name ?? it?.item_name ?? "Unknown";
      const qty  = Number(it?.quantity ?? it?.qty ?? 1);
      const price = Number(it?.price ?? it?.unit_price ?? 0);
      const line = qty * price;
      const current = map.get(name) ?? { qty: 0, revenue: 0 };
      map.set(name, { qty: current.qty + qty, revenue: current.revenue + line });
    }
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}


// ─── Drivers ─────────────────────────────────────────────────────────────────
// Schema: drivers(id, business_id, name, phone, email, vehicle_type, status,
//                 hourly_rate, notes, created_at)
// Pages use: is_active (bool), provider (string) — mapped from status/vehicle_type

export async function getDrivers(businessId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, business_id, name, phone, email, vehicle_type, status, hourly_rate, notes, created_at")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    ...d,
    provider:  d.vehicle_type ?? null,
    is_active: d.status !== "offline",
  }));
}

export async function createDriver(businessId: string, input: Record<string, any>): Promise<any> {
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      business_id:  businessId,
      name:         input.name,
      phone:        input.phone  ?? null,
      email:        input.email  ?? null,
      vehicle_type: input.provider ?? null,
      status:       input.is_active === false ? "offline" : "online",
      notes:        input.notes  ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, provider: (data as any).vehicle_type ?? null, is_active: (data as any).status !== "offline" };
}

export async function updateDriver(id: string, updates: Record<string, any>): Promise<any> {
  const payload: Record<string, any> = {};
  if ("name"      in updates) payload.name         = updates.name;
  if ("phone"     in updates) payload.phone        = updates.phone;
  if ("email"     in updates) payload.email        = updates.email;
  if ("provider"  in updates) payload.vehicle_type = updates.provider;
  if ("notes"     in updates) payload.notes        = updates.notes;
  if ("is_active" in updates) payload.status       = updates.is_active ? "online" : "offline";

  const { data, error } = await supabase
    .from("drivers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return { ...data, provider: (data as any).vehicle_type ?? null, is_active: (data as any).status !== "offline" };
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
}


// ─── Reviews ─────────────────────────────────────────────────────────────────
// Schema: reviews(id, business_id, customer_id, customer_name, source, rating,
//                 body, sentiment, reply, reply_sent_at, status, order_id, created_at)
// Pages use: platform, comment, replied (bool), reply_text — mapped from schema

export async function getReviews(businessId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, business_id, customer_name, source, rating, body, reply, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    platform:   r.source       ?? null,
    comment:    r.body         ?? null,
    reply_text: r.reply        ?? null,
    replied:    r.status === "replied",
  }));
}

export async function updateReview(id: string, updates: Record<string, any>): Promise<any> {
  const payload: Record<string, any> = {};
  if ("reply_text" in updates) payload.reply  = updates.reply_text;
  if ("replied"    in updates) payload.status = updates.replied ? "replied" : "pending";
  if ("reply"      in updates) payload.reply  = updates.reply;
  if ("status"     in updates) payload.status = updates.status;

  const { data, error } = await supabase
    .from("reviews")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    platform:   (data as any).source ?? null,
    comment:    (data as any).body   ?? null,
    reply_text: (data as any).reply  ?? null,
    replied:    (data as any).status === "replied",
  };
}


// ─── Rewards catalogue ────────────────────────────────────────────────────────
// Schema: rewards_catalogue(id, business_id, title, description, points_cost,
//                           reward_type, reward_value, is_active, sort_order, created_at)
// Pages use: name (→ title), category (→ reward_type)

export async function getRewardsCatalogue(businessId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("rewards_catalogue")
    .select("id, business_id, title, description, points_cost, reward_type, is_active, sort_order, created_at")
    .eq("business_id", businessId)
    .order("points_cost");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    ...c,
    name:     c.title       ?? "",
    category: c.reward_type ?? null,
  }));
}

export async function createCatalogueItem(businessId: string, input: Record<string, any>): Promise<any> {
  const { data, error } = await supabase
    .from("rewards_catalogue")
    .insert({
      business_id:  businessId,
      title:        input.name ?? input.title ?? "",
      description:  input.description ?? null,
      points_cost:  Number(input.points_cost ?? 0),
      reward_type:  input.category ?? input.reward_type ?? "free_item",
      is_active:    input.is_active !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, name: (data as any).title, category: (data as any).reward_type };
}

export async function updateCatalogueItem(id: string, updates: Record<string, any>): Promise<any> {
  const payload: Record<string, any> = {};
  if ("name"        in updates) payload.title       = updates.name;
  if ("title"       in updates) payload.title       = updates.title;
  if ("description" in updates) payload.description = updates.description;
  if ("points_cost" in updates) payload.points_cost = Number(updates.points_cost);
  if ("category"    in updates) payload.reward_type = updates.category;
  if ("reward_type" in updates) payload.reward_type = updates.reward_type;
  if ("is_active"   in updates) payload.is_active   = updates.is_active;

  const { data, error } = await supabase
    .from("rewards_catalogue")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return { ...data, name: (data as any).title, category: (data as any).reward_type };
}

export async function deleteCatalogueItem(id: string): Promise<void> {
  const { error } = await supabase.from("rewards_catalogue").delete().eq("id", id);
  if (error) throw error;
}


// ─── Reward redemptions ───────────────────────────────────────────────────────
// Joined with customers(name) and rewards_catalogue(title → name, points_cost)

export async function getRecentRedemptions(businessId: string, limit = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("id, points_spent, status, redeemed_at, created_at, customers(name), rewards_catalogue(title, points_cost)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    rewards_catalogue: r.rewards_catalogue
      ? { ...r.rewards_catalogue, name: r.rewards_catalogue.title ?? "" }
      : null,
  }));
}
