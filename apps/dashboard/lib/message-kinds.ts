// ─── The three kinds of message ─────────────────────────────────────────────
// Every text and email ZentraBite sends is one of three kinds. The kind
// decides who it may go to, what it must carry and what can stop it.
//
//   must_reach  Something a person needs now, about something they started.
//               An order receipt, the owner's new-order alert, a login or
//               invite link, the owner's Stripe setup link, a text to a
//               customer about their order. An opt-out never blocks one.
//               Must carry nothing that sells.
//   account     About a business's own account, to its own people or to us.
//               The trial reminder, the monthly win-back report, a new
//               enquiry for the team. Never sent to a shop's customers.
//   marketing   Anything that sells. Win-back offers, campaigns, an owner's
//               text with an offer or news. Only to customers who agreed and
//               haven't opted out, checked right before each send. Texts
//               name the shop and say "Reply STOP to opt out". Emails carry
//               an unsubscribe link and headers, from the marketing address.
//
// A message with one selling line in it is marketing (Spam Act 2003), so a
// must_reach or account message must not have one. looksLikePromo() catches
// the usual ones in what an owner types. Our own templates are checked in
// tests/message-kinds.test.ts.
//
// No server-only import, so the Customers page can warn as the owner types.

export type MessageKind = "must_reach" | "account" | "marketing";

export const MESSAGE_KINDS: readonly MessageKind[] = ["must_reach", "account", "marketing"];

export function isMessageKind(v: unknown): v is MessageKind {
  return typeof v === "string" && (MESSAGE_KINDS as readonly string[]).includes(v);
}

/** How long after an order a customer who opted out can still get a text about it. */
export const ORDER_TEXT_DAYS = 7;

// Each pattern is a common way a message sells. Kept to phrases that don't
// turn up in plain order news, so "your order is ready", "we're out of garlic
// bread", "your pick-up time moved to 6:30pm", "sorry we missed you at
// pick-up", "we left the drink off your order", "no hurry" and "please order
// again, the payment didn't go through" all pass.
const PROMO: RegExp[] = [
  /\d+\s*%\s*off\b/i,
  /\$\s?\d+(?:\.\d{1,2})?\s*off\b/i,
  /\bhalf[ -]price\b/i,
  /\b(?:2|two) (?:for|4) (?:1|one)\b/i,
  /\bbuy (?:one|1|2|two)\b/i,
  /\bdiscount(?:s|ed)?\b/i,
  /\bdeals\b|\b(?:a|great|hot|meal|lunch|dinner|family|daily|weekly) deal\b/i,
  /\bspecials\b|\bspecial offers?\b|\b(?:today|tonight|this week)'?s special\b/i,
  /\bpromo(?:tion)?s?\b/i,
  /\b(?:an?|our|this|special|exclusive|new|latest) offers?\b|\boffer (?:ends|code)\b/i,
  /\bcoupons?\b|\bvouchers?\b/i,
  /\buse (?:the )?code\b/i,
  /\bfree (?:delivery|drinks?|sides?|desserts?|coffees?|meals?|items?|gifts?|upgrades?|entrees?|chips|garlic bread)\b|\bfor free\b|\bget (?:a |one |your )?free\b/i,
  /\bsale\b/i,
  /\bsave (?:\$?\d|up to)\b/i,
  /\bbonus\b|\b(?:double|triple|extra) points\b/i,
  /\bwin\b(?!-)|\bgiveaway\b|\bcompetition\b/i,
  /\bnew (?:menu|dish(?:es)?|flavou?rs?|range)\b/i,
  /\bwe miss you\b|\bmissing you\b|\bcome back (?:soon|and see us)\b|\bcome see us\b|\bbook (?:now|a table)\b|\btreat yourself\b/i,
  /\blimited time\b|\b(?:today|tonight|this weekend) only\b|\bends (?:soon|tonight|today)\b|\bdon'?t miss\b/i,
  /\bhappy hour\b/i,
  /\bspend (?:over )?\$?\d+\b/i,
];

/**
 * The first selling phrase in a message, or null. A heuristic, not a lawyer:
 * it catches the usual ways an offer is worded, so an owner who picks "about
 * their order" can't slip one in by accident. It errs towards catching, and
 * a catch only means the message is treated as marketing.
 */
export function looksLikePromo(text: string): string | null {
  for (const re of PROMO) {
    const m = text.match(re);
    if (m) return m[0].trim();
  }
  return null;
}

/** True when the customer's most recent order is within ORDER_TEXT_DAYS. */
export function orderedRecently(lastOrderDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastOrderDate) return false;
  const t = Date.parse(lastOrderDate);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= ORDER_TEXT_DAYS * 24 * 60 * 60 * 1000;
}

export type CustomerConsent = {
  marketing_opt_in?: boolean | null;
  opted_out?: boolean | null;
  last_order_date?: string | null;
};

export type TextCheck =
  | { ok: true; kind: "must_reach" | "marketing" }
  | { ok: false; reason: string };

/**
 * Whether an owner's own text to one customer may go, and as which kind.
 * Used by the Customers page as the owner types and by /api/sms/send before
 * sending, so both say the same thing.
 *   • about their order: anyone, unless it reads like an offer. Someone who
 *     opted out only within ORDER_TEXT_DAYS of an order.
 *   • an offer or news: only someone who agreed to marketing and hasn't
 *     opted out.
 */
export function checkCustomerText(kind: "must_reach" | "marketing", text: string, customer: CustomerConsent, now: Date = new Date()): TextCheck {
  if (kind === "must_reach") {
    const promo = looksLikePromo(text);
    if (promo) {
      return { ok: false, reason: `This reads like an offer ("${promo}"). Pick "An offer or news", or take that part out.` };
    }
    if (customer.opted_out && !orderedRecently(customer.last_order_date, now)) {
      return { ok: false, reason: `They've opted out of texts. You can still text them about an order from the last ${ORDER_TEXT_DAYS} days.` };
    }
    return { ok: true, kind };
  }
  if (customer.opted_out) return { ok: false, reason: "They've opted out of texts, so they can't get offers or news." };
  if (!customer.marketing_opt_in) return { ok: false, reason: "They haven't agreed to hear about offers or news. You can still text them about their order." };
  return { ok: true, kind };
}
