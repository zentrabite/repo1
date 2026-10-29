// ─── SMS helpers: Spam Act footer, opt-out keywords, send limits ─────────────
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

/**
 * Makes a marketing text Spam Act friendly. Adds the business name at the
 * start if the template doesn't already mention it, and a STOP line at the end.
 */
export function withSenderAndOptOut(message: string, businessName: string | null | undefined): string {
  let text = message.trim();
  const name = (businessName ?? "").trim();
  if (name && !text.toLowerCase().includes(name.toLowerCase())) {
    text = `${name}: ${text}`;
  }
  if (!/reply\s+stop/i.test(text)) {
    text = `${text} Reply STOP to opt out`;
  }
  return text;
}

/** Normalises an Australian mobile to E.164 (+614...). Leaves other formats alone. */
export function normaliseAuPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("0")) return `+61${digits.slice(1)}`;
  return digits;
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

/** Sends one SMS through Twilio. Never throws. */
export async function sendTwilioSms(to: string, body: string): Promise<{ status: "sent" | "failed" | "skipped"; sid: string | null; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_MESSAGING_SERVICE_SID ? undefined : process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    return { status: "skipped", sid: null, error: "Twilio not configured" };
  }

  const params: Record<string, string> = { To: normaliseAuPhone(to), Body: body };
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
