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
import { orderUrl } from "@/lib/tenant";
import { optionsLabel, readOptions, type ChosenOption } from "@/lib/menu-options";
import { pickupLabel, readOrderingRules } from "@/lib/pickup-times";
import { saveRefunded } from "@/lib/refunds";

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

  // Two endpoints point here. The platform endpoint (STRIPE_WEBHOOK_SECRET)
  // sends ZentraBite's own events, like shop subscriptions. The Connect
  // endpoint (STRIPE_CONNECT_WEBHOOK_SECRET) sends events from each shop's own
  // Stripe account: account.updated, and since 20 Nov 2026 the customer
  // orders, because they're taken on the shop's account. Those events carry
  // event.account, the shop's Stripe account id. Accept either signature.
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
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.account ?? null);
        break;
      case "account.updated":
        await handleMerchantOnboarded(event.data.object as Stripe.Account);
        break;
      case "charge.refunded":
      case "refund.failed":
        await handleRefundChange(event.data.object as Stripe.Charge | Stripe.Refund, event.account ?? null);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventAccount: string | null) {
  const meta = session.metadata ?? {};
  const {
    business_id, customer_name, customer_phone, customer_email, items, source,
    fulfillment_type, delivery_address, delivery_fee, note,
  } = meta;
  if (!business_id || source !== "storefront") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;

  // ── Only the shop's own Stripe account can create its orders ───────────
  // Orders are paid on the shop's account, so the event must come from that
  // account. Each shop has its own full Stripe Dashboard and API keys, so a
  // shop could make a payment with another shop's business_id in its
  // metadata. Matching event.account to the shop's saved account stops that.
  // An order event from ZentraBite's own account is refused too, because
  // storefront orders are never paid there any more.
  const { data: owner } = await db.from("businesses").select("stripe_account_id, settings")
    .eq("id", business_id).maybeSingle();
  if (!eventAccount || !owner?.stripe_account_id || owner.stripe_account_id !== eventAccount) {
    console.warn(`[webhook] order for ${business_id} refused, it came from ${eventAccount ?? "the platform account"}`);
    return;
  }

  // Cards are confirmed before Checkout completes, so this is "paid". Anything
  // else (a delayed payment method) waits for its own event, not handled yet.
  if (session.payment_status !== "paid") {
    console.log(`[webhook] checkout ${session.id} not paid yet (${session.payment_status}), skipped`);
    return;
  }
  const amount = (session.amount_total ?? 0) / 100;
  const marketingOptIn = meta.marketing_opt_in === "1";

  // When the customer will pick it up, checked at checkout. Older sessions
  // have none.
  const pickupMs = meta.pickup_at ? Date.parse(meta.pickup_at) : NaN;
  const pickupAt = Number.isFinite(pickupMs) ? new Date(pickupMs) : null;
  const pickupAsap = meta.pickup_asap === "1";
  const pickupText = pickupAt ? pickupLabel(pickupAt, pickupAsap, readOrderingRules(owner?.settings).timezone) : null;

  // Items: checkouts send compact [{id, qty, p, o}] split over items_0,
  // items_1… (Stripe metadata values max out at 500 chars). p is the unit
  // price charged in cents and o the ids of the options picked. Names come
  // from the menu. Older sessions sent [{id, qty}] (price from the menu) or
  // full items in "items".
  const chunkKeys = Object.keys(meta).filter(k => /^items_\d+$/.test(k))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  let parsedItems: unknown[] = [];
  if (chunkKeys.length > 0) {
    const compact = JSON.parse(chunkKeys.map(k => meta[k]).join("")) as { id: string; qty: number; p?: number; o?: string[] }[];
    const { data: menuRows } = await db.from("menu_items").select("id, name, price, options")
      .eq("business_id", business_id).in("id", compact.map(c => c.id));
    type MenuRow = { id: string; name: string; price: number; options: unknown };
    const byId = new Map<string, MenuRow>((menuRows ?? []).map((m: MenuRow) => [m.id, m]));
    parsedItems = compact.map(c => {
      const m = byId.get(c.id);
      const groups = readOptions(m?.options);
      const options: ChosenOption[] = [];
      for (const g of groups) {
        for (const choice of g.choices) {
          if (c.o?.includes(choice.id)) options.push({ group: g.name, name: choice.name, price: choice.price });
        }
      }
      const price = typeof c.p === "number"
        ? c.p / 100
        : (Math.round(Number(m?.price ?? 0) * 100) + options.reduce((s, o) => s + Math.round(o.price * 100), 0)) / 100;
      return { id: c.id, name: m?.name ?? "Item", price, qty: c.qty, ...(options.length ? { options } : {}) };
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
    pickup_at:         pickupAt ? pickupAt.toISOString() : null,
    pickup_asap:       pickupAsap,
    notes:             note ? note.slice(0, 500) : null,
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
        pickupLabel:  pickupText,
        delivery:     fulfillment_type === "delivery",
        deliveryAddress: fulfillment_type === "delivery" ? delivery_address ?? null : null,
        note:         note ?? null,
      }),
      customer_email ? sendOrderReceipt({
        db,
        to:           customer_email,
        businessId:   business_id,
        orderId:      newOrder.id,
        customerName: customer_name ?? "there",
        amount,
        items:        parsedItems,
        pickupLabel:  pickupText,
        delivery:     fulfillment_type === "delivery",
        deliveryAddress: fulfillment_type === "delivery" ? delivery_address ?? null : null,
        note:         note ?? null,
      }) : Promise.resolve(),
    ]);
  }
}

