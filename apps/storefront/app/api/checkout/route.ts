// ─── POST /api/checkout ───────────────────────────────────────────────────────
// Creates a Stripe Checkout session for a customer order.
// On success Stripe redirects to /order-confirmed?session_id=xxx
// The dashboard webhook (payment_intent.succeeded) then creates the order in Supabase.

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion:"2024-06-20", typescript:true });

export async function POST(req: Request) {
  try {
    const { cart, customer, businessId } = await req.json() as {
      cart:       { id:string; name:string; price:number; qty:number }[];
      customer:   { name:string; phone:string; email:string };
      businessId: string;
    };

    if (!cart?.length) return NextResponse.json({ error:"Empty cart" }, { status:400 });
    if (!businessId)   return NextResponse.json({ error:"Missing businessId" }, { status:400 });

    const origin = req.headers.get("origin") ?? "http://localhost:3001";

    const session = await stripe.checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      customer_email:       customer.email || undefined,
      line_items: cart.map(item => ({
        quantity:    item.qty,
        price_data: {
          currency:     "aud",
          unit_amount:  Math.round(item.price * 100),  // Stripe uses cents
          product_data: { name: item.name },
        },
      })),
      // Metadata flows through to the payment_intent.succeeded webhook
      // which creates the order + customer record in Supabase
      payment_intent_data: {
        metadata: {
          business_id:     businessId,
          customer_name:   customer.name,
          customer_phone:  customer.phone,
          customer_email:  customer.email,
          items:           JSON.stringify(cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty }))),
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
