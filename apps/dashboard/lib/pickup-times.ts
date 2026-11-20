// ─── Opening hours and pick-up times for online orders ──────────────────────
// One set of rules, used by the ordering page (to show the choices) and by
// checkout (to check what the customer picked). Pure code, so it runs in the
// browser and on the server and is easy to test.
//
// Where the rules come from, all on businesses.settings:
//   hours                  { mon: { open: "17:00", close: "21:00", closed }, ... }
//                          A close at or before the open time runs past
//                          midnight (17:00 to 01:00).
//   timezone               e.g. "Australia/Adelaide". Hours are in shop time.
//   ordering.prep_minutes  how long an order takes, 20 by default
//   ordering.paused        true stops online orders (a busy night)
//
// What the customer can pick:
//   • open now: "As soon as possible" (now plus prep time) or a later time
//     today, on the quarter hour, up to closing time
//   • closed now but opening later today: a time later today, from opening
//     plus prep time
//   • closed for the day or paused: nothing, with when it opens next
//   • no hours saved yet: "As soon as possible" only, as before

import { DAY_KEYS, type DayKey } from "@/lib/import/types";

export const DEFAULT_TIMEZONE = "Australia/Adelaide";
export const DEFAULT_PREP_MINUTES = 20;
export const SLOT_MINUTES = 15;
/** A picked time can be this far behind the earliest one, for a slow click. */
const GRACE_MS = 2 * 60_000;
const MAX_SLOTS = 64;

export type DayHours = { open?: string; close?: string; closed?: boolean };
export type Week = Partial<Record<DayKey, DayHours>>;
export type OrderingRules = { week: Week | null; timezone: string; prepMinutes: number; paused: boolean };

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-AU", { timeZone: tz }); return true; } catch { return false; }
}

/** The ordering rules from businesses.settings, with anything odd dropped. */
export function readOrderingRules(settings: unknown): OrderingRules {
  const s = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  let week: Week | null = null;
  if (s.hours && typeof s.hours === "object") {
    week = {};
    for (const d of DAY_KEYS) {
      const h = (s.hours as Record<string, unknown>)[d];
      if (!h || typeof h !== "object") continue;
      const r = h as Record<string, unknown>;
      const open = typeof r.open === "string" && HM.test(r.open) ? r.open : undefined;
      const close = typeof r.close === "string" && HM.test(r.close) ? r.close : undefined;
      week[d] = { open, close, closed: r.closed === true || !open || !close };
    }
    if (!Object.keys(week).length) week = null;
  }
  const ordering = (s.ordering && typeof s.ordering === "object" ? s.ordering : {}) as Record<string, unknown>;
  const prep = Math.round(Number(ordering.prep_minutes));
  return {
    week,
    timezone: validTimezone(s.timezone) ? s.timezone : DEFAULT_TIMEZONE,
    prepMinutes: Number.isFinite(prep) && prep >= 5 && prep <= 180 ? prep : DEFAULT_PREP_MINUTES,
    paused: ordering.paused === true,
  };
}

// ─── Shop clock ─────────────────────────────────────────────────────────────

type Ymd = { y: number; m: number; d: number };

function zoned(date: Date, tz: string): Ymd & { hh: number; mm: number; day: DayKey } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(date).map(x => [x.type, x.value]));
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    hh: Number(p.hour), mm: Number(p.minute),
    day: String(p.weekday).slice(0, 3).toLowerCase() as DayKey,
  };
}

/** The moment it's hh:mm on that date in the shop's time zone. */
function atShopTime({ y, m, d }: Ymd, hm: string, tz: string): Date {
  const [hh, mm] = hm.split(":").map(Number) as [number, number];
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wanted;
  // Two passes settle the offset, including on daylight saving days.
  for (let i = 0; i < 2; i++) {
    const z = zoned(new Date(guess), tz);
    const shown = Date.UTC(z.y, z.m - 1, z.d, z.hh, z.mm);
    guess += wanted - shown;
  }
  return new Date(guess);
}

