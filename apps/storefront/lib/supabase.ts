import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
