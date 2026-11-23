// ─── /api/admin/sending ───────────────────────────────────────────────────────
// Super admins only. The stop rules' pauses (lib/send-guard.ts).
//   GET   every open pause with its shop and why, and the last 20 resumed
//   POST  { id } resumes one. From then on only new sends count towards
//         that shop's rates, so it doesn't pause again on the old ones.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { channelLabel, describePause, LIMITS, WINDOW_DAYS, type Channel } from "@/lib/stop-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string; business_id: string | null; channel: Channel; reason: string; detail: Record<string, number> | null;
  paused_at: string; paused_by: string; cleared_at: string | null; cleared_by: string | null;
};

export async function GET() {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();

  const [open, resumed] = await Promise.all([
    db.from("send_pauses").select("*").is("cleared_at", null).order("paused_at", { ascending: false }),
    db.from("send_pauses").select("*").not("cleared_at", "is", null).order("cleared_at", { ascending: false }).limit(20),
  ]);
  if (open.error || resumed.error) return NextResponse.json({ error: "Couldn't load the pauses. Try again." }, { status: 500 });

  const rows = [...(open.data ?? []), ...(resumed.data ?? [])] as Row[];
  const ids = [...new Set(rows.map(r => r.business_id).filter((x): x is string => Boolean(x)))];
  const { data: shops } = ids.length ? await db.from("businesses").select("id, name").in("id", ids) : { data: [] };
  const names = new Map(((shops ?? []) as { id: string; name: string | null }[]).map(s => [s.id, s.name ?? "A shop"]));

  const view = (r: Row) => ({
    id: r.id,
    shop: r.business_id ? names.get(r.business_id) ?? "A shop" : "Every shop",
    channel: r.channel,
    label: channelLabel(r.channel),
    why: r.business_id === null ? "Paused for every shop." : describePause(r.channel, r.reason, r.detail),
    pausedAt: r.paused_at,
    pausedBy: r.paused_by,
    resumedAt: r.cleared_at,
  });

  return NextResponse.json({
    open: ((open.data ?? []) as Row[]).map(view),
    resumed: ((resumed.data ?? []) as Row[]).map(view),
    rules: { windowDays: WINDOW_DAYS, limits: LIMITS },
  });
}

export async function POST(req: Request) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await req.json().catch(() => ({})) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("send_pauses")
    .update({ cleared_at: new Date().toISOString(), cleared_by: user.id })
    .eq("id", id)
    .is("cleared_at", null)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't resume it. Try again." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That pause was already resumed." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
