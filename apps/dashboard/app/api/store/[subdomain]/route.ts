// GET /api/store/[subdomain] — public endpoint, returns business + menu
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(_req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const db = createServerClient();

  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("id, name, type, suburb, logo_url, subdomain")
    .eq("subdomain", subdomain)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const [catsRes, itemsRes] = await Promise.all([
    db.from("menu_categories").select("*").eq("business_id", business.id).order("sort_order"),
    db.from("menu_items").select("*").eq("business_id", business.id).eq("available", true).order("sort_order"),
  ]);

  const cats  = catsRes.data  ?? [];
  const items = itemsRes.data ?? [];

  const menu = cats.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id),
  }));

  // Include uncategorised items under "General"
  const uncategorised = items.filter(i => !i.category_id || !cats.find(c => c.id === i.category_id));
  if (uncategorised.length > 0) menu.push({ id: "__general__", name: "General", sort_order: 999, business_id: business.id, items: uncategorised } as any);

  return NextResponse.json({ business, menu });
}
