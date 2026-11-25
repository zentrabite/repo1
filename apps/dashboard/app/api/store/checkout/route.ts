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
//   • A first order offer (lib/first-order.ts), if the shop runs one, comes
//     off as a one-use coupon on the shop's account. Checkout decides who
//     gets it from the mobile number, never the browser.
//   • A win-back code from the link (lib/offer-codes.ts) is checked here and
//     comes off the same way, instead of the first order offer. A used or
//     ended code stops the checkout with the reason. Only one checkout can
//     hold a code: a newer one ends the older Stripe page first.
//   • Where the order came from (?src= on the link, or a code) goes to the
//     webhook as came_from.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { trustedOrigin } from "@/lib/tenant";
import { isShopAccount } from "@/lib/stripe-connect";
import { lineKey, optionsLabel, priceSelection, readOptions, type ChosenOption } from "@/lib/menu-options";
import { checkPickup, readOrderingRules } from "@/lib/pickup-times";
import { checkDeliveryAddress, cleanNote, readDeliveryRules } from "@/lib/own-delivery";
import { firstOrderDiscount, readFirstOrderOffer } from "@/lib/first-order";
import { cameFrom, checkCode, cleanCode, codeDiscount, type CodeCheck } from "@/lib/offer-codes";
import { signCheckout } from "@/lib/checkout-signature";
import { checkoutAllowed } from "@/lib/checkout-limit";

