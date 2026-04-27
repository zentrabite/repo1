import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialised so build-time prerender doesn't crash when env vars are
// missing. The client is only constructed on first property access.
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  _client = createClient(url, anon);
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getClient() as any)[prop];
  },
});

// ─── Load business + menu by subdomain ───────────────────────────────────────
export async function getBusinessBySubdomain(subdomain: string) {
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("subdomain", subdomain)
    .single();
  return business;
}

export async function getMenuByBusiness(businessId: string) {
  const [catsRes, itemsRes] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("business_id", businessId).order("sort_order"),
    supabase.from("menu_items").select("*").eq("business_id", businessId).eq("available", true).order("sort_order"),
  ]);

  const cats  = catsRes.data  ?? [];
  const items = itemsRes.data ?? [];

  return cats.map((cat: any) => ({
    ...cat,
    items: items.filter((item: any) => item.category_id === cat.id),
  }));
}
