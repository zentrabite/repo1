// ─── POST /api/stripe/webhook ────────────────────────────────────────────────
// Receives and verifies Stripe webhook events.
// Uses the service role Supabase client — bypasses RLS to write data.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[webhook] Verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[webhook] ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "account.updated":
        await handleMerchantOnboarded(event.data.object as Stripe.Account);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Handler error";
    console.error(`[webhook] ${event.type} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const { business_id, customer_phone, customer_name, customer_email, items } = pi.metadata;
  if (!business_id) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;

  // ── Upsert customer ────────────────────────────────────────────────────
  let customerId: string | null = null;

  if (customer_phone) {
    // Try to find existing customer by phone
    const { data: existing } = await db
      .from("customers")
      .select("id, total_orders, total_spent")
      .eq("business_id", business_id)
      .eq("phone", customer_phone)
      .single();

    if (existing) {
      // Update existing customer
      await db.from("customers").update({
        last_order_date: new Date().toISOString(),
        total_orders:    existing.total_orders + 1,
        total_spent:     existing.total_spent + (pi.amount / 100),
        points_balance:  existing.points_balance + Math.round(pi.amount / 10), // 10 pts per $1
      }).eq("id", existing.id);
      customerId = existing.id;
    } else {
      // Create new customer
      const { data: newCustomer } = await db.from("customers").insert({
        business_id,
        name:            customer_name ?? "Unknown",
        phone:           customer_phone,
        email:           customer_email ?? null,
        source:          "direct",
        segment:         "New",
        first_order:     new Date().toISOString(),
        last_order_date: new Date().toISOString(),
        total_orders:    1,
        total_spent:     pi.amount / 100,
        points_balance:  Math.round(pi.amount / 10),
      }).select("id").single();
      customerId = newCustomer?.id ?? null;
    }
  }

  // ── Create order ───────────────────────────────────────────────────────
  await db.from("orders").insert({
    business_id,
    customer_id:       customerId,
    items:             items ? JSON.parse(items) : [],
    total:             pi.amount / 100,
    status:            "New",
    source:            "direct",
    stripe_payment_id: pi.id,
  });

  console.log(`[webhook] Order created — business: ${business_id}, $${pi.amount / 100}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { business_id, customer_name, customer_phone, customer_email, items, source } = session.metadata ?? {};
  if (!business_id || source !== "storefront") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;
  const amount = (session.amount_total ?? 0) / 100;
  const parsedItems = items ? JSON.parse(items) : [];

  // Upsert customer
  let customerId: string | null = null;
  if (customer_phone || customer_email) {
    const matchField = customer_phone ? "phone" : "email";
    const matchValue = customer_phone || customer_email;
    const { data: existing } = await db.from("customers").select("id, total_orders, total_spent, points_balance").eq("business_id", business_id).eq(matchField, matchValue).maybeSingle();

    if (existing) {
      await db.from("customers").update({
        last_order_date: new Date().toISOString(),
        total_orders:    existing.total_orders + 1,
        total_spent:     Number(existing.total_spent) + amount,
        points_balance:  existing.points_balance + Math.round(amount * 10),
      }).eq("id", existing.id);
      customerId = existing.id;
    } else {
      const { data: newCust } = await db.from("customers").insert({
        business_id, name: customer_name ?? "Customer",
        phone: customer_phone || null, email: customer_email || null,
        source: "direct", segment: "New",
        first_order: new Date().toISOString(), last_order_date: new Date().toISOString(),
        total_orders: 1, total_spent: amount, points_balance: Math.round(amount * 10),
      }).select("id").single();
      customerId = newCust?.id ?? null;
    }
  }

  await db.from("orders").insert({
    business_id, customer_id: customerId,
    items: parsedItems, total: amount,
    status: "paid", source: "direct",
    stripe_payment_id: session.payment_intent as string,
  });
}

async function handleMerchantOnboarded(account: Stripe.Account) {
  if (!account.charges_enabled || !account.details_submitted) return;
  const businessId = account.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServerClient() as any)
    .from("businesses")
    .update({ stripe_account_id: account.id })
    .eq("id", businessId);

  console.log(`[webhook] Merchant onboarded: ${businessId}`);
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const businessId = sub.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServerClient() as any)
    .from("businesses")
    .update({
      settings: {
        subscription_status:     sub.status,
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        stripe_customer_id:      sub.customer as string,
      }
    })
    .eq("id", businessId);
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription) {
  const businessId = sub.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServerClient() as any)
    .from("businesses")
    .update({ settings: { subscription_status: "cancelled" } })
    .eq("id", businessId);
}
