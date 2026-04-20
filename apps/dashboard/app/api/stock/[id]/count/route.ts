import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBusinessIdFromRequest } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/stock/:id/count  — record a stock take
export async function POST(req: Request, ctx: Ctx) {
  const businessId = await getBusinessIdFromRequest(req);
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const after = Number(body?.after_qty ?? 0);
  const note = body?.note ?? null;
  const countedBy = body?.counted_by ?? null;

  const { data: existing, error: readErr } = await supabaseAdmin
    .from("stock_items")
    .select("on_hand")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  if (readErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = Number(existing.on_hand ?? 0);

  const { error: countErr } = await supabaseAdmin
    .from("stock_counts")
    .insert({
      business_id: businessId,
      stock_item_id: id,
      before_qty: before,
      after_qty: after,
      note,
      counted_by: countedBy,
    });
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  const { error: updErr } = await supabaseAdmin
    .from("stock_items")
    .update({ on_hand: after, last_counted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, before, after });
}
