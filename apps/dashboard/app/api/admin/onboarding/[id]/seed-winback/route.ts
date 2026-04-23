// ─── POST /api/admin/onboarding/[id]/seed-winback ───────────────────────────
// Body: { rules: [{ name, inactive_days, offer_type, offer_value, channel, template, cooldown_days }] }
// Inserts a set of default winback rules for the tenant so automations work
// on day 1 without the owner having to build them from scratch.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeedRule = {
  name:          string;
  inactive_days: number;
  offer_type:    string;
  offer_value:   number;
  channel:       string;
  template:      string;
  cooldown_days: number;
  is_active?:    boolean;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: businessId } = await params;
  const body  = (await req.json().catch(() => ({}))) as { rules?: SeedRule[] };
  const rules = body.rules ?? [];

  if (rules.length === 0) return NextResponse.json({ error: "No rules" }, { status: 400 });

  const db = createAdminClient();
  const rows = rules
    .filter(r => r.name?.trim())
    .map(r => ({
      business_id:   businessId,
      name:          r.name.trim(),
      inactive_days: Number(r.inactive_days) || 30,
      offer_type:    r.offer_type || "percent",
      offer_value:   Number(r.offer_value) || 10,
      channel:       r.channel || "sms",
      template:      r.template ?? "",
      cooldown_days: Number(r.cooldown_days) || 30,
      is_active:     r.is_active ?? true,
    }));

  if (rows.length === 0) return NextResponse.json({ error: "No valid rules" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("winback_rules") as any).insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inserted: data?.length ?? 0 });
}
