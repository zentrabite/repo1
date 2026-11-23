// Tests for the day-by-day sums behind Analytics and Financials
// (supabase/functions/nightly-analytics/totals.ts, used by the nightly
// edge function). Before 23 Nov 2026 a refund never reached a past day, days
// were UTC days, not the shop's, and counter sales counted as delivery app
// orders, so Financials charged them a made-up 30% app fee.

import { describe, expect, it } from "vitest";
import { dailyTotals, shopDate, windowDays } from "../../../supabase/functions/nightly-analytics/totals";

const TZ = "Australia/Adelaide"; // UTC+10:30 in November

describe("the shop's own day", () => {
  it("uses the shop's time zone, not UTC", () => {
    expect(shopDate("2026-11-21T22:00:00Z", TZ)).toBe("2026-11-22"); // 8:30am Sunday in Adelaide
    expect(shopDate("2026-11-21T13:00:00Z", TZ)).toBe("2026-11-21"); // 11:30pm Saturday
    expect(shopDate("2026-11-21T22:00:00Z", "Not/AZone")).toBe("2026-11-22"); // a bad zone falls back to Adelaide
  });

  it("the window is the 90 days before today, oldest first", () => {
    const days = windowDays(new Date("2026-11-23T16:00:00Z"), TZ); // 2:30am 24 Nov in Adelaide
    expect(days).toHaveLength(90);
    expect(days[89]).toBe("2026-11-23");
    expect(days[0]).toBe("2026-08-26");
    expect(windowDays(new Date("2026-03-01T03:00:00Z"), TZ, 2)).toEqual(["2026-02-27", "2026-02-28"]);
  });
});

describe("a day's sums", () => {
  const days = ["2026-11-21", "2026-11-22"];
  const order = (total: number, at: string, source = "direct", refunded = 0) => ({ total, refunded_amount: refunded, source, created_at: at });

  it("takes refunds off the order's day, and a full refund isn't an order", () => {
    const [sat, sun] = dailyTotals(days, TZ, [
      order(40, "2026-11-21T03:00:00Z"),
      order(25.5, "2026-11-21T04:00:00Z", "direct", 10),  // part refunded
      order(30, "2026-11-21T05:00:00Z", "direct", 30),    // refunded in full
      order(12, "2026-11-21T22:00:00Z", "pos"),           // Sunday morning in Adelaide
    ], [], []);
    expect(sat).toMatchObject({ date: "2026-11-21", total_orders: 2, total_revenue: 55.5, direct_orders: 2, agg_orders: 0 });
    expect(sun).toMatchObject({ date: "2026-11-22", total_orders: 1, total_revenue: 12 });
  });

  it("counter sales are the shop's own, only delivery apps are app orders", () => {
    const [sat] = dailyTotals(days, TZ, [order(10, "2026-11-21T03:00:00Z", "pos"), order(20, "2026-11-21T03:00:00Z", "uber_eats"), order(5, "2026-11-21T03:00:00Z", "direct")], [], []);
    expect(sat).toMatchObject({ total_orders: 3, direct_orders: 2, agg_orders: 1, total_revenue: 35 });
  });

  it("every day gets a row, so a day refunded later goes back to 0", () => {
    const rows = dailyTotals(days, TZ, [order(30, "2026-11-22T01:00:00Z", "direct", 30)], [], []);
    expect(rows).toEqual([
      { date: "2026-11-21", total_orders: 0, total_revenue: 0, direct_orders: 0, agg_orders: 0, new_customers: 0, sms_sent: 0, sms_converted: 0 },
      { date: "2026-11-22", total_orders: 0, total_revenue: 0, direct_orders: 0, agg_orders: 0, new_customers: 0, sms_sent: 0, sms_converted: 0 },
    ]);
  });

  it("counts new customers and texts that went out on the shop's day, and ignores rows outside the window", () => {
    const [sat, sun] = dailyTotals(days, TZ,
      [order(9, "2026-11-19T03:00:00Z")],
      [{ created_at: "2026-11-21T02:00:00Z" }, { created_at: "2026-11-21T23:00:00Z" }, { created_at: "2026-11-25T02:00:00Z" }],
      [{ sent_at: "2026-11-21T06:00:00Z", converted: true }, { sent_at: "2026-11-21T06:30:00Z", converted: false }, { sent_at: null }]);
    expect(sat).toMatchObject({ new_customers: 1, sms_sent: 2, sms_converted: 1, total_orders: 0 });
    expect(sun).toMatchObject({ new_customers: 1, sms_sent: 0 });
  });

  it("adds money to the cent", () => {
    const [sat] = dailyTotals(days, TZ, [order(0.1, "2026-11-21T03:00:00Z"), order(0.2, "2026-11-21T03:00:00Z"), { total: "19.95", refunded_amount: "4.95", source: "direct", created_at: "2026-11-21T03:00:00Z" }], [], []);
    expect(sat!.total_revenue).toBe(15.3);
  });
});
