// ─── Stop rules ──────────────────────────────────────────────────────────────
// Every shop sends through one ZentraBite Twilio account and one Resend
// account, so one shop's bad send can get texts or email blocked for all of
// them. A shop's marketing on a channel pauses on its own when, over its
// marketing sends in the last 30 days, too many
//   • didn't arrive (texts undelivered, emails bounced)   more than 2%
//   • were marked as spam (emails)                        more than 0.1%
//   • got a STOP reply (texts)                            more than 1%
// Each also needs a few cases (MIN), so one STOP in a shop's first 20 texts
// doesn't pause it.
//
// A pause stops marketing only. Order receipts, order texts, login links and
// other must_reach and account messages still go (lib/message-kinds.ts). A
// super admin looks at it and resumes it at /admin/sending, and after that
// only sends from then on count.
//
// No server-only import, so the pages can explain a pause the same way.
// The database side is lib/send-guard.ts.

export type Channel = "sms" | "email";
export type StopReason = "bounces" | "complaints" | "opt_outs";

/** What happened to a sent message, from Twilio or Resend. In order of weight. */
export type Outcome = "delivered" | "undelivered" | "bounced" | "complained" | "opted_out";

export const OUTCOME_WEIGHT: Record<Outcome, number> = { delivered: 1, undelivered: 2, bounced: 2, complained: 3, opted_out: 3 };

export const WINDOW_DAYS = 30;

export const LIMITS: Record<StopReason, { rate: number; min: number; channels: Channel[] }> = {
  complaints: { rate: 0.001, min: 2, channels: ["email"] },
  bounces:    { rate: 0.02,  min: 3, channels: ["sms", "email"] },
  opt_outs:   { rate: 0.01,  min: 3, channels: ["sms"] },
};

export type SendCounts = { sent: number; bounces: number; complaints: number; optOuts: number };

export type Tripped = { reason: StopReason; count: number; sent: number; rate: number };

/** Counts a channel's marketing sends and what happened to them. */
export function countOutcomes(rows: { status?: string | null; outcome?: string | null }[]): SendCounts {
  const c: SendCounts = { sent: 0, bounces: 0, complaints: 0, optOuts: 0 };
  for (const r of rows) {
    if (r.status !== "sent") continue;
    c.sent++;
    if (r.outcome === "undelivered" || r.outcome === "bounced") c.bounces++;
    else if (r.outcome === "complained") c.complaints++;
    else if (r.outcome === "opted_out") c.optOuts++;
  }
  return c;
}

/** The first rule a channel breaks, or null. Spam complaints are checked first. */
export function tripped(channel: Channel, c: SendCounts): Tripped | null {
  if (c.sent === 0) return null;
  const counts: Record<StopReason, number> = { complaints: c.complaints, bounces: c.bounces, opt_outs: c.optOuts };
  for (const reason of ["complaints", "bounces", "opt_outs"] as StopReason[]) {
    const limit = LIMITS[reason];
    if (!limit.channels.includes(channel)) continue;
    const count = counts[reason];
    const rate = count / c.sent;
    if (count >= limit.min && rate > limit.rate) return { reason, count, sent: c.sent, rate };
  }
  return null;
}

function pct(rate: number): string {
  const p = rate * 100;
  return `${p < 1 ? p.toFixed(1) : Math.round(p)}%`;
}

function limitPct(reason: StopReason): string {
  return `${LIMITS[reason].rate * 100}%`;
}

/** One plain sentence on why a channel paused, for owners and staff. */
export function describePause(channel: Channel, reason: string, detail: { count?: number; sent?: number; rate?: number } | null | undefined): string {
  const count = detail?.count ?? 0;
  const sent = detail?.sent ?? 0;
  const rate = detail?.rate ?? (sent ? count / sent : 0);
  const of = `${count} of ${sent}`;
  if (reason === "complaints") return `${of} marketing emails in the last ${WINDOW_DAYS} days were marked as spam (${pct(rate)}). The limit is ${limitPct("complaints")}.`;
  if (reason === "bounces" && channel === "email") return `${of} marketing emails in the last ${WINDOW_DAYS} days bounced (${pct(rate)}). The limit is ${limitPct("bounces")}.`;
  if (reason === "bounces") return `${of} marketing texts in the last ${WINDOW_DAYS} days didn't arrive (${pct(rate)}). The limit is ${limitPct("bounces")}.`;
  if (reason === "opt_outs") return `${of} people sent a marketing text in the last ${WINDOW_DAYS} days replied STOP (${pct(rate)}). The limit is ${limitPct("opt_outs")}.`;
  return "Paused by the ZentraBite team.";
}

/** "Marketing texts" or "Marketing emails". */
export function channelLabel(channel: Channel): string {
  return channel === "sms" ? "Marketing texts" : "Marketing emails";
}