const MAX_LINES = 50;
const MAX_QTY   = 50;
// Stripe allows 50 metadata keys. Up to 17 are used for the order details
// and 2 for our signature (lib/checkout-signature.ts), so the items get up to
// 31 chunks.
const MAX_ITEM_CHUNKS = 31;

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
    const { subdomain, items, customer, pickup, fulfilment, address, note, code: rawCode, src, ph } = await req.json() as {
      subdomain: string;
      items: RequestItem[];
      customer: { name?: string; phone?: string; email?: string; marketingOptIn?: boolean };
      pickup?: unknown;     // "asap" or the ISO time of an offered slot
      fulfilment?: unknown; // "pickup" (the default) or "delivery"
      address?: unknown;    // { line1, suburb, postcode } for delivery
      note?: unknown;       // for the kitchen or the driver
      code?: unknown;       // a win-back offer code from the link
      src?: unknown;        // where the link came from, e.g. "counter"
      ph?: unknown;         // the visit's random analytics id (lib/analytics.ts), when counting is on
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

    // A limit on checkouts started, before any call to Stripe (lib/checkout-limit.ts).
    const limit = await checkoutAllowed(db, business.id as string, req.headers);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many checkouts started. Wait a few minutes and try again, or order by phone." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

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

    // A win-back code from the link. A bad one stops here with the reason,
    // rather than quietly charging full price.
    let codeCheck: Extract<CodeCheck, { ok: true }> | null = null;
    if (rawCode !== undefined && rawCode !== null && rawCode !== "") {
      const code = cleanCode(rawCode);
      const checked = code ? await checkCode(db, business.id as string, code) : { ok: false as const, error: "That offer code isn't one of ours. Check the link in your message." };
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 409 });
      codeCheck = checked;
    }
    const codeOff = codeCheck ? codeDiscount(codeCheck.offer, subtotalCents, isDelivery ? Math.round(delivery.fee * 100) : 0) : null;
    const usingCode = Boolean(codeCheck && codeOff && codeOff.cents > 0);

    // Otherwise the shop's first order offer, if this is the customer's first
    // online order here. Worked out on the items only, never the delivery fee.
    const discount = usingCode && codeOff
      ? codeOff
      : await firstOrderDiscount(db, business.id as string, readFirstOrderOffer(business.settings), customer?.phone, subtotalCents);

    // Only one checkout at a time can use a code. If another one is still
    // open (the customer went back and changed their order), end it first.
    if (usingCode && codeCheck) {
      const { held_session: heldBy, held_until: heldUntil } = codeCheck.row;
      if (heldBy && heldUntil && Date.parse(heldUntil) > Date.now()) {
        const other = await endOtherCheckout(heldBy, connectedAccount);
        if (other === "paid") return NextResponse.json({ error: "That offer code has already been used." }, { status: 409 });
        if (other === "busy") return NextResponse.json({ error: "That offer code is open in another checkout. Try again in a few minutes." }, { status: 409 });
      }
    }

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

    // A one-use coupon on the shop's account, so Stripe shows the discount on
    // the checkout page and the receipt. It stops working soon after the
    // checkout would have expired, so unused ones don't pile up.
    const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
    const coupon = discount.cents > 0
      ? await stripe.coupons.create({
          amount_off: discount.cents, currency: "aud", duration: "once", max_redemptions: 1,
          redeem_by: expiresAt + 5 * 60, name: usingCode && codeCheck ? `Offer code ${codeCheck.row.code}` : "First order offer",
        }, { stripeAccount: connectedAccount })
      : null;

    const metadata: Record<string, string> = {
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
      ...(coupon && !usingCode ? { first_order_discount: (discount.cents / 100).toFixed(2) } : {}),
      ...(coupon && usingCode && codeCheck ? { offer_code: codeCheck.row.code, offer_discount: (discount.cents / 100).toFixed(2) } : {}),
      came_from:        cameFrom(src, Boolean(codeCheck)),
      // Lets the paid order join the visit in PostHog. Random, never personal.
      ...(typeof ph === "string" && /^anon-[0-9a-f-]{36}$/.test(ph) ? { ph } : {}),
      ...itemChunks,
    };
    // Signed so the webhook only takes checkouts this server made. Good until
    // 10 minutes after the checkout ends.
    const signed = await signCheckout(db, metadata, expiresAt + 10 * 60);
    if (!signed) {
      console.error("[checkout] couldn't sign the checkout (link_signing_secret, migration 035)");
      return NextResponse.json({ error: "Online ordering isn't working right now. Please try again in a minute." }, { status: 503 });
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
      expires_at: expiresAt,
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      customer_email: clip(customer?.email) || undefined,
      // No ZentraBite fee on orders yet. If Liam decides on one, it goes here
      // as payment_intent_data.application_fee_amount, and must cover only
      // ZentraBite's own fee, because Stripe takes its fee from the shop.
      success_url: `${origin}/store/${business.subdomain}/success?session_id={CHECKOUT_SESSION_ID}`,
      // Going back keeps the offer code and where they came from.
      cancel_url:  `${origin}/store/${business.subdomain}${backQuery(codeCheck?.row.code ?? null, cameFrom(src, false))}`,
      metadata: signed,
    }, { stripeAccount: connectedAccount });

    // Hold the code for this checkout. If another checkout took it in the
    // meantime, this one ends and the customer is told.
    if (usingCode && codeCheck) {
      const prev = codeCheck.row.held_session;
      let claim = db.from("offer_codes")
        .update({ held_session: session.id, held_until: new Date(expiresAt * 1000).toISOString() })
        .eq("id", codeCheck.row.id).is("redeemed_at", null);
      claim = prev ? claim.eq("held_session", prev) : claim.is("held_session", null);
      const { data: claimed } = await claim.select("id");
      if (!Array.isArray(claimed) || claimed.length === 0) {
        try { await stripe.checkout.sessions.expire(session.id, {}, { stripeAccount: connectedAccount }); } catch { /* it expires by itself in half an hour */ }
        return NextResponse.json({ error: "That offer code is open in another checkout. Try again in a few minutes." }, { status: 409 });
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/checkout]", message);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}

/**
 * Ends another open checkout that holds the same offer code. "freed" when
 * it's ended (or had already), "paid" when it was paid, "busy" when Stripe
 * couldn't say.
 */
async function endOtherCheckout(sessionId: string, account: string): Promise<"freed" | "paid" | "busy"> {
  try {
    await stripe.checkout.sessions.expire(sessionId, {}, { stripeAccount: account });
    return "freed";
  } catch {
    try {
      const other = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: account });
      if (other.status === "complete") return "paid";
      if (other.status === "expired") return "freed";
    } catch { /* fall through */ }
    return "busy";
  }
}

/** "?code=K7MP4QXA&src=winback" for the way back from Stripe, or "". */
function backQuery(code: string | null, from: string): string {
  const q = new URLSearchParams();
  if (code) q.set("code", code);
  if (from !== "direct") q.set("src", from);
  else if (code) q.set("src", "winback");
  const s = q.toString();
  return s ? `?${s}` : "";
}
