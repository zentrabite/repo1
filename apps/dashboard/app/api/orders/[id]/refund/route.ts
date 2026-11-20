// ─── POST /api/orders/[id]/refund ───────────────────────────────────────────
// Gives money back on an online order, from the shop's own Stripe account.
//
// Body: { business_id?: string, amount?: number }
//   amount   dollars to give back. Leave it out to refund all that's left.
//
// Who: owners and managers. Staff can't give money back.
// Which orders: online orders paid by card through Stripe (source "direct",
// a pi_ payment). A counter sale is refunded on the card machine or in cash.
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
import { money, paidByStripe, refundCents, saveRefunded } from "@/lib/refunds";

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
  if (!paidByStripe(order)) {
    return fail(409, "Only online orders paid by card can be refunded here. Refund a counter sale on your card machine or in cash.");
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
