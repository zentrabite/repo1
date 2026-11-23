// ─── POST /api/orders/[id]/refund ───────────────────────────────────────────
// Gives money back on an online order, from the shop's own Stripe account.
//
// Body: { business_id?: string, amount?: number }
//   amount   dollars to give back. Leave it out to refund all that's left.
//
// Who: owners and managers. Staff can't give money back.
// Which orders: online orders paid by card through Stripe (source "direct",
// a pi_ payment), refunded here through Stripe. And counter sales (source
// "pos"), refunded on the shop's card machine or in cash and only recorded
// here, so the sale, the customer's spend and their points go down to match
// (since 23 Nov 2026; before that a counter refund left all three as they were).
//
// How much is left comes from Stripe, not the order, so a refund made in the
// shop's Stripe Dashboard counts too. The order saves the total refunded
// (lib/refunds.ts), and migration 021 takes it off the customer's totals and
// points. Refunded in full, the order becomes "Refunded".
//
// A double click can't refund twice. The idempotency key is the order, what
// Stripe had already refunded when the request started, and the amount, so
// the same click sent twice gets the same refund back from Stripe.
//
// Money: refunds come out of the shop's Stripe balance (direct charges).
// Stripe keeps its fee on the original payment. If the balance is short,
// Stripe holds a card refund as pending until it's covered.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { counterSale, money, paidByStripe, refundCents, saveRefunded } from "@/lib/refunds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { business_id?: string; amount?: unknown };

  // The business comes from the login, never the body (see request-business).
  const auth = await requireBusiness(body.business_id, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  if (!UUID_RE.test(id)) return fail(404, "Order not found.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data: order } = await db.from("orders")
    .select("id, business_id, total, status, source, stripe_payment_id, refunded_amount")
    .eq("id", id).eq("business_id", auth.businessId).maybeSingle();
  if (!order) return fail(404, "Order not found.");
  if (counterSale(order)) return recordCounterRefund(db, order, body.amount, auth.businessId);
  if (!paidByStripe(order)) {
    return fail(409, "This order wasn't paid through ZentraBite, so there's nothing to refund here.");
  }

  const { data: biz } = await db.from("businesses").select("stripe_account_id").eq("id", auth.businessId).maybeSingle();
  if (!biz?.stripe_account_id) return fail(409, "Stripe isn't set up for this shop.");
  const onShop = { stripeAccount: biz.stripe_account_id as string };

  // What Stripe says was paid and has been refunded.
  let charge: Stripe.Charge | null = null;
  try {
    const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_id, { expand: ["latest_charge"] }, onShop);
    charge = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  } catch (err) {
    console.error("[refund] reading the payment failed:", err instanceof Error ? err.message : err);
    return fail(502, "Couldn't reach Stripe. Try again in a minute.");
  }
  if (!charge || charge.status !== "succeeded") return fail(409, "This payment can't be refunded.");

  const leftCents = charge.amount - charge.amount_refunded;
  if (leftCents <= 0) {
    await saveRefunded(db, order, charge.amount_refunded, charge.amount);
    return fail(409, "This order has already been refunded in full.");
  }

  const asked = refundCents(body.amount, leftCents);
  if (!asked.ok) return fail(400, asked.error);

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_id,
        amount:         asked.cents,
        reason:         "requested_by_customer",
        metadata:       { order_id: order.id, business_id: auth.businessId, refunded_by: auth.userId },
      },
      { ...onShop, idempotencyKey: `refund_${order.id}_${charge.amount_refunded}_${asked.cents}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[refund] Stripe refused:", message);
    // Only owners and managers get here, and Stripe's message says what's wrong.
    return fail(502, `Stripe couldn't make the refund: ${message}`);
  }
  if (refund.status === "failed" || refund.status === "canceled") {
    return fail(502, "Stripe couldn't make the refund. Check the payment in your Stripe Dashboard.");
  }

  let saved;
  try {
    saved = await saveRefunded(db, order, charge.amount_refunded + refund.amount, charge.amount);
  } catch (err) {
    // The money has gone back. The Stripe webhook saves it on the order too,
    // so say it worked and let that catch up.
    console.error("[refund]", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    refunded:        money(refund.amount / 100),
    refund_status:   refund.status,
    refunded_amount: saved?.refunded_amount ?? (charge.amount_refunded + refund.amount) / 100,
    refunded_at:     saved?.refunded_at ?? new Date().toISOString(),
    status:          saved?.status ?? order.status,
  });
}

/**
 * A counter sale refunded on the card machine or in cash. Nothing moves
 * through ZentraBite. The order saves the total refunded, migration 021 takes
 * it off the customer's spend and points, and the reports follow.
 *
 * The save only goes through if nothing was recorded since the order was
 * read, so a double click can't record the same refund twice.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordCounterRefund(db: any, order: { id: string; total: number | string; refunded_amount?: number | string | null; status?: string | null }, amount: unknown, businessId: string) {
  const totalCents = Math.round(Number(order.total) * 100);
  const beforeCents = Math.round(Number(order.refunded_amount ?? 0) * 100);
  const leftCents = totalCents - beforeCents;
  if (leftCents <= 0) return fail(409, "This sale has already been refunded in full.");

  const asked = refundCents(amount, leftCents);
  if (!asked.ok) return fail(400, asked.error);

  const afterCents = beforeCents + asked.cents;
  const full = afterCents >= totalCents;
  const patch: Record<string, unknown> = { refunded_amount: afterCents / 100, refunded_at: new Date().toISOString() };
  if (full) patch.status = "Refunded";

  const { data: saved, error } = await db.from("orders")
    .update(patch)
    .eq("id", order.id).eq("business_id", businessId).eq("refunded_amount", beforeCents / 100)
    .select("id");
  if (error) return fail(500, "Couldn't record the refund. Try again.");
  if (!Array.isArray(saved) || saved.length === 0) {
    return fail(409, "This sale changed while you had it open. Close it, open it again and check.");
  }

  return NextResponse.json({
    refunded:        money(asked.cents / 100),
    refund_status:   "recorded",
    refunded_amount: afterCents / 100,
    refunded_at:     patch.refunded_at,
    status:          full ? "Refunded" : order.status ?? null,
  });
}
