// ─── admin-queries.ts ────────────────────────────────────────────────────────
// Server-only queries that require the service-role (admin) Supabase client.
// NEVER import this file from client components — it depends on next/headers
// via supabase-server.ts.
// Only import from: API routes, Server Components, and Server Actions.

import { createAdminClient } from "@/lib/supabase-server";

export async function getAllBusinessesStats() {
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
    lastOrder:     orders
      .filter(o => o.business_id === b.id)
      .sort((a, z) => (z.created_at > a.created_at ? 1 : -1))[0]?.created_at ?? null,
  }));
}
