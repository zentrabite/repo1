// ─── Send guard: pauses and what happened to each send ───────────────────────
// The database side of the stop rules (lib/stop-rules.ts).
//
//   • recordOutcome() saves what Twilio or Resend said happened to a send
//     (delivered, didn't arrive, bounced, marked as spam) on its sms_logs row,
//     found by the provider's id. A STOP reply is put on the shop's last
//     marketing text to that number (recordStop).
//   • checkStopRules() counts a shop's marketing sends on a channel since the
//     later of 30 days ago and its last resume, and pauses that channel when
//     a rule is broken. It runs at the start of each win-back run and after
//     every bad outcome, so a bad send pauses itself while it's still going.
//   • activePause() is checked before every marketing send. A pause with no
//     shop (business_id null) stops every shop. That's a kill switch, set by
//     a super admin (setKillSwitch). Only a kill switch with scope "all" on
//     texts stops must_reach texts too (everyTextStopped, checked inside
//     sendTwilioSms). Nothing here stops a must_reach or account email.
//   • A new pause and every kill switch change tell the team (lib/alerts.ts).
//
// send_pauses is server only (migration 028). Super admins resume a pause at
// /admin/sending, owners see it on the Win-Back page.

import "server-only";
import { countOutcomes, OUTCOME_WEIGHT, tripped, WINDOW_DAYS, type Channel, type Outcome } from "@/lib/stop-rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type Pause = {
  id: string;
  business_id: string | null;
  channel: Channel;
  reason: string;
  detail: { count?: number; sent?: number; rate?: number } | null;
  paused_at: string;
  paused_by: string;
  /** "marketing", or "all" for a kill switch that stops every text (029). */
  scope?: "marketing" | "all";
};

const PAUSE_COLUMNS = "id, business_id, channel, reason, detail, paused_at, paused_by, scope";

/** The pause stopping this shop's marketing on a channel right now, or null. */
export async function activePause(db: Db, businessId: string, channel: Channel): Promise<Pause | null> {
  const { data, error } = await db
    .from("send_pauses")
    .select(PAUSE_COLUMNS)
    .eq("channel", channel)
    .is("cleared_at", null);
  // If the check itself fails, don't send. A missed offer beats a blocked number.
  if (error) return { id: "unknown", business_id: businessId, channel, reason: "check_failed", detail: null, paused_at: new Date().toISOString(), paused_by: "a stop rule" };
  const rows = (data ?? []) as Pause[];
  return rows.find(p => p.business_id === null) ?? rows.find(p => p.business_id === businessId) ?? null;
}

/** Every pause on a shop (or every shop) right now, for the pages. */
export async function activePauses(db: Db, businessId?: string): Promise<Pause[]> {
  const { data } = await db.from("send_pauses").select(PAUSE_COLUMNS).is("cleared_at", null);
  const rows = (data ?? []) as Pause[];
  return businessId ? rows.filter(p => p.business_id === null || p.business_id === businessId) : rows;
}

/** When this shop's channel was last resumed, if it was. Sends before that don't count. */
async function lastResumed(db: Db, businessId: string, channel: Channel): Promise<number> {
  const { data } = await db
    .from("send_pauses")
    .select("cleared_at")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .order("cleared_at", { ascending: false })
    .limit(20);
  return Math.max(0, ...((data ?? []) as { cleared_at: string | null }[]).map(r => (r.cleared_at ? Date.parse(r.cleared_at) : 0)));
}

/**
 * Counts this shop's marketing sends on a channel and pauses it if a stop
 * rule is broken. Returns the pause now in place, if any.
 */