// ─── Customer receipt helper ────────────────────────────────────────────────
// Small wrapper that fetches the business name + storefront URL so the email
// template has everything it needs. Non-fatal — logs and moves on if anything
// goes wrong.

type OrderItemLike = { name?: string; title?: string; qty?: number; quantity?: number; price?: number; unit_price?: number; amount?: number; options?: { name: string }[] };

async function sendOrderReceipt(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:           any;
  to:           string;
  businessId:   string;
  orderId:      string;
  customerName: string;
  amount:       number;
  items:        unknown;
  pickupLabel:  string | null;
  delivery:     boolean;
  deliveryAddress: string | null;
  note:         string | null;
}): Promise<void> {
  try {
    const { data: biz } = await args.db
      .from("businesses")
      .select("name, subdomain")
      .eq("id", args.businessId)
      .single();
    if (!biz) return;

    const storeUrl = biz.subdomain ? orderUrl(biz.subdomain) : undefined;

    const rawItems = Array.isArray(args.items) ? args.items as OrderItemLike[] : [];
    const items = rawItems.map(it => ({
      name:  `${it.name ?? it.title ?? "Item"}${it.options?.length ? ` (${optionsLabel(it.options)})` : ""}`,
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
      pickupLabel:  args.pickupLabel ?? undefined,
      delivery:     args.delivery,
      deliveryAddress: args.deliveryAddress ?? undefined,
      note:         args.note ?? undefined,
    });
  } catch (err) {
    console.error("[webhook] receipt send failed:", err instanceof Error ? err.message : err);
  }
}

// ─── Refunds ─────────────────────────────────────────────────────────────────
// charge.refunded comes when money goes back on an order, from the refund
// button or from the shop's own Stripe Dashboard. refund.failed comes in the
// rare case a refund fails later and Stripe gives the money back to the shop.
// Both read the payment fresh from Stripe and save the total refunded, so
// events arriving out of order or twice can't leave the wrong amount.
// Both are Connect events, from the shop's account.

async function handleRefundChange(obj: Stripe.Charge | Stripe.Refund, eventAccount: string | null) {
  if (!eventAccount) return; // ZentraBite's own payments (subscriptions) aren't orders
  const chargeId = obj.object === "charge" ? obj.id : typeof obj.charge === "string" ? obj.charge : obj.charge?.id;
  const intentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
  if (!chargeId || !intentId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;
  const { data: order } = await db.from("orders")
    .select("id, business_id, status, refunded_amount")
    .eq("stripe_payment_id", intentId).maybeSingle();
  if (!order) return;

  // Only the shop's own account can change its order.
  const { data: owner } = await db.from("businesses").select("stripe_account_id")
    .eq("id", order.business_id).maybeSingle();
  if (!owner?.stripe_account_id || owner.stripe_account_id !== eventAccount) {
    console.warn(`[webhook] refund for order ${order.id} refused, it came from ${eventAccount}`);
    return;
  }

  const charge = await stripe.charges.retrieve(chargeId, {}, { stripeAccount: eventAccount });
  const saved = await saveRefunded(db, order, charge.amount_refunded, charge.amount);
  if (saved.changed) console.log(`[webhook] order ${order.id} refunded $${saved.refunded_amount.toFixed(2)} in all`);
}

async function handleMerchantOnboarded(account: Stripe.Account) {
  // The business id is in the account's metadata. If it's ever missing, find
  // the business by its saved Stripe account id instead.
  let businessId = account.metadata?.zentrabite_business_id ?? null;
  if (!businessId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createServerClient() as any).from("businesses").select("id")
      .eq("stripe_account_id", account.id).maybeSingle();
    businessId = data?.id ?? null;
  }
  if (!businessId) return;

  // Track onboarding state on dedicated columns (not inside settings JSON) so
  // the Settings page can distinguish "account created" from "onboarding
  // complete" from "payouts blocked". The webhook fires on every account
  // update, so we always write the latest flags.
  // Only the account saved on the business can change its flags. An old
  // account that was replaced, or any account carrying another business's id,
  // can't overwrite the saved one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServerClient() as any)
    .from("businesses")
    .update({
      stripe_charges_enabled:   account.charges_enabled ?? false,
      stripe_payouts_enabled:   account.payouts_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
    })
    .eq("id", businessId)
    .eq("stripe_account_id", account.id);

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

  // Since Stripe's 2025-03-31 API the billing period sits on each subscription
  // item, not on the subscription. There's one item (the plan), so read its
  // end. Reading the old field gave undefined, and toISOString() then threw,
  // so every subscription event failed.
  const periodEnd = sub.items?.data?.[0]?.current_period_end;

  await db
    .from("businesses")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      settings: {
        ...prev,
        subscription_status: sub.status,
        ...(typeof periodEnd === "number"
          ? { subscription_period_end: new Date(periodEnd * 1000).toISOString() }
          : {}),
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
