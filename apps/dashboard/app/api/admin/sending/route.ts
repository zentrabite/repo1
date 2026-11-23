// ─── /api/admin/sending ───────────────────────────────────────────────────────
// Super admins only. Super Admin, Sending.
//   GET   the connection lights (lib/health.ts), the kill switches, every
//         open pause with its shop and why, the last 20 resumed, and who
//         gets told (ALERT_EMAIL, lib/alerts.ts)
//   POST  { action: "resume", id } resumes a pause or turns a kill switch
//         off. After a shop's pause is resumed only new sends count towards
//         its rates, so it doesn't pause again on the old ones.
//         { action: "stop", channel, scope } turns a kill switch on for every
//         shop: marketing texts, every text (scope "all"), or marketing emails.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { channelLabel, describePause, LIMITS, WINDOW_DAYS, type Channel } from "@/lib/stop-rules";
import { setKillSwitch } from "@/lib/send-guard";
import { checkConnections } from "@/lib/health";
import { alertAddress, alertTeam } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string; business_id: string | null; channel: Channel; reason: string; detail: Record<string, number> | null;
  paused_at: string; paused_by: string; cleared_at: string | null; cleared_by: string | null; scope?: string | null;
};

/** "Marketing texts", "Every text" or "Marketing emails". */
function switchName(channel: Channel, scope: "marketing" | "all"): string {
  return channel === "email" ? "Marketing emails" : scope === "all" ? "Every text" : "Marketing texts";
}

/** What a kill switch stops, in words. */
function everyShop(r: Row): string {
  if (r.channel === "email") return "Marketing emails stopped for every shop.";
  return r.scope === "all" ? "Every text stopped for every shop, order texts and order alerts too." : "Marketing texts stopped for every shop.";
}

export async function GET() {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();

  const [open, resumed, lights] = await Promise.all([
    db.from("send_pauses").select("*").is("cleared_at", null).order("paused_at", { ascending: false }),
    db.from("send_pauses").select("*").not("cleared_at", "is", null).order("cleared_at", { ascending: false }).limit(20),
    checkConnections(db),
  ]);
  if (open.error || resumed.error) return NextResponse.json({ error: "Couldn't load the pauses. Try again." }, { status: 500 });

  const rows = [...(open.data ?? []), ...(resumed.data ?? [])] as Row[];
  const ids = [...new Set(rows.map(r => r.business_id).filter((x): x is string => Boolean(x)))];
  const { data: shops } = ids.length ? await db.from("businesses").select("id, name").in("id", ids) : { data: [] };
  const names = new Map(((shops ?? []) as { id: string; name: string | null }[]).map(s => [s.id, s.name ?? "A shop"]));

  const view = (r: Row) => ({
    id: r.id,
    shop: r.business_id ? names.get(r.business_id) ?? "A shop" : "Every shop",
    everyShop: r.business_id === null,
    channel: r.channel,
    scope: r.scope ?? "marketing",
    label: r.business_id === null && r.scope === "all" ? "Every text" : channelLabel(r.channel),
    why: r.business_id === null ? everyShop(r) : describePause(r.channel, r.reason, r.detail),
    pausedAt: r.paused_at,
    pausedBy: r.paused_by,
    resumedAt: r.cleared_at,
  });

  const openRows = (open.data ?? []) as Row[];
  const sw = (channel: Channel, scope: "marketing" | "all") => openRows.find(r => r.business_id === null && r.channel === channel && (scope === "all" ? r.scope === "all" : true))?.id ?? null;

  return NextResponse.json({
    lights,
    switches: {
      marketingTexts: sw("sms", "marketing"),
      everyText: sw("sms", "all"),
      marketingEmails: sw("email", "marketing"),
    },
    open: openRows.map(view),
    resumed: ((resumed.data ?? []) as Row[]).map(view),
    alertsTo: alertAddress(),
    rules: { windowDays: WINDOW_DAYS, limits: LIMITS },
  });
}

export async function POST(req: Request) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { action?: string; id?: string; channel?: string; scope?: string };
  const db = createAdminClient();
  const by = user.email ?? "a super admin";

  if (body.action === "stop") {
    const channel = body.channel === "email" ? "email" : body.channel === "sms" ? "sms" : null;
    const scope = body.scope === "all" ? "all" : "marketing";
    if (!channel) return NextResponse.json({ error: "channel must be sms or email" }, { status: 400 });
    const out = await setKillSwitch(db, channel, scope, by);
    return out.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: out.error }, { status: 400 });
  }

  // Resume a pause, or turn a kill switch off. (No action means resume, as before.)
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { data, error } = await db
    .from("send_pauses")
    .update({ cleared_at: new Date().toISOString(), cleared_by: user.id })
    .eq("id", body.id)
    .is("cleared_at", null)
    .select("id, business_id, channel, scope")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't resume it. Try again." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That pause was already resumed." }, { status: 409 });
  const row = data as Row;
  if (row.business_id === null) {
    const what = switchName(row.channel, row.scope === "all" ? "all" : "marketing");
    await alertTeam(`Kill switch off: ${what} can go again`, [`${what} can go again for every shop. Turned off by ${by}.`]);
  }
  return NextResponse.json({ ok: true });
}