function shiftDays({ y, m, d }: Ymd, n: number): Ymd {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const ceilTo = (ms: number, minutes: number) => Math.ceil(ms / (minutes * 60_000)) * minutes * 60_000;

type Session = { openAt: Date; closeAt: Date };

function session(week: Week, day: DayKey, date: Ymd, tz: string): Session | null {
  const h = week[day];
  if (!h || h.closed || !h.open || !h.close) return null;
  const openAt = atShopTime(date, h.open, tz);
  let closeAt = atShopTime(date, h.close, tz);
  if (closeAt <= openAt) closeAt = atShopTime(shiftDays(date, 1), h.close, tz);
  return { openAt, closeAt };
}

// ─── What the customer can pick ─────────────────────────────────────────────

export type PickupPlan =
  | { state: "open"; asap: Date; slots: Date[]; closesAt: Date }
  | { state: "later"; slots: Date[]; opensAt: Date; closesAt: Date }
  | { state: "closed"; nextOpen: string | null }
  | { state: "paused" }
  | { state: "anytime"; asap: Date };

export function pickupPlan(rules: OrderingRules, now: Date = new Date()): PickupPlan {
  if (rules.paused) return { state: "paused" };
  const prepMs = rules.prepMinutes * 60_000;
  const asapAt = (from: number) => new Date(ceilTo(from + prepMs, 5));
  if (!rules.week) return { state: "anytime", asap: asapAt(now.getTime()) };

  const tz = rules.timezone;
  const today = zoned(now, tz);
  const date: Ymd = { y: today.y, m: today.m, d: today.d };
  const yesterdayKey = DAY_KEYS[(DAY_KEYS.indexOf(today.day) + 6) % 7]!;

  // Last night's session if it runs past midnight, then today's.
  const sessions = [
    session(rules.week, yesterdayKey, shiftDays(date, -1), tz),
    session(rules.week, today.day, date, tz),
  ].filter((s): s is Session => s !== null && s.closeAt.getTime() > now.getTime());

  for (const s of sessions) {
    const isOpen = s.openAt.getTime() <= now.getTime();
    const earliest = asapAt(Math.max(now.getTime(), s.openAt.getTime()));
    if (earliest > s.closeAt) continue; // too close to closing time

    const slots: Date[] = [];
    const firstSlot = isOpen ? ceilTo(earliest.getTime() + 60_000, SLOT_MINUTES) : ceilTo(earliest.getTime(), SLOT_MINUTES);
    for (let t = firstSlot; t <= s.closeAt.getTime() && slots.length < MAX_SLOTS; t += SLOT_MINUTES * 60_000) {
      slots.push(new Date(t));
    }
    if (isOpen) return { state: "open", asap: earliest, slots, closesAt: s.closeAt };
    if (slots.length) return { state: "later", slots, opensAt: s.openAt, closesAt: s.closeAt };
  }

  return { state: "closed", nextOpen: nextOpening(rules.week, today.day, today.hh * 60 + today.mm) };
}

const DAY_NAME: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/** "Opens 5pm today", "Opens tomorrow 5pm", "Opens Tue 5pm", or null. */
function nextOpening(week: Week, day: DayKey, nowMinutes: number): string | null {
  const t = week[day];
  if (t && !t.closed && t.open) {
    const [h, m] = t.open.split(":").map(Number) as [number, number];
    if (h * 60 + m > nowMinutes) return `Opens ${clock(t.open)} today`;
  }
  const idx = DAY_KEYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = DAY_KEYS[(idx + i) % 7]!;
    const w = week[d];
    if (w && !w.closed && w.open) return `Opens ${i === 1 ? "tomorrow" : DAY_NAME[d]} ${clock(w.open)}`;
  }
  return null;
}

function clock(hm: string): string {
  const [h, m] = hm.split(":").map(Number) as [number, number];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** "6:30pm" in the shop's time zone. */
export function shopTime(date: Date, timezone: string): string {
  const z = zoned(date, timezone);
  return clock(`${String(z.hh).padStart(2, "0")}:${String(z.mm).padStart(2, "0")}`);
}

/** "As soon as possible, about 6:20pm" or "6:30pm". */
export function pickupLabel(pickupAt: Date, asap: boolean, timezone: string): string {
  return asap ? `As soon as possible, about ${shopTime(pickupAt, timezone)}` : shopTime(pickupAt, timezone);
}

// ─── Checking what the customer picked ──────────────────────────────────────

export type PickupCheck =
  | { ok: true; pickupAt: Date; asap: boolean }
  | { ok: false; error: string };

/**
 * Checks a pick-up choice at checkout. choice is "asap" or the ISO time of a
 * slot the ordering page offered.
 */
export function checkPickup(rules: OrderingRules, choice: unknown, now: Date = new Date()): PickupCheck {
  const plan = pickupPlan(rules, now);
  if (plan.state === "paused") return { ok: false, error: "Online orders are paused right now. Please try again soon or give us a call." };
  if (plan.state === "closed") return { ok: false, error: `We're closed for online orders right now.${plan.nextOpen ? ` ${plan.nextOpen}.` : ""}` };

  if (choice === "asap" || choice === undefined || choice === null) {
    if (plan.state === "open" || plan.state === "anytime") return { ok: true, pickupAt: plan.asap, asap: true };
    return { ok: false, error: "We're not open yet. Please pick a time." };
  }

  const t = typeof choice === "string" ? Date.parse(choice) : NaN;
  if (!Number.isFinite(t) || plan.state === "anytime") {
    return { ok: false, error: "Please pick a time again." };
  }
  const earliest = plan.state === "open" ? plan.asap.getTime() : plan.slots[0]?.getTime() ?? Infinity;
  const onGrid = t % (SLOT_MINUTES * 60_000) === 0;
  if (!onGrid || t > plan.closesAt.getTime()) return { ok: false, error: "Please pick a time again." };
  if (t < earliest - GRACE_MS) return { ok: false, error: "That time has gone. Please pick another." };
  return { ok: true, pickupAt: new Date(t), asap: false };
}
