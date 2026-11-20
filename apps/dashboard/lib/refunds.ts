// ─── Refunds on orders ──────────────────────────────────────────────────────
// Small pieces shared by the Orders page, the refund route and the Stripe
// webhook. No server imports, so the Orders page can use them too.
//
// orders.refunded_amount (migration 021) is the total given back so far, as
// Stripe reports it. Revenue figures use netTotal(), what the shop kept.

type Refundable = { total: number | string; refunded_amount?: number | string | null };

const cents = (dollars: unknown) => Math.round((Number(dollars) || 0) * 100);

/** Dollars refunded on the order so far. */
export const refundedOf = (o: Refundable): number => cents(o.refunded_amount) / 100;

/** What the shop kept: the total less anything refunded. */
export const netTotal = (o: Refundable): number => (cents(o.total) - cents(o.refunded_amount)) / 100;

/** Dollars that can still be refunded, by the order's own numbers. */
export const refundLeft = (o: Refundable): number => Math.max(0, netTotal(o));

/** An online order paid by card through Stripe. The only kind the refund button handles. */
export function paidByStripe(o: { source?: string | null; stripe_payment_id?: string | null }): boolean {
  return o.source === "direct" && typeof o.stripe_payment_id === "string" && o.stripe_payment_id.startsWith("pi_");
}

export const money = (dollars: number) => `$${dollars.toFixed(2)}`;

/**
 * The amount asked for, in cents, checked against what's left. Nothing (or
 * an empty box) means everything that's left.
 */
export function refundCents(asked: unknown, leftCents: number):
  { ok: true; cents: number } | { ok: false; error: string } {
  if (asked === undefined || asked === null || asked === "") return { ok: true, cents: leftCents };
  const n = typeof asked === "number" ? asked : typeof asked === "string" ? Number(asked.replace(/[$,\s]/g, "")) : NaN;
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Enter an amount to refund." };
  const c = Math.round(n * 100);
  if (c < 1) return { ok: false, error: "Enter an amount to refund." };
  if (c > leftCents) return { ok: false, error: `You can refund up to ${money(leftCents / 100)} on this order.` };
  return { ok: true, cents: c };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

/**
 * Saves the total Stripe has refunded on an order's payment. The order
 * becomes "Refunded" once all of it is back. Saving the same amount again
 * does nothing, and migration 021 moves the customer's totals and points.
 *
 * If a full refund fails later (a closed card, say), Stripe gives the money
 * back to the shop and the amount drops. The order then says "Refund failed",
 * because the shop has to pay the customer back another way.
 */
export async function saveRefunded(
  db: Db,
  order: { id: string; business_id: string; refunded_amount?: number | string | null; status?: string | null },
  refundedCents: number,
  paidCents: number,
): Promise<{ refunded_amount: number; refunded_at: string | null; status: string | null; changed: boolean }> {
  const full = paidCents > 0 && refundedCents >= paidCents;
  const was = order.status ?? null;
  const status = full ? "Refunded" : was === "Refunded" ? "Refund failed" : was;
  if (cents(order.refunded_amount) === refundedCents && status === was) {
    return { refunded_amount: refundedCents / 100, refunded_at: null, status, changed: false };
  }
  const patch: Record<string, unknown> = {
    refunded_amount: refundedCents / 100,
    refunded_at:     new Date().toISOString(),
  };
  if (status !== was) patch.status = status;
  const { error } = await db.from("orders").update(patch).eq("id", order.id).eq("business_id", order.business_id);
  if (error) throw new Error(`saving the refund failed: ${error.message}`);
  return { refunded_amount: refundedCents / 100, refunded_at: patch.refunded_at as string, status, changed: true };
}
