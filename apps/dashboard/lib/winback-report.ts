// ─── What win-back earned, measured against a held-back group ──────────────
// About 1 in 10 customers due a win-back message is held back at random and
// sent nothing (heldBack). The send log (sms_logs) records them with status
// "held_back", so the cooldown treats them like a send and they aren't
// picked again the next day. Comparing how many came back in each group
// shows what the messages actually added, rather than counting people who
// would have ordered anyway.
//
// The monthly report (buildWinbackReport) is shown at /zentra-rewards/report
// and emailed to the owner on the 15th for the month before, once every
// message's 14 days are over.
//
// "Came back" means any order, online or at the counter, within 14 days of
// the message (or of being held back). Each customer counts once a month,
// in the group of their first win-back that month.

import { createHash } from "node:crypto";
import { netTotal } from "@/lib/refunds";
import { cameFromLabel } from "@/lib/offer-codes";
import { readOrderingRules, shopMidnight } from "@/lib/pickup-times";

export const HOLDOUT_EVERY = 10;
export const RETURN_DAYS = 14;
/** Fewer held back than this and the comparison is mostly chance. */
export const MIN_HELD = 30;

const DAY_MS = 86_400_000;

/**
 * True for about 1 in 10. Decided from the rule (or campaign), the customer
 * and the day, so a run that's repeated gives the same answer.
 */
export function heldBack(sendKey: string, customerId: string, day: string): boolean {
  const h = createHash("sha256").update(`${sendKey}:${customerId}:${day}`).digest();
  return h.readUInt32BE(0) % HOLDOUT_EVERY === 0;
}

/** "2026-11" for a month, or null if it isn't one. */
export function readMonth(v: unknown): { y: number; m: number } | null {
  const match = typeof v === "string" ? /^(\d{4})-(\d{2})$/.exec(v) : null;
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]);
  return y >= 2024 && y <= 2100 && m >= 1 && m <= 12 ? { y, m } : null;
}

export const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