export async function checkStopRules(db: Db, businessId: string, channel: Channel, now: Date = new Date()): Promise<Pause | null> {
  const existing = await activePause(db, businessId, channel);
  if (existing) return existing;

  const since = new Date(Math.max(now.getTime() - WINDOW_DAYS * 86_400_000, await lastResumed(db, businessId, channel))).toISOString();
  const rows: { status: string | null; outcome: string | null; kind?: string | null; channel?: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("sms_logs")
      .select("status, outcome, kind, channel")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .eq("kind", "marketing")
      .eq("status", "sent")
      .gte("sent_at", since)
      .range(from, from + 999);
    if (error) return null;
    const page = (data ?? []) as typeof rows;
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const mine = rows.filter(r => (r.kind ?? "marketing") === "marketing" && (r.channel ?? channel) === channel);
  const broke = tripped(channel, countOutcomes(mine));
  if (!broke) return null;

  const pause = {
    business_id: businessId,
    channel,
    reason: broke.reason,
    detail: { count: broke.count, sent: broke.sent, rate: Math.round(broke.rate * 10_000) / 10_000, since },
    paused_by: "a stop rule",
  };
  const { data: saved, error } = await db.from("send_pauses").insert(pause).select(PAUSE_COLUMNS).maybeSingle();
  console.warn(`[stop rules] paused ${channel} marketing for ${businessId}: ${broke.reason} ${broke.count}/${broke.sent}`);
  // Another request may have paused it a moment ago (one open pause per shop and channel).
  if (error || !saved) return (await activePause(db, businessId, channel)) ?? { id: "new", ...pause, paused_at: now.toISOString() } as Pause;
  await tellTeamAboutPause(db, saved as Pause);
  return saved as Pause;
}

async function tellTeamAboutPause(db: Db, p: Pause): Promise<void> {
  try {
    const [{ alertTeam }, { channelLabel, describePause }] = await Promise.all([import("@/lib/alerts"), import("@/lib/stop-rules")]);
    const { data: shop } = await db.from("businesses").select("name").eq("id", p.business_id).maybeSingle();
    const name = (shop as { name?: string } | null)?.name ?? "A shop";
    await alertTeam(`${channelLabel(p.channel)} paused for ${name}`, [
      `${channelLabel(p.channel)} are paused for ${name} by a stop rule.`,
      describePause(p.channel, p.reason, p.detail),
      "Order messages still go. Look at it and resume it in Super Admin, Sending.",
    ]);
  } catch { /* telling the team never stops the pause */ }
}

/** True while a kill switch stops every text for every shop, order texts too. */
export async function everyTextStopped(db: Db): Promise<boolean> {
  const { data, error } = await db
    .from("send_pauses")
    .select("id, business_id, scope")
    .eq("channel", "sms")
    .eq("scope", "all")
    .is("cleared_at", null);
  if (error) return false; // order texts must reach, so a failed check lets them go
  return ((data ?? []) as { business_id: string | null; scope?: string }[]).some(p => p.business_id === null && p.scope === "all");
}

/**
 * Turns a kill switch on for every shop. scope "marketing" stops every shop's
 * marketing on the channel. "all" (texts only) stops every text. If one is
 * already on for the channel, its scope is changed.
 */
export async function setKillSwitch(db: Db, channel: Channel, scope: "marketing" | "all", by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (scope === "all" && channel !== "sms") return { ok: false, error: "Only texts can be stopped completely. Emails stop marketing only." };
  const open = (await activePauses(db)).find(p => p.business_id === null && p.channel === channel);
  const result = open
    ? await db.from("send_pauses").update({ scope, paused_by: by }).eq("id", open.id)
    : await db.from("send_pauses").insert({ business_id: null, channel, scope, reason: "manual", detail: {}, paused_by: by });
  if (result.error) return { ok: false, error: "Couldn't turn it on. Try again." };
  try {
    const { alertTeam } = await import("@/lib/alerts");
    const what = channel === "email" ? "Marketing emails" : scope === "all" ? "Every text" : "Marketing texts";
    await alertTeam(`Kill switch on: ${what} stopped for every shop`, [
      `${what} stopped for every shop by ${by}.${scope === "all" ? " That includes order texts and the owners' order alerts." : " Order messages still go."}`,
      "Turn it off in Super Admin, Sending.",
    ]);
  } catch { /* the switch is on either way */ }
  return { ok: true };
}

type LogRow = { id: string; business_id: string; channel: string; kind: string | null; customer_id: string | null; outcome: string | null };

/**
 * Saves what happened to a send, found by Twilio's or Resend's id. Keeps the
 * weightier outcome when news arrives out of order (a STOP or a spam report
 * beats "didn't arrive", which beats "delivered"). Returns the row, or null
 * when the id isn't one of ours (receipts and alerts aren't logged).
 */
export async function recordOutcome(db: Db, providerId: string, outcome: Outcome, at: Date = new Date()): Promise<LogRow | null> {
  if (!providerId) return null;
  const { data: row } = await db
    .from("sms_logs")
    .select("id, business_id, channel, kind, customer_id, outcome")
    .eq("provider_id", providerId)
    .maybeSingle();
  if (!row) return null;
  return saveOutcome(db, row as LogRow, outcome, at);
}

async function saveOutcome(db: Db, row: LogRow, outcome: Outcome, at: Date): Promise<LogRow> {
  const had = row.outcome as Outcome | null;
  if (had && OUTCOME_WEIGHT[had] >= OUTCOME_WEIGHT[outcome]) return row;
  await db.from("sms_logs").update({ outcome, outcome_at: at.toISOString() }).eq("id", row.id);
  return { ...row, outcome };
}

/**
 * A STOP reply. Twilio doesn't say which text it answers, and the number is
 * shared, so it's put on the most recent marketing text to that number in
 * the last 30 days, and that shop's stop rules are checked.
 */
export async function recordStop(db: Db, phones: string[], at: Date = new Date()): Promise<Pause | null> {
  const since = new Date(at.getTime() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await db
    .from("sms_logs")
    .select("id, business_id, channel, kind, customer_id, outcome, sent_at")
    .in("recipient", phones)
    .eq("channel", "sms")
    .eq("kind", "marketing")
    .eq("status", "sent")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(1);
  const row = ((data ?? []) as LogRow[])[0];
  if (!row) return null;
  await saveOutcome(db, row, "opted_out", at);
  return checkStopRules(db, row.business_id, "sms", at);
}
