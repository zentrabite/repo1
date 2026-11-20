// Tests for the refund sums (lib/refunds.ts).

import { describe, expect, it } from "vitest";
import { netTotal, paidByStripe, refundCents, refundLeft, refundedOf } from "@/lib/refunds";

describe("refund sums", () => {
  it("takes refunds off the total, to the cent", () => {
    expect(netTotal({ total: 37.45, refunded_amount: 10.05 })).toBe(27.4);
    expect(netTotal({ total: "18.50", refunded_amount: null })).toBe(18.5);
    expect(refundedOf({ total: 20 })).toBe(0);
    expect(refundLeft({ total: 20, refunded_amount: 20 })).toBe(0);
  });

  it("reads the amount asked for, in cents", () => {
    expect(refundCents(undefined, 3700)).toEqual({ ok: true, cents: 3700 });
    expect(refundCents("", 3700)).toEqual({ ok: true, cents: 3700 });
    expect(refundCents(10.5, 3700)).toEqual({ ok: true, cents: 1050 });
    expect(refundCents("$12.30", 3700)).toEqual({ ok: true, cents: 1230 });
    expect(refundCents(0.1 + 0.2, 3700)).toEqual({ ok: true, cents: 30 });
  });

  it("refuses too much, nothing, or not a number", () => {
    expect(refundCents(37.01, 3700)).toEqual({ ok: false, error: "You can refund up to $37.00 on this order." });
    expect(refundCents(0, 3700).ok).toBe(false);
    expect(refundCents(-2, 3700).ok).toBe(false);
    expect(refundCents("ten", 3700).ok).toBe(false);
    expect(refundCents(0.004, 3700).ok).toBe(false);
  });

  it("knows which orders were paid by card online", () => {
    expect(paidByStripe({ source: "direct", stripe_payment_id: "pi_123" })).toBe(true);
    expect(paidByStripe({ source: "direct", stripe_payment_id: "cs_test_123" })).toBe(false);
    expect(paidByStripe({ source: "pos", stripe_payment_id: null })).toBe(false);
  });
});