/** The month before, for "2026-01" that's 2025-12. */
export function previousMonth(y: number, m: number): { y: number; m: number } {
  return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthLabel = (y: number, m: number) => `${MONTHS[m - 1]} ${y}`;

export type SourceRow = { cameFrom: string; label: string; orders: number; revenue: number };

export type WinbackReport = {
  month: string;
  label: string;
  /** Customers sent a win-back message this month, and how many of them ordered within 14 days. */
  sent: number; sentBack: number; sentRevenue: number;
  /** Customers held back this month, and how many of them ordered within 14 days anyway. */
  held: number; heldBackCount: number;
  /** Customers whose 14 days aren't over yet. They can still come back. */
  stillCounting: number;
  /** Customers the messages brought back beyond the held-back rate. Null when too few were held back to say. */
  extraBack: number | null;
  /** Win-back codes used on orders placed this month, and what those orders came to. */
  codesUsed: number; codeRevenue: number;
  /** Online orders placed this month, by where they came from. */
  sources: SourceRow[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

type LogRow = { customer_id: string | null; rule_id: string | null; campaign_id: string | null; status: string | null; sent_at: string };
type OrderRow = { customer_id: string | null; total: number | string; refunded_amount: number | string | null; created_at: string; came_from: string | null; offer_code: string | null; source: string | null };

/** Every row, a thousand at a time (Supabase sends at most 1,000 per read). */
async function readAll<T>(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The report for one month, in the shop's time zone. */
export async function buildWinbackReport(db: Db, businessId: string, y: number, m: number, timezone: string, now: Date = new Date()): Promise<WinbackReport> {
  const start = shopMidnight(y, m, 1, timezone);
  const end = shopMidnight(y, m + 1, 1, timezone);
  const ordersUntil = new Date(end.getTime() + RETURN_DAYS * DAY_MS);

  const [logs, orders] = await Promise.all([
    readAll<LogRow>((a, b) => db.from("sms_logs").select("customer_id, rule_id, campaign_id, status, sent_at")
      .eq("business_id", businessId).gte("sent_at", start.toISOString()).lt("sent_at", end.toISOString())
      .order("sent_at").range(a, b)),
    readAll<OrderRow>((a, b) => db.from("orders").select("customer_id, total, refunded_amount, created_at, came_from, offer_code, source")
      .eq("business_id", businessId).gte("created_at", start.toISOString()).lt("created_at", ordersUntil.toISOString())
      .order("created_at").range(a, b)),
  ]);

  // Each customer's first win-back this month, sent or held back.
  const first = new Map<string, { at: number; held: boolean }>();
  for (const l of logs) {
    if (!l.customer_id || !(l.rule_id || l.campaign_id)) continue;
    if (l.status !== "sent" && l.status !== "held_back") continue;
    const at = Date.parse(l.sent_at);
    const prev = first.get(l.customer_id);
    if (!prev || at < prev.at) first.set(l.customer_id, { at, held: l.status === "held_back" });
  }

  const byCustomer = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const list = byCustomer.get(o.customer_id) ?? [];
    list.push(o);
    byCustomer.set(o.customer_id, list);
  }

  let sent = 0, sentBack = 0, sentRevenue = 0, held = 0, heldBackCount = 0, stillCounting = 0;
  for (const [customerId, ev] of first) {
    const until = ev.at + RETURN_DAYS * DAY_MS;
    const within = (byCustomer.get(customerId) ?? []).filter(o => {
      const t = Date.parse(o.created_at);
      return t > ev.at && t <= until && netTotal(o) > 0;
    });
    const back = within.length > 0;
    if (!back && until > now.getTime()) stillCounting++;
    if (ev.held) {
      held++;
      if (back) heldBackCount++;
    } else {
      sent++;
      if (back) {
        sentBack++;
        sentRevenue += within.reduce((s, o) => s + netTotal(o), 0);
      }
    }
  }

  let extraBack: number | null = null;
  if (held >= MIN_HELD && sent > 0) {
    extraBack = Math.round((sentBack / sent - heldBackCount / held) * sent);
  }

  // This month's orders only, for codes and sources.
  const inMonth = orders.filter(o => {
    const t = Date.parse(o.created_at);
    return t >= start.getTime() && t < end.getTime();
  });
  const coded = inMonth.filter(o => o.offer_code);
  const sources = new Map<string, SourceRow>();
  for (const o of inMonth) {
    if (!o.came_from) continue;
    const row = sources.get(o.came_from) ?? { cameFrom: o.came_from, label: cameFromLabel(o.came_from) ?? o.came_from, orders: 0, revenue: 0 };
    row.orders++;
    row.revenue = round2(row.revenue + netTotal(o));
    sources.set(o.came_from, row);
  }

  return {
    month: monthKey(y, m), label: monthLabel(y, m),
    sent, sentBack, sentRevenue: round2(sentRevenue),
    held, heldBackCount, stillCounting, extraBack,
    codesUsed: coded.length, codeRevenue: round2(coded.reduce((s, o) => s + netTotal(o), 0)),
    sources: [...sources.values()].sort((a, b) => b.orders - a.orders),
  };
}

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "0%");
const dollars = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** What the comparison says, in plain words. */
export function verdict(r: WinbackReport): string {
  if (r.sent === 0 && r.held === 0) return "No win-back messages were due this month.";
  if (r.held < MIN_HELD) {
    return `Only ${r.held} ${r.held === 1 ? "customer was" : "customers were"} held back, too few to compare yet. The comparison means something from about ${MIN_HELD}.`;
  }
  if (r.extraBack === null || r.extraBack <= 0) {
    return `${pct(r.sentBack, r.sent)} of customers messaged came back, and ${pct(r.heldBackCount, r.held)} of those held back came back anyway. No clear difference this month.`;
  }
  return `${pct(r.sentBack, r.sent)} of customers messaged came back, against ${pct(r.heldBackCount, r.held)} of those held back. That's about ${r.extraBack} more ${r.extraBack === 1 ? "customer" : "customers"} than would have come back anyway.`;
}

/** The owner's monthly email, as plain text. */
export function reportEmailText(r: WinbackReport, businessName: string, link: string): string {
  return [
    `Your ${r.label} win-back report for ${businessName}.`,
    ``,
    `Messages sent: ${r.sent}. Came back within ${RETURN_DAYS} days: ${r.sentBack} (${pct(r.sentBack, r.sent)}), spending ${dollars(r.sentRevenue)}.`,
    `Held back, no message: ${r.held}. Came back anyway: ${r.heldBackCount} (${pct(r.heldBackCount, r.held)}).`,
    verdict(r),
    r.codesUsed ? `Offer codes used: ${r.codesUsed}, on orders worth ${dollars(r.codeRevenue)}.` : `No offer codes were used this month.`,
    ``,
    r.sources.length ? `Where your online orders came from:` : "",
    ...r.sources.map(s => `  ${s.label}: ${s.orders} ${s.orders === 1 ? "order" : "orders"}, ${dollars(s.revenue)}`),
    r.sources.length ? `` : "",
    `About 1 in 10 customers due a message is held back at random and gets nothing, so we can see what the messages add.`,
    ``,
    `The full report: ${link}`,
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
}

export const REPORT_DAY = 15;

/**
 * On the 15th (the daily run), emails each shop's owner last month's report.
 * By then every message's 14 days are over. Runs once a day at most
 * (edge_function_runs, migration 017), and skips a shop that had no
 * win-back that month. Goes to the shop's order alert email, or the owner's
 * login email. Nothing sends until Resend's domain is verified.
 */
export async function sendMonthlyReports(db: Db, send: (m: { to: string; subject: string; text: string }) => Promise<unknown>, now: Date = new Date()): Promise<number> {
  if (now.getUTCDate() !== REPORT_DAY) return 0;
  const { error: claimErr } = await db.from("edge_function_runs").insert({ function_name: "winback-monthly-report", run_date: now.toISOString().slice(0, 10) });
  if (claimErr) return 0; // already sent today (23505), or the table is missing

  const [rulesRes, campsRes] = await Promise.all([
    db.from("winback_rules").select("business_id"),
    db.from("campaigns").select("business_id"),
  ]);
  const ids = [...new Set([...(rulesRes.data ?? []), ...(campsRes.data ?? [])].map((r: { business_id: string }) => r.business_id))];
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com";

  let emailed = 0;
  for (const id of ids) {
    try {
      const { data: biz } = await db.from("businesses").select("id, name, settings").eq("id", id).maybeSingle();
      if (!biz) continue;
      const settings = (biz.settings ?? {}) as Record<string, unknown>;
      const tz = readOrderingRules(settings).timezone;
      const last = previousMonth(now.getUTCFullYear(), now.getUTCMonth() + 1);
      const report = await buildWinbackReport(db, id, last.y, last.m, tz, now);
      if (report.sent + report.held === 0) continue;

      let to: string[] = typeof settings.notify_email === "string" && settings.notify_email.includes("@") ? [settings.notify_email] : [];
      if (!to.length) {
        const { data: owners } = await db.from("users").select("email").eq("business_id", id);
        to = ((owners ?? []) as { email: string | null }[]).map(o => o.email).filter((e): e is string => Boolean(e));
      }
      const link = `${base}/zentra-rewards/report?month=${report.month}`;
      for (const address of to) {
        await send({ to: address, subject: `Your ${report.label} win-back report`, text: reportEmailText(report, biz.name ?? "your shop", link) });
        emailed++;
      }
    } catch (err) {
      console.error(`[winback-report] ${id}`, err instanceof Error ? err.message : err);
    }
  }
  return emailed;
}
