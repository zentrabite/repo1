// ─── How a text is written and what it costs ────────────────────────────────
// A text goes in parts, and Twilio charges for each part.
//   • Plain characters (GSM-7): 160 to a one-part text, 153 a part after that.
//     A few of them (€ [ ] { } ^ ~ | \) take two places.
//   • One character outside that set, like an emoji, turns the whole text
//     into unicode: 70 to a one-part text, 67 a part after that, and an
//     emoji takes two. A text that was one part can become three.
// plainSms() swaps curly quotes, long dashes, "…" and odd spaces for plain
// ones before any text goes, so they never cost extra. Emoji are the owner's
// call, so smsCost() names them and the pages say what they cost.
//
// Quiet hours: no marketing text goes between 8pm and 9am in the shop's time
// zone (inQuietHours). Order texts can go any time.
//
// No server-only import, so the pages show the same count the send uses.
// lib/sms.ts re-exports the writing helpers for the server.

import type { MessageKind } from "@/lib/message-kinds";

const GSM_BASIC = new Set([..."@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"]);
const GSM_EXTENDED = new Set([..."^{}\\[~]|€\f"]);

const SWAPS: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, "\""],
  [/[\u2010-\u2015\u2212]/g, "-"],
  [/\u2026/g, "..."],
  [/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " "],
  [/[\u200B-\u200D\u2060\uFEFF]/g, ""],
  [/[\u2022\u00B7]/g, "-"],
];

/** Swaps the look-alike characters that would make a text unicode for plain ones. */
export function plainSms(text: string): string {
  return SWAPS.reduce((t, [re, to]) => t.replace(re, to), text);
}

export type SmsCost = {
  /** "plain" fits GSM-7, "unicode" doesn't. */
  encoding: "plain" | "unicode";
  /** Places used, in the encoding's own units. */
  length: number;
  parts: number;
  /** How many places each part holds for this text. */
  perPart: number;
  /** The characters that made it unicode, once each. */
  unicode: string[];
};

/** How many parts a text goes in, as Twilio counts them. */
export function smsCost(text: string): SmsCost {
  const chars = [...text];
  const unicode = [...new Set(chars.filter(c => !GSM_BASIC.has(c) && !GSM_EXTENDED.has(c)))];
  if (unicode.length) {
    const length = text.length; // UTF-16 units, so an emoji counts as two
    return { encoding: "unicode", length, parts: length <= 70 ? 1 : Math.ceil(length / 67), perPart: length <= 70 ? 70 : 67, unicode };
  }
  const length = chars.reduce((n, c) => n + (GSM_EXTENDED.has(c) ? 2 : 1), 0);
  return { encoding: "plain", length, parts: length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153), perPart: length <= 160 ? 160 : 153, unicode: [] };
}

/** One plain line for the pages: "143 characters, 1 text." */
export function costLine(c: SmsCost): string {
  if (c.parts <= 1) return `${c.length} of ${c.perPart} characters, 1 text.`;
  return `${c.length} characters, sent as ${c.parts} texts, so it costs ${c.parts} times as much.`;
}

/** Puts the business name at the start if the text doesn't already mention it. */
export function withSender(message: string, businessName: string | null | undefined): string {
  const text = message.trim();
  const name = (businessName ?? "").trim();
  return name && !text.toLowerCase().includes(name.toLowerCase()) ? `${name}: ${text}` : text;
}

/**
 * Makes a marketing text Spam Act friendly. Adds the business name at the
 * start if the template doesn't already mention it, and a STOP line at the end.
 */
export function withSenderAndOptOut(message: string, businessName: string | null | undefined): string {
  let text = withSender(message, businessName);
  if (!/reply\s+stop/i.test(text)) {
    text = `${text} Reply STOP to opt out`;
  }
  return text;
}

/**
 * A text as it goes out. Every text names the shop and has its look-alike
 * characters made plain. Marketing also says "Reply STOP to opt out". A
 * must_reach text doesn't, because STOP doesn't stop texts about an order
 * and saying so would mislead.
 */
export function smsBody(kind: MessageKind, message: string, businessName: string | null | undefined): string {
  return plainSms(kind === "marketing" ? withSenderAndOptOut(message, businessName) : withSender(message, businessName));
}

// ─── Quiet hours ────────────────────────────────────────────────────────────

export const QUIET_FROM = 20; // 8pm
export const QUIET_UNTIL = 9; // 9am

/** The hour (0 to 23) in a time zone. */
export function shopHour(now: Date, timezone: string): number {
  const h = new Intl.DateTimeFormat("en-AU", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h) % 24;
}

/** True between 8pm and 9am in the shop's time zone, when no marketing text goes. */
export function inQuietHours(now: Date, timezone: string): boolean {
  const h = shopHour(now, timezone);
  return h >= QUIET_FROM || h < QUIET_UNTIL;
}

export const QUIET_HOURS_TEXT = "Offers and news aren't texted between 8pm and 9am, your shop's time. Texts about an order can go any time.";
