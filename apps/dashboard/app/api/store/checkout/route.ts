// POST /api/store/checkout — creates a Stripe checkout session for an order
// placed on a restaurant's public ordering page.
//
// Security and money flow
//   • Prices and names come from the restaurant's menu in the database. The
//     browser only sends item ids, quantities and the ids of the options
//     picked (sizes, extras). Before this, a customer could edit the request
//     and pay any price they liked. Options are checked against the menu, so
//     a required choice can't be skipped and a sold-out one can't be picked.
//   • The payment is taken on the shop's own Stripe account (a Connect
//     direct charge, since 20 Nov 2026). Stripe takes its card fee from the
//     shop, and refunds and chargebacks come out of the shop's balance, not
//     ZentraBite's. If the shop hasn't finished Stripe setup, or still has an
//     old-style account, checkout is refused rather than taking the money
//     anywhere else.
//   • The pick-up time is checked against the shop's opening hours, prep
//     time and pause switch (lib/pickup-times.ts). A closed or paused shop
//     takes no orders, and the Stripe page expires after about half an hour
//     so an old checkout can't be paid hours later.
//   • Delivery by the shop's own drivers (lib/own-delivery.ts) only goes to
//     the suburbs or postcodes the shop lists, over its minimum order, with
//     its flat fee as its own line and its drive time added to the prep time.
//   • Marketing consent is recorded only if the customer ticked the box.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { trustedOrigin } from "@/lib/tenant";
import { isShopAccount } from "@/lib/stripe-connect";
import { lineKey, optionsLabel, priceSelection, readOptions, type ChosenOption } from "@/lib/menu-options";
import { checkPickup, readOrderingRules } from "@/lib/pickup-times";
import { checkDeliveryAddress, cleanNote, readDeliveryRules } from "@/lib/own-delivery";

const MAX_LINES = 50;
const MAX_QTY   = 50;
// Stripe allows 50 metadata keys. Up to 13 are used for the order details,
// so the items get up to 36 chunks.
const MAX_ITEM_CHUNKS = 36;

type RequestItem = { id: string; qty: number; options?: unknown };

// Stripe metadata values are capped at 500 characters, so long carts are
// split across items_0, items_1, ... The webhook joins them back together.
function chunkMetadata(prefix: string, value: string, size = 490): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0, n = 0; i < value.length; i += size, n++) out[`${prefix}_${n}`] = value.slice(i, i + size);
  return out;
}

const clip = (v: unknown, n = 200) => (typeof v === "string" ? v.slice(0, n) : "");

