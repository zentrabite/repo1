// The day-by-day sums behind Analytics and Financials (analytics_daily).
// Plain TypeScript with no Deno or Node APIs, so the edge function uses it
// and the CRM's tests check it (apps/dashboard/tests/daily-totals.test.ts).
//
//   • A day is the shop's own day, in its time zone (settings.timezone).
//   • Revenue is what the shop kept. A refund comes off the order's day, and
//     an order refunded in full isn't counted as an order.
//   • Every day in the window gets a row, so a day whose only order was
//     refunded later goes back to 0.
//   • agg_orders are delivery app orders only. Counter sales (source "pos")
//     and the shop's own ordering page ("direct") are the shop's own. Before
//     23 Nov 2026 counter sales were counted as app orders, so Financials
//     charged them a made-up 30% app fee.

export type OrderRow = { total: number | string | null; refunded_amount?: number | string | null; source: string | null; created_at: string };
export type SmsRow = { sent_at: string | null; converted?: boolean | null };

export type DayRow = {
  date: string;
  total_orders: number;
  total_revenue: number;
  direct_orders: number;
  agg_orders: number;
  new_customers: number;
  sms_sent: number;
  sms_converted: number;
};

export const DEFAULT_TIMEZONE = "Australia/Adelaide";
/** Order sources that came through a delivery app. Nothing feeds these in yet. */
export const APP_SOURCES = new Set(["uber_eats", "doordash", "menulog", "deliveroo"]);
export const WINDOW_DAYS = 90;

/** The date (YYYY-MM-DD) of this moment in the shop's time zone. */
export function shopDate(at: Date | string, timeZone: string): string {
  const d = typeof at === "string" ? new Date(at) : at;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }
}

/** The n shop days before today, oldest first. Today isn't over, so it isn't included. */
export function windowDays(now: Date, timeZone: string, n = WINDOW_DAYS): string[] {
  const today = shopDate(now, timeZone);
  const [y, m, d] = today.split("-").map(Number);
  const out: string[] = [];
  for (let i = n; i >= 1; i--) out.push(new Date(Date.UTC(y!, m! - 1, d! - i)).toISOString().slice(0, 10));
  return out;
}

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function dailyTotals(days: string[], timeZone: string, orders: OrderRow[], customers: { created_at: string }[], sms: SmsRow[]): DayRow[] {
  const rows = new Map<string, DayRow>(days.map(date => [date, {
    date, total_orders: 0, total_revenue: 0, direct_orders: 0, agg_orders: 0, new_customers: 0, sms_sent: 0, sms_converted: 0,
  }]));
  for (const o of orders) {
    const row = rows.get(shopDate(o.created_at, timeZone));
    if (!row) continue;
    const total = money(o.total);
    const kept = Math.max(0, total - money(o.refunded_amount));
    row.total_revenue += kept;
    if (total > 0 && kept <= 0) continue; // refunded in full, not an order any more
    row.total_orders += 1;
    if (APP_SOURCES.has(o.source ?? "")) row.agg_orders += 1;
    else row.direct_orders += 1;
  }
  for (const c of customers) {
    const row = rows.get(shopDate(c.created_at, timeZone));
    if (row) row.new_customers += 1;
  }
  for (const s of sms) {
    if (!s.sent_at) continue;
    const row = rows.get(shopDate(s.sent_at, timeZone));
    if (!row) continue;
    row.sms_sent += 1;
    if (s.converted) row.sms_converted += 1;
  }
  for (const row of rows.values()) row.total_revenue = Math.round(row.total_revenue * 100) / 100;
  return [...rows.values()];
}
