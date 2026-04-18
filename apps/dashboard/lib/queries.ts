// ─── Supabase data fetching utilities ────────────────────────────────────────
// All dashboard data comes through these functions.
// They use the browser client (RLS enforced — each merchant sees only their data).
//
// Usage in a page:
//   const orders = await getRecentOrders(businessId)

import { supabase } from "./supabase";
import type { Order, Customer, Campaign, MenuItem, MenuCategory, AnalyticsDaily } from "./database.types";

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

  const todayRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const directPct    = orders.length > 0
    ? Math.round(orders.filter(o => o.source === "direct").length / orders.length * 100)
    : 0;

  const vipCount     = customers.filter(c => c.segment === "VIP").length;
  const atRiskCount  = customers.filter(c => c.segment === "At Risk").length;
  const newCount     = customers.filter(c => c.segment === "New").length;

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

// ─── Super Admin ─────────────────────────────────────────────────────────────
// Uses the admin client (service role) to bypass RLS and see all businesses.

export async function getAllBusinessesStats() {
  // Import admin client inline to avoid using it in browser contexts
  const { createAdminClient } = await import("./supabase-server");
  const db = createAdminClient();

  const [bizsRes, custsRes, ordersRes, smsRes] = await Promise.all([
    db.from("businesses").select("id, name, type, suburb, plan, stripe_account_id, stripe_customer_id, created_at"),
    db.from("customers").select("id, business_id"),
    db.from("orders").select("id, business_id, total, created_at"),
    db.from("sms_logs").select("id, business_id, status"),
  ]);

  const bizs    = bizsRes.data    ?? [];
  const custs   = custsRes.data   ?? [];
  const orders  = ordersRes.data  ?? [];
  const smsLogs = smsRes.data     ?? [];

  return bizs.map(b => ({
    ...b,
    customerCount: custs.filter(c => c.business_id === b.id).length,
    orderCount:    orders.filter(o => o.business_id === b.id).length,
    totalRevenue:  orders.filter(o => o.business_id === b.id).reduce((s, o) => s + Number(o.total), 0),
    smsSent:       smsLogs.filter(l => l.business_id === b.id).length,
    lastOrder:     orders.filter(o => o.business_id === b.id).sort((a, b) => b.created_at > a.created_at ? 1 : -1)[0]?.created_at ?? null,
  }));
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
  const converted = logs.filter(l => l.converted).length;
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
