// ─── POST /api/stripe/webhook ────────────────────────────────────────────────
// Receives and verifies Stripe webhook events.
// Uses the service role Supabase client — bypasses RLS to write data.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { notifyOwnerOfOrder } from "@/lib/notify";
import { sendCustomerReceipt } from "@/lib/email";

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
  const parsedItems = items ? JSON.parse(items) : [];
  const { data: newOrder } = await db.from("orders").insert({
    business_id,
    customer_id:       customerId,
    items:             parsedItems,
    total:             pi.amount / 100,
    status:            "New",
    source:            "direct",
    stripe_payment_id: pi.id,
  }).select("id").single();

  console.log(`[webhook] Order created — business: ${business_id}, $${pi.amount / 100}`);

  // ── Notify the business owner (email + SMS) ────────────────────────────
  if (newOrder?.id) {
    await Promise.allSettled([
      notifyOwnerOfOrder({
        businessId:   business_id,
        orderId:      newOrder.id,
        amount:       pi.amount / 100,
        customerName: customer_name ?? null,
        itemCount:    Array.isArray(parsedItems) ? parsedItems.length : undefined,
      }),
      // Customer receipt — only if we have their email
      customer_email ? sendOrderReceipt({
        db,
        to:           customer_email,
        businessId:   business_id,
        orderId:      newOrder.id,
        customerName: customer_name ?? "there",
        amount:       pi.amount / 100,
        items:        parsedItems,
      }) : Promise.resolve(),
    ]);
  }
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

  const { data: newOrder } = await db.from("orders").insert({
    business_id, customer_id: customerId,
    items: parsedItems, total: amount,
    status: "paid", source: "direct",
    stripe_payment_id: session.payment_intent as string,
  }).select("id").single();

  // ── Notify the business owner (email + SMS) + email customer receipt ──
  if (newOrder?.id) {
    await Promise.allSettled([
      notifyOwnerOfOrder({
        businessId:   business_id,
        orderId:      newOrder.id,
        amount,
        customerName: customer_name ?? null,
        itemCount:    Array.isArray(parsedItems) ? parsedItems.length : undefined,
      }),
      customer_email ? sendOrderReceipt({
        db,
        to:           customer_email,
        businessId:   business_id,
        orderId:      newOrder.id,
        customerName: customer_name ?? "there",
        amount,
        items:        parsedItems,
      }) : Promise.resolve(),
    ]);
  }
}

// ─── Customer receipt helper ────────────────────────────────────────────────
// Small wrapper that fetches the business name + storefront URL so the email
// template has everything it needs. Non-fatal — logs and moves on if anything
// goes wrong.

type OrderItemLike = { name?: string; title?: string; qty?: number; quantity?: number; price?: number; unit_price?: number; amount?: number };

async function sendOrderReceipt(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:           any;
  to:           string;
  businessId:   string;
  orderId:      string;
  customerName: string;
  amount:       number;
  items:        unknown;
}): Promise<void> {
  try {
    const { data: biz } = await args.db
      .from("businesses")
      .select("name, subdomain")
      .eq("id", args.businessId)
      .single();
    if (!biz) return;

    const origin = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const storeUrl = biz.subdomain && origin ? `${origin.replace(/\/$/, "")}/store/${biz.subdomain}` : undefined;

    const rawItems = Array.isArray(args.items) ? args.items as OrderItemLike[] : [];
    const items = rawItems.map(it => ({
      name:  it.name ?? it.title ?? "Item",
      qty:   it.qty ?? it.quantity,
      price: it.price ?? it.unit_price ?? it.amount,
    }));

    await sendCustomerReceipt({
      to:           args.to,
      customerName: args.customerName,
      businessName: biz.name ?? "Your store",
      orderNumber:  args.orderId.slice(0, 8),
      total:        args.amount,
      items,
      storeUrl,
    });
  } catch (err) {
    console.error("[webhook] receipt send failed:", err instanceof Error ? err.message : err);
  }
}

async function handleMerchantOnboarded(account: Stripe.Account) {
  const businessId = account.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // Track onboarding state on dedicated columns (not inside settings JSON) so
  // the Settings page can distinguish "account created" from "onboarding
  // complete" from "payouts blocked". The webhook fires on every account
  // update, so we always write the latest flags.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServerClient() as any)
    .from("businesses")
    .update({
      stripe_account_id:        account.id,
      stripe_charges_enabled:   account.charges_enabled ?? false,
      stripe_payouts_enabled:   account.payouts_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
    })
    .eq("id", businessId);

  console.log(
    `[webhook] Account updated ${businessId} — charges=${account.charges_enabled} payouts=${account.payouts_enabled} details=${account.details_submitted}`
  );
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const businessId = sub.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;

  // Read current settings so we can MERGE rather than overwrite — otherwise
  // the merchant's notify_email / notify_phone / hours / etc. all get wiped
  // every time a subscription event fires.
  const { data: biz } = await db
    .from("businesses")
    .select("settings")
    .eq("id", businessId)
    .single();
  const prev: Record<string, unknown> = (biz?.settings ?? {}) as Record<string, unknown>;

  await db
    .from("businesses")
    .update({
      stripe_customer_id: sub.customer as string,
      settings: {
        ...prev,
        subscription_status:     sub.status,
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      },
    })
    .eq("id", businessId);
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription) {
  const businessId = sub.metadata?.zentrabite_business_id;
  if (!businessId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;

  const { data: biz } = await db
    .from("businesses")
    .select("settings")
    .eq("id", businessId)
    .single();
  const prev: Record<string, unknown> = (biz?.settings ?? {}) as Record<string, unknown>;

  await db
    .from("businesses")
    .update({
      settings: {
        ...prev,
        subscription_status: "cancelled",
      },
    })
    .eq("id", businessId);
}
