// ─── Email unsubscribe: signed links and the opt-out itself ─────────────────
//
// Spam Act 2003: every marketing email needs a working unsubscribe, and the
// request has to be honoured within 5 business days (we do it straight away).
//
// Link format
//   /unsubscribe?t=<customer id>.<signature>        page with a confirm button
//   /api/unsubscribe?t=<customer id>.<signature>    one-click POST for mail apps
//                                                    (List-Unsubscribe header)
// The signature is an HMAC-SHA256 of the customer id. Nobody can make a link
// for a customer they didn't get an email for. The link never expires.
//
// Key
//   Derived from SUPABASE_SERVICE_ROLE_KEY with a fixed label, so the raw key
//   is never used directly and this signature can't be reused anywhere else.
//   Why that key: it's server-only, always set wherever an opt-out can be
//   saved (saving needs it), and Supabase edge functions have the same value,
//   so a future edge-function email can sign links that this app accepts.
//   Trade-off: if that key is ever rotated, links in emails sent before the
//   rotation stop working and show "this link doesn't work". Those customers
//   can still reply to the email, or reply STOP to a text. A dedicated
//   secret would avoid that, but would mean a new env var.
//
// Opting out reuses the columns STOP replies use (migrations 001 and 015):
//   opted_out = true, opted_out_at = now, marketing_opt_in = false
// so win-back, automations and campaigns skip the customer on every channel.

import "server-only";
import crypto from "node:crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const PURPOSE = "zentrabite:email-unsubscribe:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(PURPOSE).digest();
}

function sign(customerId: string, key: Buffer): string {
  return crypto.createHmac("sha256", key).update(customerId.toLowerCase()).digest("base64url");
}

/** The token for one customer, or null if the server key isn't set. */
export function unsubscribeToken(customerId: string): string | null {
  const key = signingKey();
  if (!key || !UUID.test(customerId)) return null;
  return `${customerId.toLowerCase()}.${sign(customerId, key)}`;
}

/** The customer id inside a valid token, or null. */
export function readUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token || token.length > 200) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const customerId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const key = signingKey();
  if (!key || !UUID.test(customerId)) return null;

  const a = Buffer.from(given);
  const b = Buffer.from(sign(customerId, key));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return customerId.toLowerCase();
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/+$/, "");
}

export type UnsubscribeLinks = {
  /** For the link in the email body. Opens a page with a confirm button. */
  page: string;
  /** For the List-Unsubscribe header. Mail apps POST to it (RFC 8058). */
  oneClick: string;
};

export function unsubscribeLinks(customerId: string): UnsubscribeLinks | null {
  const token = unsubscribeToken(customerId);
  if (!token) return null;
  const t = encodeURIComponent(token);
  return {
    page:     `${appUrl()}/unsubscribe?t=${t}`,
    oneClick: `${appUrl()}/api/unsubscribe?t=${t}`,
  };
}

/**
 * Ids of every customer row at this business with the same email, ignoring
 * case. ilike may over-match on _ or %, so the exact check is done here.
 */
async function sameEmailIds(db: Db, businessId: string, email: string, extra?: { optedOut?: boolean }): Promise<string[]> {
  let q = db.from("customers").select("id, email").eq("business_id", businessId).ilike("email", email).limit(50);
  if (extra?.optedOut !== undefined) q = q.eq("opted_out", extra.optedOut);
  const { data, error } = await q;
  if (error) throw new Error(`customer lookup failed: ${error.message}`);
  const want = email.trim().toLowerCase();
  return ((data ?? []) as { id: string; email: string | null }[])
    .filter(r => (r.email ?? "").trim().toLowerCase() === want)
    .map(r => r.id);
}

/** The business's name for the confirmation page. */
export async function businessName(db: Db, businessId: string): Promise<string | null> {
  const { data } = await db.from("businesses").select("name").eq("id", businessId).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

export type UnsubscribeResult = { ok: true; businessName: string | null } | { ok: false; reason: "not_found" };

/**
 * Records the opt-out for this customer and for any other row with the same
 * email at the same business. Safe to call more than once: an earlier
 * opted_out_at is kept. Throws if the database write fails, so the caller
 * can tell the person to try again instead of pretending it worked.
 */
export async function recordUnsubscribe(db: Db, customerId: string): Promise<UnsubscribeResult> {
  const { data: customer, error } = await db
    .from("customers")
    .select("id, business_id, email")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw new Error(`customer lookup failed: ${error.message}`);
  if (!customer) return { ok: false, reason: "not_found" };

  const ids = new Set<string>([customer.id as string]);
  if (customer.email) {
    for (const id of await sameEmailIds(db, customer.business_id, customer.email)) ids.add(id);
  }
  const idList = [...ids];

  const first = await db.from("customers")
    .update({ opted_out: true, opted_out_at: new Date().toISOString(), marketing_opt_in: false })
    .in("id", idList)
    .or("opted_out.is.null,opted_out.eq.false");
  if (first.error) throw new Error(`opt-out failed: ${first.error.message}`);

  // Rows already opted out (say by STOP) keep their date but lose consent.
  const second = await db.from("customers")
    .update({ marketing_opt_in: false })
    .in("id", idList)
    .eq("marketing_opt_in", true);
  if (second.error) throw new Error(`opt-out failed: ${second.error.message}`);

  return { ok: true, businessName: await businessName(db, customer.business_id) };
}

/**
 * The last check before any marketing email: the customer belongs to this
 * business, said yes to marketing, hasn't opted out, and no other row with
 * the same email at this business has opted out either.
 */
export async function canSendMarketing(db: Db, businessId: string, customerId: string, email: string): Promise<boolean> {
  const { data: row, error } = await db
    .from("customers")
    .select("id, opted_out, marketing_opt_in")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !row) return false;
  if (row.opted_out || !row.marketing_opt_in) return false;
  try {
    const optedOut = await sameEmailIds(db, businessId, email, { optedOut: true });
    return optedOut.length === 0;
  } catch {
    return false;
  }
}
