// POST /api/store/checkout — creates a Stripe checkout session for an order
// placed on a restaurant's public ordering page.
//
// Security and money flow
//   • Prices and names come from the restaurant's menu in the database. The
//     browser only sends item ids and quantities. Before this, a customer
//     could edit the request and pay any price they liked.
//   • The payment is taken on the shop's own Stripe account (a Connect
//     direct charge, since 20 Nov 2026). Stripe takes its card fee from the
//     shop, and refunds and chargebacks come out of the shop's balance, not
//     ZentraBite's. If the shop hasn't finished Stripe setup, or still has an
//     old-style account, checkout is refused rather than taking the money
//     anywhere else.
//   • Marketing consent is recorded only if the customer ticked the box.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { trustedOrigin } from "@/lib/tenant";
import { isShopAccount } from "@/lib/stripe-connect";

const MAX_LINES = 50;
const MAX_QTY   = 50;

type RequestItem = { id: string; qty: number };

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
    const { subdomain, items, customer } = await req.json() as {
      subdomain: string;
      items: RequestItem[];
      customer: { name?: string; phone?: string; email?: string; marketingOptIn?: boolean };
    };

    if (!subdomain || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "subdomain and items are required" }, { status: 400 });
    }
    if (items.length > MAX_LINES) {
      return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
    }

    // Merge duplicate lines and validate quantities.
    const qtyById = new Map<string, number>();
    for (const it of items) {
      const qty = Math.floor(Number(it?.qty));
      if (typeof it?.id !== "string" || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }
      qtyById.set(it.id, Math.min(MAX_QTY, (qtyById.get(it.id) ?? 0) + qty));
    }

    const db = createAdminClient();
    const { data: business } = await db
      .from("businesses")
      .select("id, name, subdomain, stripe_account_id, stripe_charges_enabled")
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

    // Real names and prices from this restaurant's menu.
    const ids = [...qtyById.keys()];
    const { data: menuItems } = await db
      .from("menu_items")
      .select("id, name, price, available")
      .eq("business_id", business.id)
      .in("id", ids);

    const byId = new Map((menuItems ?? []).map(m => [m.id as string, m]));
    const lines: { id: string; name: string; price: number; qty: number }[] = [];
    for (const id of ids) {
      const m = byId.get(id);
      if (!m || m.available === false) {
        return NextResponse.json({ error: "Some items are no longer available. Please refresh the menu." }, { status: 409 });
      }
      lines.push({ id, name: m.name as string, price: Number(m.price), qty: qtyById.get(id)! });
    }

    // Customers come back to the host they ordered on (their name.zentrabite.com
    // or the CRM's /store page). Only our own hosts are trusted.
    const origin = trustedOrigin(req.headers.get("origin"), process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com");
    const compactItems = JSON.stringify(lines.map(l => ({ id: l.id, qty: l.qty })));

    // Created on the shop's own account (the stripeAccount option), so the
    // customer sees the shop's name and branding at checkout.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lines.map(l => ({
        price_data: {
          currency: "aud",
          product_data: { name: l.name },
          unit_amount: Math.round(l.price * 100),
        },
        quantity: l.qty,
      })),
      mode: "payment",
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
        ...chunkMetadata("items", compactItems),
      },
    }, { stripeAccount: connectedAccount });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/checkout]", message);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
