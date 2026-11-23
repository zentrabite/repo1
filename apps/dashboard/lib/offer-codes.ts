// ─── Win-back offer codes, and where an order came from ─────────────────────
// A win-back text or email promises money off ("20% off your next order").
// Each one sent gets its own code (offer_codes, migration 025), in the link
// to the shop's ordering page (?code=K7MP4QXA, which also marks the order as
// win-back, so there's no ?src= to make the text longer). Checkout takes
// the money off on the shop's own Stripe account and the payment webhook
// marks the code used, so the promise is real and each code works once.
//
// The rules:
//   • percent and dollar come off the items, never the delivery fee.
//     free_delivery takes off the shop's delivery fee, so it only works on a
//     delivery order. Stripe needs at least 50c paid, so a discount never
//     takes an order below that.
//   • a code ends at the end of the day, 14 days after it was sent, in the
//     shop's time zone. The message says the date.
//   • online orders only. Codes don't work at the counter (POS).
//   • a code and the first order offer never add up. The code wins.
//   • one checkout at a time per code. Starting a second one ends the first
//     Stripe page (checkout does that), so a code can't be paid twice.
//
// "free_item" offers are never sent, because nothing can redeem them.
//
// came_from on an order says where it came from: counter (the counter QR
// code), winback, google (the link for the shop's Google profile), website
// (the shop's own site), social, or direct (none of those).

import { readOrderingRules, shopDate, shopDayEnd } from "@/lib/pickup-times";
import { orderUrl } from "@/lib/tenant";
import { smsBody } from "@/lib/sms-text";

export const CODE_DAYS = 14;
export const CODE_LENGTH = 8;
// No 0, O, 1, I or L, so a code read out over the phone can't be misheard.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type OfferType = "percent" | "dollar" | "free_delivery";
export type Offer = { type: OfferType; value: number };

export const CAME_FROM = ["counter", "winback", "google", "website", "social", "direct"] as const;
export type CameFrom = (typeof CAME_FROM)[number];

/** The rule's offer, or null if it can't be given as a code (free_item, push, nonsense values). */
export function readOffer(type: unknown, value: unknown): Offer | null {
  const v = Math.round(Number(value) * 100) / 100;
  if (type === "free_delivery") return { type, value: 0 };
  if (!Number.isFinite(v) || v <= 0) return null;
  if (type === "percent") return v <= 100 ? { type, value: v } : null;
  if (type === "dollar") return v <= 500 ? { type, value: v } : null;
  return null;
}

const dollars = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** "20% off", "$10 off" or "free delivery", to go in the middle of a sentence. */
export function offerLabel(o: Offer): string {
  if (o.type === "percent") return `${o.value}% off`;
  if (o.type === "dollar") return `${dollars(o.value)} off`;
  return "free delivery";
}

