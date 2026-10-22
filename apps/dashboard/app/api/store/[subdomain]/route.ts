// GET /api/store/[subdomain] — public endpoint, returns business + menu
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(_req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const db = createServerClient();

  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("id, name, type, suburb, logo_url, subdomain, contact_phone, settings, stripe_account_id, stripe_charges_enabled")
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

  // Only the public bits of settings go to the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (business.settings ?? {}) as Record<string, any>;
  const accent = typeof settings.branding?.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(settings.branding.accent_color)
    ? settings.branding.accent_color : null;
  const publicBusiness = {
    id:            business.id,
    name:          business.name,
    type:          business.type,
    suburb:        business.suburb,
    logo_url:      business.logo_url,
    subdomain:     business.subdomain,
    phone:         business.contact_phone ?? (typeof settings.phone === "string" ? settings.phone : null),
    accent_color:  accent,
    taking_orders: Boolean(business.stripe_account_id && business.stripe_charges_enabled),
    has_website:   settings.site?.published === true,
  };

  return NextResponse.json({ business: publicBusiness, menu });
}
