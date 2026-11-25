// ─── SMS helpers: Spam Act footer, opt-out keywords, send limits ─────────────
//
// Every text is one of the three kinds in lib/message-kinds.ts. smsBody()
// writes it the way its kind needs. A STOP reply opts a customer out of
// marketing only. It never stops a must_reach text about their order.
//
// Australian Spam Act 2003 rules for marketing texts:
//   • identify who sent it (the restaurant's name)
//   • include a working way to unsubscribe
//   • honour an unsubscribe within 5 business days (we do it instantly)
//
// Limits protect ZentraBite's Twilio bill from one account sending thousands
// of texts. Defaults can be raised per business with
// businesses.settings.sms_monthly_cap and businesses.settings.sms_per_minute.

import "server-only";
import crypto from "node:crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const DEFAULT_SMS_MONTHLY_CAP = 1000; // hard safety cap, not the 300 bundle
export const DEFAULT_SMS_PER_MINUTE  = 30;

const STOP_WORDS  = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "OPT OUT"];
const START_WORDS = ["START", "UNSTOP", "YES", "SUBSCRIBE"];

export function isStopKeyword(body: string): boolean {
  const word = body.trim().toUpperCase().replace(/[^A-Z ]/g, "");
  return STOP_WORDS.includes(word);
}

export function isStartKeyword(body: string): boolean {
  const word = body.trim().toUpperCase().replace(/[^A-Z ]/g, "");
  return START_WORDS.includes(word);
}

// How a text is written (name, Reply STOP, plain characters) lives in
// lib/sms-text.ts so the pages can show the same thing. Re-exported here.
export { plainSms, smsBody, withSender, withSenderAndOptOut } from "@/lib/sms-text";

/** Normalises an Australian mobile to E.164 (+614...). Leaves other formats alone. */
export function normaliseAuPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("0")) return `+61${digits.slice(1)}`;
  return digits;
}

/** True for an Australian mobile in +614 form, the only numbers we text. */
export function isAuMobile(e164: string): boolean {
  return /^\+614\d{8}$/.test(e164);
}

/**
 * Texts a day across every shop, a brake if something goes wrong (a loop, a
 * shop sending more than any pilot should). The texts of the last 24 hours
 * in sms_logs count. ZB_DAILY_TEXT_CAP changes it, 0 turns it off.
 */
export const DEFAULT_DAILY_TEXT_CAP = 2000;

export async function overDailyTextCap(db: Db, now = new Date()): Promise<boolean> {
  const raw = process.env.ZB_DAILY_TEXT_CAP;
  const cap = raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : DEFAULT_DAILY_TEXT_CAP;
  if (cap <= 0) return false;
  const { count, error } = await db.from("sms_logs").select("id", { count: "exact", head: true })
    .eq("status", "sent").gte("sent_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  if (error) return false;
  return (count ?? 0) >= cap;
}

/**
 * The different ways one Australian number may have been saved:
 * +61412345678, 0412345678, 61412345678, 0412 345 678, 0412-345-678.
 * Used to match STOP replies and opt-outs against stored phones.
 */
export function phoneVariants(raw: string): string[] {
  const e164 = normaliseAuPhone(raw);
  const local = e164.startsWith("+61") ? `0${e164.slice(3)}` : e164;
  const spaced = /^0\d{9}$/.test(local) ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
  const dashed = spaced.replace(/ /g, "-");
  return [...new Set([raw.trim(), e164, local, e164.replace(/^\+/, ""), spaced, dashed])];
}

/**
 * Checked right before each marketing text, so a STOP that came in a minute
 * ago counts even mid-run. The customer must have agreed and not opted out,
 * and nobody with the same number at this shop may have opted out.
 */
export async function canTextMarketing(db: Db, businessId: string, customerId: string, phone: string): Promise<boolean> {
  const { data: row, error } = await db
    .from("customers")
    .select("id, opted_out, marketing_opt_in")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !row || row.opted_out || !row.marketing_opt_in) return false;
  const { data: others, error: othersErr } = await db
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .in("phone", phoneVariants(phone))
    .eq("opted_out", true)
    .limit(1);
  if (othersErr) return false;
  return (others ?? []).length === 0;
}

