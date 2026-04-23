// ─── POST /api/admin/onboarding/[id]/seed-menu ──────────────────────────────
// Body: { categories: [{ name, sort_order, items: [{ name, price, description? }] }] }
// Creates the categories + items for the business in one shot.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeedItem     = { name: string; price: number; description?: string };
type SeedCategory = { name: string; sort_order?: number; items: SeedItem[] };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: businessId } = await params;
  const body = (await req.json().catch(() => ({}))) as { categories?: SeedCategory[] };
  const cats = body.categories ?? [];

  if (cats.length === 0) return NextResponse.json({ error: "No categories" }, { status: 400 });

  const db = createAdminClient();
  let createdCats = 0;
  let createdItems = 0;

  for (const [i, cat] of cats.entries()) {
    if (!cat.name?.trim()) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCat, error: catErr } = await (db.from("menu_categories") as any)
      .insert({ business_id: businessId, name: cat.name.trim(), sort_order: cat.sort_order ?? i })
      .select()
      .single();

    if (catErr || !newCat) continue;
    createdCats++;

    const items = (cat.items ?? [])
      .filter(it => it.name?.trim())
      .map((it, j) => ({
        business_id:  businessId,
        category_id:  newCat.id,
        name:         it.name.trim(),
        description:  it.description?.trim() || null,
        price:        Number(it.price) || 0,
        available:    true,
        dietary_tags: [] as string[],
        sort_order:   j,
      }));

    if (items.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itErr } = await (db.from("menu_items") as any).insert(items);
    if (!itErr) createdItems += items.length;
  }

  return NextResponse.json({ success: true, categories: createdCats, items: createdItems });
}
