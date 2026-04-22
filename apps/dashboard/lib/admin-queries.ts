// ─── admin-queries.ts ────────────────────────────────────────────────────────
// Server-only queries that require the service-role (admin) Supabase client.
// NEVER import this file from client components — it depends on next/headers
// via supabase-server.ts.
// Only import from: API routes, Server Components, and Server Actions.

import { createAdminClient } from "@/lib/supabase-server";

export type AdminBusinessRow = {
  id:                 string;
  name:               string;
  type:               string;
  suburb:             string | null;
  subdomain:          string | null;
  logo_url:           string | null;
  stripe_account_id:  string | null;
  stripe_customer_id: string | null;
  settings:           Record<string, unknown>;
  created_at:         string;
  customerCount:      number;
  orderCount:         number;
  totalRevenue:       number;
  smsSent:            number;
  lastOrder:          string | null;
  modules:            Record<string, boolean>;
  owner:              { name: string | null; email: string | null } | null;
};

const DEFAULT_MODULES: Record<string, boolean> = {
  orders: true, loyalty: true, campaigns: true, ai_calls: false,
  driver_dispatch: false, stock: true, reviews: true, analytics: true,
  custom_website: true, ordering_app: false, sms: true, email: true,
};

export async function getAllBusinessesStats(): Promise<AdminBusinessRow[]> {
  const db = createAdminClient();

  const [bizsRes, custsRes, ordersRes, smsRes, usersRes] = await Promise.all([
    db.from("businesses").select("id, name, type, suburb, subdomain, logo_url, stripe_account_id, stripe_customer_id, settings, created_at"),
    db.from("customers").select("id, business_id"),
    db.from("orders").select("id, business_id, total, created_at"),
    db.from("sms_logs").select("id, business_id, status"),
    db.from("users").select("id, business_id, name, email, role").eq("role", "owner"),
  ]);

  const bizs    = bizsRes.data    ?? [];
  const custs   = custsRes.data   ?? [];
  const orders  = ordersRes.data  ?? [];
  const smsLogs = smsRes.data     ?? [];
  const users   = usersRes.data   ?? [];

  return bizs.map(b => {
    const settings = (b.settings ?? {}) as Record<string, unknown>;
    const modulesRaw = (settings.modules ?? {}) as Record<string, boolean>;
    const modules = { ...DEFAULT_MODULES, ...modulesRaw };
    const owner   = users.find(u => u.business_id === b.id);

    return {
      id:                 b.id,
      name:               b.name,
      type:               b.type,
      suburb:             b.suburb,
      subdomain:          b.subdomain,
      logo_url:           b.logo_url,
      stripe_account_id:  b.stripe_account_id,
      stripe_customer_id: b.stripe_customer_id,
      settings,
      created_at:         b.created_at,
      customerCount: custs.filter(c => c.business_id === b.id).length,
      orderCount:    orders.filter(o => o.business_id === b.id).length,
      totalRevenue:  orders.filter(o => o.business_id === b.id).reduce((s, o) => s + Number(o.total), 0),
      smsSent:       smsLogs.filter(l => l.business_id === b.id).length,
      lastOrder:     orders
        .filter(o => o.business_id === b.id)
        .sort((a, z) => (z.created_at > a.created_at ? 1 : -1))[0]?.created_at ?? null,
      modules,
      owner: owner ? { name: owner.name ?? null, email: owner.email ?? null } : null,
    };
  });
}

export async function updateBusinessModules(businessId: string, modules: Record<string, boolean>) {
  const db = createAdminClient();

  const { data: current } = await db
    .from("businesses")
    .select("settings")
    .eq("id", businessId)
    .single();

  const settings = (current?.settings ?? {}) as Record<string, unknown>;
  const nextSettings = { ...settings, modules: { ...(settings.modules as object ?? {}), ...modules } };

  const { error } = await db
    .from("businesses")
    .update({ settings: nextSettings })
    .eq("id", businessId);

  if (error) throw new Error(error.message);
  return nextSettings;
}
