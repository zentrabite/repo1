// ─── POST /api/checkout ───────────────────────────────────────────────────────
// Creates a Stripe Checkout session for a customer order.
// On success Stripe redirects to /order-confirmed?session_id=xxx
// The dashboard webhook (checkout.session.completed) then creates the order
// in Supabase using the metadata below.

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion:"2024-06-20", typescript:true });

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      cart:             { id:string; name:string; price:number; qty:number }[];
      customer:         { name:string; phone:string; email:string };
      businessId:       string;
      // Optional delivery fields
      fulfillmentType?: "pickup" | "delivery";
      deliveryAddress?: string;
      deliveryFee?:     number;
      deliveryTier?:    "standard" | "priority";
    };

    const { cart, customer, businessId, fulfillmentType, deliveryAddress, deliveryFee, deliveryTier } = body;

    if (!cart?.length) return NextResponse.json({ error:"Empty cart" },       { status:400 });
    if (!businessId)   return NextResponse.json({ error:"Missing businessId" }, { status:400 });

    const origin = req.headers.get("origin") ?? "http://localhost:3001";

    // ── Build line items — menu items + optional delivery fee line ────────
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.map(item => ({
      quantity:    item.qty,
      price_data: {
        currency:     "aud",
        unit_amount:  Math.round(item.price * 100),
        product_data: { name: item.name },
      },
    }));

    if (fulfillmentType === "delivery" && deliveryFee && deliveryFee > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency:     "aud",
          unit_amount:  Math.round(deliveryFee * 100),
          product_data: {
            name:        "Delivery fee",
            description: deliveryTier === "priority" ? "Priority delivery" : "Standard delivery",
          },
        },
      });
    }

    // ── Stripe session ────────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      customer_email:       customer.email || undefined,
      line_items:           lineItems,
      // Full metadata flows through to checkout.session.completed webhook
      // which creates the order + customer record in Supabase
      metadata: {
        source:           "storefront",
        business_id:      businessId,
        customer_name:    customer.name,
        customer_phone:   customer.phone,
        customer_email:   customer.email,
        items:            JSON.stringify(cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty }))),
        fulfillment_type: fulfillmentType ?? "pickup",
        delivery_address: deliveryAddress ?? "",
        delivery_fee:     deliveryFee ? String(deliveryFee) : "",
        delivery_tier:    deliveryTier ?? "",
      },
      // Keep metadata on the PaymentIntent as well (used by payment_intent.succeeded handler)
      payment_intent_data: {
        metadata: {
          business_id:      businessId,
          customer_name:    customer.name,
          customer_phone:   customer.phone,
          customer_email:   customer.email,
          items:            JSON.stringify(cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty }))),
          fulfillment_type: fulfillmentType ?? "pickup",
          delivery_address: deliveryAddress ?? "",
          delivery_fee:     deliveryFee ? String(deliveryFee) : "",
          delivery_tier:    deliveryTier ?? "",
        },
      },
      success_url: `${origin}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout]", message);
    return NextResponse.json({ error: message }, { status:500 });
  }
}
