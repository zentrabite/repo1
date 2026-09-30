// ─── POST /api/stripe/webhook ────────────────────────────────────────────────
// Receives and verifies Stripe webhook events.
// Uses the service role Supabase client — bypasses RLS to write data.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { notifyOwnerOfOrder } from "@/lib/notify";
import { sendCustomerReceipt } from "@/lib/email";
import { normaliseAuPhone } from "@/lib/sms";

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

  // Two endpoints can point here: the platform endpoint (STRIPE_WEBHOOK_SECRET)
  // and a Connect endpoint for connected-account events such as
  // account.updated (STRIPE_CONNECT_WEBHOOK_SECRET). Accept either signature.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET]
    .filter((s): s is string => Boolean(s));
  let event: Stripe.Event | null = null;
  let lastError = "Verification failed";
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Verification failed";
    }
  }
  if (!event) {
    console.error("[webhook] Verification failed:", lastError);
    return NextResponse.json({ error: lastError }, { status: 400 });
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

  // ── Find or create the customer ────────────────────────────────────────
  // Totals and points are added by the on_order_update_customer trigger when
  // the order is inserted below, so they aren't touched here.
  let customerId: string | null = null;

  if (customer_phone) {
    const phone = normaliseAuPhone(customer_phone);
    const { data: existing } = await db
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCustomer } = await db.from("customers").insert({
        business_id,
        name:            customer_name ?? "Unknown",
        phone,
        email:           customer_email ?? null,
        source:          "direct",
        segment:         "New",
        first_order:     new Date().toISOString(),
        total_orders:    0,
        total_spent:     0,
        points_balance:  0,
      }).select("id").single();
      customerId = newCustomer?.id ?? null;
    }
  }

  // ── Create order ───────────────────────────────────────────────────────
  const parsedItems = items ? JSON.parse(items) : [];
  const { data: newOrder, error: orderErr } = await db.from("orders").insert({
    business_id,
    customer_id:       customerId,
    items:             parsedItems,
    total:             pi.amount / 100,
    status:            "New",
    source:            "direct",
    stripe_payment_id: pi.id,
  }).select("id").single();
  if (orderErr) {
    if (orderErr.code === "23505") return; // duplicate event
    throw new Error(`order insert failed: ${orderErr.message}`);
  }

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
  const meta = session.metadata ?? {};
  const {
    business_id, customer_name, customer_phone, customer_email, items, source,
    fulfillment_type, delivery_address, delivery_fee,
  } = meta;
  if (!business_id || source !== "storefront") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;
  const amount = (session.amount_total ?? 0) / 100;
  const marketingOptIn = meta.marketing_opt_in === "1";

  // Items: new checkouts send compact [{id, qty}] split over items_0, items_1…
  // (Stripe metadata values max out at 500 chars). Names and prices are read
  // back from the menu. Older sessions sent full items in "items".
  const chunkKeys = Object.keys(meta).filter(k => /^items_\d+$/.test(k))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  let parsedItems: unknown[] = [];
  if (chunkKeys.length > 0) {
    const compact = JSON.parse(chunkKeys.map(k => meta[k]).join("")) as { id: string; qty: number }[];
    const { data: menuRows } = await db.from("menu_items").select("id, name, price")
      .eq("business_id", business_id).in("id", compact.map(c => c.id));
    const byId = new Map((menuRows ?? []).map((m: { id: string; name: string; price: number }) => [m.id, m]));
    parsedItems = compact.map(c => {
      const m = byId.get(c.id) as { name: string; price: number } | undefined;
      return { id: c.id, name: m?.name ?? "Item", price: Number(m?.price ?? 0), qty: c.qty };
    });
  } else if (items) {
    parsedItems = JSON.parse(items);
  }

  // ── Find or create the customer ────────────────────────────────────────
  // Totals, points, segment and last order date are NOT set here. The
  // on_order_update_customer trigger adds them when the order is inserted
  // (migration 005). Setting them here as well counted every order twice.
  // Phones are saved in one format (+614...) so STOP replies match later.
  const phone = customer_phone ? normaliseAuPhone(customer_phone) : "";
  let customerId: string | null = null;
  if (phone || customer_email) {
    const matchField = phone ? "phone" : "email";
    const matchValue = phone || customer_email;
    const { data: existing } = await db.from("customers").select("id")
      .eq("business_id", business_id).eq(matchField, matchValue).maybeSingle();

    // Consent is only ever switched ON here, and only from the tick box.
    // Withdrawing consent happens through STOP or the unsubscribe link.
    const consent = marketingOptIn
      ? { marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString(), marketing_opt_in_source: "checkout" }
      : {};

    if (existing) {
      if (marketingOptIn) await db.from("customers").update(consent).eq("id", existing.id);
      customerId = existing.id;
    } else {
      const { data: newCust, error: custErr } = await db.from("customers").insert({
        business_id, name: customer_name || "Customer",
        phone: phone || null, email: customer_email || null,
        source: "direct", segment: "New",
        first_order: new Date().toISOString(),
        total_orders: 0, total_spent: 0, points_balance: 0,
        ...consent,
      }).select("id").single();
      if (custErr) throw new Error(`customer insert failed: ${custErr.message}`);
      customerId = newCust?.id ?? null;
    }
  }

  // ── Create the order ───────────────────────────────────────────────────
  // orders.stripe_payment_id is unique (migration 015). If Stripe delivers
  // this event twice, the second insert fails with 23505 and we stop. Any
  // other failure throws, so the handler returns 500 and Stripe retries
  // instead of the order being lost.
  const orderRecord: Record<string, unknown> = {
    business_id,
    customer_id:       customerId,
    items:             parsedItems,
    total:             amount,
    status:            "New",
    source:            "direct",
    stripe_payment_id: (session.payment_intent as string | null) ?? session.id,
    fulfillment_type:  fulfillment_type ?? "pickup",
    placed_at:         new Date().toISOString(),
  };
  if (fulfillment_type === "delivery") {
    if (delivery_address) orderRecord.ship_to      = { address: delivery_address };
    if (delivery_fee)     orderRecord.delivery_fee = parseFloat(delivery_fee);
  }

  const { data: newOrder, error: orderErr } = await db.from("orders").insert(orderRecord).select("id").single();
  if (orderErr) {
    if (orderErr.code === "23505") {
      console.log(`[webhook] duplicate event for ${orderRecord.stripe_payment_id}, skipped`);
      return;
    }
    throw new Error(`order insert failed: ${orderErr.message}`);
  }

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