export async function POST(req: Request) {
  try {
    const { subdomain, items, customer, pickup, fulfilment, address, note } = await req.json() as {
      subdomain: string;
      items: RequestItem[];
      customer: { name?: string; phone?: string; email?: string; marketingOptIn?: boolean };
      pickup?: unknown;     // "asap" or the ISO time of an offered slot
      fulfilment?: unknown; // "pickup" (the default) or "delivery"
      address?: unknown;    // { line1, suburb, postcode } for delivery
      note?: unknown;       // for the kitchen or the driver
    };

    if (!subdomain || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "subdomain and items are required" }, { status: 400 });
    }
    if (items.length > MAX_LINES) {
      return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
    }

    // Validate quantities. Lines with the same item and the same options are
    // merged below, once the options have been checked.
    for (const it of items) {
      const qty = Math.floor(Number(it?.qty));
      if (typeof it?.id !== "string" || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }
    }

    const db = createAdminClient();
    const { data: business } = await db
      .from("businesses")
      .select("id, name, subdomain, stripe_account_id, stripe_charges_enabled, settings")
      .eq("subdomain", subdomain)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const connectedAccount = business.stripe_account_id as string | null;
    let chargesEnabled = Boolean(business.stripe_charges_enabled);

    // The flag is normally kept fresh by the account.updated webhook, which
    // needs a Connect webhook endpoint in Stripe. If it's still false, ask
    // Stripe directly and save the answer.
    if (connectedAccount && !chargesEnabled) {
      try {
        const acct = await stripe.accounts.retrieve(connectedAccount);
        chargesEnabled = Boolean(acct.charges_enabled);
        await db.from("businesses").update({
          stripe_charges_enabled:   acct.charges_enabled ?? false,
          stripe_payouts_enabled:   acct.payouts_enabled ?? false,
          stripe_details_submitted: acct.details_submitted ?? false,
        }).eq("id", business.id);
      } catch (err) {
        console.error("[store/checkout] account check failed", err instanceof Error ? err.message : err);
      }
    }

    if (!connectedAccount || !chargesEnabled || !(await isShopAccount(connectedAccount))) {
      return NextResponse.json(
        { error: "This restaurant isn't taking online payments yet. Please order by phone." },
        { status: 409 },
      );
    }

    // Delivery by the shop's own drivers, if it offers it.
    const delivery = readDeliveryRules(business.settings);
    const isDelivery = fulfilment === "delivery";
    let deliveryAddress: string | null = null;
    if (isDelivery) {
      if (!delivery.enabled) {
        return NextResponse.json({ error: "Delivery isn't available right now. You can still pick it up." }, { status: 409 });
      }
      const checked = checkDeliveryAddress(delivery, address);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 409 });
      if (!clip(customer?.phone, 40).trim()) {
        return NextResponse.json({ error: "Please add your phone number so the driver can reach you." }, { status: 400 });
      }
      deliveryAddress = checked.text;
    }

    // Opening hours, prep time and the pause switch. Delivery adds the drive time.
    const rules = readOrderingRules(business.settings);
    const when = checkPickup(isDelivery ? { ...rules, prepMinutes: rules.prepMinutes + delivery.extraMinutes } : rules, pickup);
    if (!when.ok) return NextResponse.json({ error: when.error }, { status: 409 });

    // Real names, prices and options from this restaurant's menu.
    const ids = [...new Set(items.map(it => it.id))];
    const { data: menuItems } = await db
      .from("menu_items")
      .select("id, name, price, available, options")
      .eq("business_id", business.id)
      .in("id", ids);

    const byId = new Map((menuItems ?? []).map(m => [m.id as string, m]));
    type Line = { id: string; name: string; unitPrice: number; qty: number; chosen: ChosenOption[]; choiceIds: string[] };
    const lines = new Map<string, Line>();
    for (const it of items) {
      const m = byId.get(it.id);
      if (!m || m.available === false) {
        return NextResponse.json({ error: "Some items are no longer available. Please refresh the menu." }, { status: 409 });
      }
      const priced = priceSelection(Number(m.price), readOptions(m.options), it.options);
      if (!priced.ok) return NextResponse.json({ error: `${m.name as string}: ${priced.error}` }, { status: 409 });

      const key = lineKey(it.id, priced.choiceIds);
      const qty = Math.floor(Number(it.qty));
      const prev = lines.get(key);
      if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + qty);
      else lines.set(key, { id: it.id, name: m.name as string, unitPrice: priced.unitPrice, qty, chosen: priced.chosen, choiceIds: priced.choiceIds });
    }

    const subtotalCents = [...lines.values()].reduce((s, l) => s + Math.round(l.unitPrice * 100) * l.qty, 0);
    if (isDelivery && subtotalCents < Math.round(delivery.minOrder * 100)) {
      return NextResponse.json(
        { error: `Delivery needs an order of at least $${delivery.minOrder.toFixed(2)} before the delivery fee.` },
        { status: 409 },
      );
    }
    const orderNote = cleanNote(note);

    // Customers come back to the host they ordered on (their name.zentrabite.com
    // or the CRM's /store page). Only our own hosts are trusted.
    const origin = trustedOrigin(req.headers.get("origin"), process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com");
    // What the webhook needs to write the order: the item, how many, the
    // options picked and the price charged (in cents), so the order matches
    // the payment even if the menu changes before the customer pays.
    const compactItems = JSON.stringify([...lines.values()].map(l => ({
      id: l.id, qty: l.qty, p: Math.round(l.unitPrice * 100), ...(l.choiceIds.length ? { o: l.choiceIds } : {}),
    })));
    const itemChunks = chunkMetadata("items", compactItems);
    if (Object.keys(itemChunks).length > MAX_ITEM_CHUNKS) {
      return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
    }

    // Created on the shop's own account (the stripeAccount option), so the
    // customer sees the shop's name and branding at checkout.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [...lines.values()].map(l => ({
        price_data: {
          currency: "aud",
          // Options go in the name, so the customer sees them at checkout,
          // on the success page and on the shop's Stripe receipt.
          product_data: { name: (l.chosen.length ? `${l.name} (${optionsLabel(l.chosen)})` : l.name).slice(0, 250) },
          unit_amount: Math.round(l.unitPrice * 100),
        },
        quantity: l.qty,
      })).concat(isDelivery && delivery.fee > 0 ? [{
        price_data: { currency: "aud", product_data: { name: "Delivery" }, unit_amount: Math.round(delivery.fee * 100) },
        quantity: 1,
      }] : []),
      mode: "payment",
      // Stripe's shortest allowed. A checkout left open can't be paid after
      // the pick-up time has gone or the shop has closed.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      customer_email: clip(customer?.email) || undefined,
      // No ZentraBite fee on orders yet. If Liam decides on one, it goes here
      // as payment_intent_data.application_fee_amount, and must cover only
      // ZentraBite's own fee, because Stripe takes its fee from the shop.
      success_url: `${origin}/store/${business.subdomain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/store/${business.subdomain}`,
      metadata: {
        business_id:      business.id as string,
        subdomain:        business.subdomain as string,
        customer_name:    clip(customer?.name),
        customer_phone:   clip(customer?.phone, 40),
        customer_email:   clip(customer?.email),
        marketing_opt_in: customer?.marketingOptIn === true ? "1" : "0",
        source:           "storefront",
        pickup_at:        when.pickupAt.toISOString(),
        pickup_asap:      when.asap ? "1" : "0",
        fulfillment_type: isDelivery ? "delivery" : "pickup",
        ...(deliveryAddress ? { delivery_address: deliveryAddress, delivery_fee: delivery.fee.toFixed(2) } : {}),
        ...(orderNote ? { note: orderNote } : {}),
        ...itemChunks,
      },
    }, { stripeAccount: connectedAccount });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/checkout]", message);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