export type AllowanceResult = { ok: true } | { ok: false; reason: string; status: 429 };

/**
 * Checks the per-minute rate limit and the monthly cap for a business,
 * counting rows already in sms_logs. Call before every send.
 */
export async function checkSmsAllowance(
  db: Db,
  businessId: string,
  settings?: Record<string, unknown> | null,
  options: { skipRate?: boolean } = {},
): Promise<AllowanceResult> {
  const monthlyCap = Number(settings?.sms_monthly_cap ?? DEFAULT_SMS_MONTHLY_CAP);
  const perMinute  = Number(settings?.sms_per_minute  ?? DEFAULT_SMS_PER_MINUTE);

  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [minuteRes, monthRes] = await Promise.all([
    db.from("sms_logs").select("id", { count: "exact", head: true })
      .eq("business_id", businessId).eq("channel", "sms").gte("sent_at", minuteAgo),
    db.from("sms_logs").select("id", { count: "exact", head: true })
      .eq("business_id", businessId).eq("channel", "sms").eq("status", "sent").gte("sent_at", monthStart),
  ]);

  // The nightly batch sends many texts inside a minute on purpose, so it
  // skips the per-minute limit and only respects the monthly cap.
  if (!options.skipRate && (minuteRes.count ?? 0) >= perMinute) {
    return { ok: false, status: 429, reason: "Too many texts in the last minute. Try again shortly." };
  }
  if ((monthRes.count ?? 0) >= monthlyCap) {
    return { ok: false, status: 429, reason: "Monthly text limit reached for this business. Contact ZentraBite to raise it." };
  }
  return { ok: true };
}

/**
 * Where Twilio reports what happened to each text (/api/sms/status, for the
 * stop rules). Sent with every text, and Twilio signs its reports with it.
 */
export function statusCallbackUrl(): string {
  return `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/+$/, "")}/api/sms/status`;
}

/** Twilio's signature: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const data = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Sends one SMS through Twilio. Never throws. */
export async function sendTwilioSms(to: string, body: string): Promise<{ status: "sent" | "failed" | "skipped"; sid: string | null; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_MESSAGING_SERVICE_SID ? undefined : process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    return { status: "skipped", sid: null, error: "Twilio not configured" };
  }

  // Australian mobiles only. Every shop is Australian, and a text to another
  // country costs many times more, so a typed overseas number never goes.
  const toNumber = normaliseAuPhone(to);
  if (!isAuMobile(toNumber)) return { status: "skipped", sid: null, error: "Only Australian mobile numbers can be texted" };

  // A kill switch can stop every text for every shop (lib/send-guard.ts), and
  // there's a cap on texts a day across every shop. If a check itself fails
  // the text goes, because order texts must reach.
  try {
    const [{ createAdminClient }, { everyTextStopped }] = await Promise.all([import("@/lib/supabase-server"), import("@/lib/send-guard")]);
    const db = createAdminClient();
    if (await everyTextStopped(db)) return { status: "skipped", sid: null, error: "Every text is stopped by a kill switch" };
    if (await overDailyTextCap(db)) return { status: "skipped", sid: null, error: "ZentraBite's daily text limit is reached. Texts start again tomorrow." };
  } catch { /* send */ }

  const params: Record<string, string> = { To: toNumber, Body: body, StatusCallback: statusCallbackUrl() };
  if (messagingServiceSid) params.MessagingServiceSid = messagingServiceSid;
  else if (from) params.From = from;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", sid: null, error: data?.message ?? "Twilio error" };
    return { status: "sent", sid: data.sid ?? null };
  } catch (err) {
    return { status: "failed", sid: null, error: err instanceof Error ? err.message : "Twilio error" };
  }
}