/** A new random code, like "K7MP4QXA". Web crypto, so this file also runs in the browser. */
export function makeCode(): string {
  let out = "";
  // Bytes of 248 and over are skipped, so every letter is equally likely (248 = 31 × 8).
  while (out.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && out.length < CODE_LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

/** The code tidied up (capitals, no spaces), or null if it can't be one of ours. */
export function cleanCode(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.replace(/[\s-]/g, "").toUpperCase();
  return c.length === CODE_LENGTH && [...c].every(ch => ALPHABET.includes(ch)) ? c : null;
}

/** Where an order came from, from the link's ?src. A code always means win-back. */
export function cameFrom(src: unknown, hasCode: boolean): CameFrom {
  if (hasCode) return "winback";
  return typeof src === "string" && (CAME_FROM as readonly string[]).includes(src) ? (src as CameFrom) : "direct";
}

/** "Counter QR code" and so on, for the Orders page. */
export function cameFromLabel(v: unknown): string | null {
  switch (v) {
    case "counter": return "Counter QR code";
    case "winback": return "Win-back offer";
    case "google":  return "Google";
    case "website": return "Their website";
    case "social":  return "Social media";
    case "direct":  return "Ordering page";
    default:        return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

export type IssuedCode = { code: string; expiresAt: Date; ends: string };

/**
 * Makes and saves a code for one customer. Returns null if it couldn't be
 * saved, and then nothing should be sent, because the message would promise
 * a discount checkout won't give.
 */
export async function issueCode(db: Db, args: {
  businessId: string; customerId: string; offer: Offer; timezone: string;
  ruleId?: string | null; campaignId?: string | null; now?: Date;
}): Promise<IssuedCode | null> {
  const now = args.now ?? new Date();
  const expiresAt = shopDayEnd(now, CODE_DAYS, args.timezone);
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeCode();
    const { error } = await db.from("offer_codes").insert({
      business_id: args.businessId, code, customer_id: args.customerId,
      source: "winback", rule_id: args.ruleId ?? null, campaign_id: args.campaignId ?? null,
      offer_type: args.offer.type, offer_value: args.offer.value, expires_at: expiresAt.toISOString(),
    });
    if (!error) return { code, expiresAt, ends: shopDate(expiresAt, args.timezone) };
    // 23505 is the same code twice at this shop, about one in a billion. Try another.
    if (error.code !== "23505") {
      console.error("[offer-codes] couldn't save a code", error.message);
      return null;
    }
  }
  return null;
}

export type CodeRow = {
  id: string; code: string; customer_id: string | null; rule_id: string | null; campaign_id: string | null;
  offer_type: string; offer_value: number | string; expires_at: string; redeemed_at: string | null;
  held_session: string | null; held_until: string | null;
};

export type CodeCheck = { ok: true; row: CodeRow; offer: Offer } | { ok: false; error: string };

/** Is this a live code at this shop? The error is in words for the customer. */
export async function checkCode(db: Db, businessId: string, code: string, now: Date = new Date()): Promise<CodeCheck> {
  const { data } = await db.from("offer_codes")
    .select("id, code, customer_id, rule_id, campaign_id, offer_type, offer_value, expires_at, redeemed_at, held_session, held_until")
    .eq("business_id", businessId).eq("code", code).maybeSingle();
  const row = data as CodeRow | null;
  if (!row) return { ok: false, error: "That offer code isn't one of ours. Check the link in your message." };
  if (row.redeemed_at) return { ok: false, error: "That offer code has already been used." };
  if (Date.parse(row.expires_at) <= now.getTime()) return { ok: false, error: "That offer code has ended." };
  const offer = readOffer(row.offer_type, row.offer_value);
  if (!offer) return { ok: false, error: "That offer code can't be used online." };
  return { ok: true, row, offer };
}

export type CodeDiscount = { cents: number; note: string | null };

/**
 * How much the code takes off, in cents. subtotalCents is the items only.
 * The note says why it's 0, for the ordering page.
 */
export function codeDiscount(offer: Offer, subtotalCents: number, deliveryFeeCents: number): CodeDiscount {
  let cents = 0;
  if (offer.type === "percent") cents = Math.round((subtotalCents * offer.value) / 100);
  else if (offer.type === "dollar") cents = Math.round(offer.value * 100);
  else {
    if (deliveryFeeCents <= 0) return { cents: 0, note: "Your free delivery code works when you choose delivery." };
    return { cents: deliveryFeeCents, note: null };
  }
  // Stripe needs at least 50c paid.
  cents = Math.min(cents, subtotalCents - 50);
  return cents > 0 ? { cents, note: null } : { cents: 0, note: null };
}

/**
 * After the payment: marks the code used and counts the order towards its
 * win-back rule (Redemptions and Revenue recovered on the Zentra Rewards
 * page, and Recovered revenue on the dashboard). Logs and carries on if
 * anything fails, because the order is already saved.
 */
export async function redeemCode(db: Db, args: {
  businessId: string; code: string; orderId: string; customerId: string | null; total: number;
}): Promise<void> {
  try {
    const { data } = await db.from("offer_codes")
      .update({ redeemed_at: new Date().toISOString(), order_id: args.orderId })
      .eq("business_id", args.businessId).eq("code", args.code).is("redeemed_at", null)
      .select("id, rule_id, campaign_id");
    const row = (Array.isArray(data) ? data[0] : data) as { rule_id: string | null; campaign_id: string | null } | undefined;
    if (!row) {
      console.warn(`[offer-codes] ${args.code} was already used or isn't at ${args.businessId}`);
      return;
    }
    if (row.rule_id) {
      const { data: rule } = await db.from("winback_rules").select("redemptions, revenue")
        .eq("id", row.rule_id).eq("business_id", args.businessId).maybeSingle();
      if (rule) {
        await db.from("winback_rules").update({
          redemptions: Number(rule.redemptions ?? 0) + 1,
          revenue: Math.round((Number(rule.revenue ?? 0) + args.total) * 100) / 100,
        }).eq("id", row.rule_id).eq("business_id", args.businessId);
      }
    }
    await db.from("campaign_events").insert({
      business_id: args.businessId, winback_rule_id: row.rule_id, campaign_id: row.campaign_id,
      customer_id: args.customerId, order_id: args.orderId, event_type: "redeemed",
      revenue_attributed: args.total, coupon_code: args.code,
    });
  } catch (err) {
    console.error("[offer-codes] couldn't record the redemption", err instanceof Error ? err.message : err);
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "20% off at Nonna's Kitchen", for an email subject. */
export function offerSubject(o: Offer, business: string): string {
  return `${capitalise(offerLabel(o))} at ${business}`;
}

/**
 * The win-back message from the shop's template. Placeholders: {name},
 * {business} (or {shop}), {offer}, {link}, {code}, {ends}, and {discount}
 * for old campaigns. The link always carries the code. If the template
 * leaves out {ends} or {link}, they're added at the end, so every message
 * says it's for online orders and when it ends.
 */
/**
 * The win-back text a rule starts with. With the link, the end date and
 * Reply STOP it fits one text (160 characters) for Nonna's Kitchen with 9 to
 * 15 characters to spare. The shop's name is in it twice (the words and the
 * web address), so a much longer name takes two, and the editor says so. The
 * old one ("Here's {offer} on your next online order") always took two, and
 * read "20% off on".
 */
export const WINBACK_TEMPLATE = "{name}, we miss you at {business}. Get {offer} online until {ends}: {link}";

/** The link in a win-back message. The code alone marks the order as win-back. */
export function winbackLink(storeUrl: string, code: string): string {
  return `${storeUrl}?code=${code}`;
}

/**
 * A rule's text as one sample customer would get it, written the way it goes
 * out (shop name, the code and its end date, Reply STOP), so the editor can
 * show it and count what it costs.
 */
export function winbackPreview(
  template: string,
  offer: Offer | null,
  shop: { name?: string | null; subdomain?: string | null; settings?: unknown },
  now: Date = new Date(),
): string {
  const name = shop.name?.trim() || "your shop";
  const timezone = readOrderingRules(shop.settings ?? null).timezone;
  const code = "W4NTPRZZ";
  const link = winbackLink(orderUrl(shop.subdomain || "yourshop"), code);
  const ends = shopDate(shopDayEnd(now, CODE_DAYS, timezone), timezone);
  const text = winbackMessage(template.trim() || WINBACK_TEMPLATE, { name: "Sofia", business: name, shop: name }, { offer, link, code, ends });
  return smsBody("marketing", text, name);
}

export function winbackMessage(template: string, vars: Record<string, string>, o: { offer: Offer | null; link: string; code?: string; ends?: string }): string {
  let tpl = template;
  if (o.offer) {
    // The label already says "off", and older templates say "{offer} off".
    tpl = tpl.replace(/\{offer\}\s+off\b/gi, o.offer.type === "free_delivery" ? "{offer} on" : "{offer}");
  }
  const all: Record<string, string> = {
    ...vars, link: o.link, code: o.code ?? "", ends: o.ends ?? "",
    ...(o.offer ? { offer: offerLabel(o.offer) } : {}),
  };
  let text = tpl.replace(/\{(\w+)\}/g, (_, k: string) => all[k] ?? "");
  // A message that starts with the offer starts with a capital.
  text = capitalise(text.trim());
  if (o.offer && o.ends && !/\{ends\}/.test(template)) text += ` Online orders only, ends ${o.ends}.`;
  if (o.link && !/\{link\}/.test(template)) text += ` ${o.link}`;
  return text.replace(/[ \t]+/g, " ").trim();
}
