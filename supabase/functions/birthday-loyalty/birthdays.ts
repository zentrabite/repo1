// Whose birthday it is today, in each shop's own time zone. Plain TypeScript
// with no Deno or Node APIs, so the edge function uses it and the CRM's tests
// check it (apps/dashboard/tests/birthdays.test.ts).
//
// Birthdays are a day and a month only (migration 033). A 29 February
// birthday is celebrated on 28 February when the year isn't a leap year.

export const DEFAULT_TIMEZONE = "Australia/Adelaide";

export type ShopDay = { year: number; month: number; day: number };

/** Today's date in the shop's time zone. */
export function shopToday(now: Date, timeZone: string): ShopDay {
  const fmt = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  let text: string;
  try { text = fmt(timeZone); } catch { text = fmt(DEFAULT_TIMEZONE); }
  const [year, month, day] = text.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** True when a birthday of this day and month falls on the shop's today. */
export function isBirthday(birthMonth: number | null | undefined, birthDay: number | null | undefined, today: ShopDay): boolean {
  if (!birthMonth || !birthDay) return false;
  if (birthMonth === today.month && birthDay === today.day) return true;
  return birthMonth === 2 && birthDay === 29 && today.month === 2 && today.day === 28 && !leap(today.year);
}

/** The (month, day) pairs any shop could be on right now, for the first read. */
export function candidateDays(now: Date): { month: number; day: number }[] {
  const out = new Map<string, { month: number; day: number }>();
  for (const shift of [-1, 0, 1]) {
    const d = new Date(now.getTime() + shift * 86_400_000);
    out.set(`${d.getUTCMonth() + 1}-${d.getUTCDate()}`, { month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  }
  return [...out.values()];
}
