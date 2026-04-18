// POST /api/store/checkout — creates a Stripe checkout session for a storefront order
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { subdomain, items, customer } = await req.json() as {
      subdomain: string;
      items: { id: string; name: string; price: number; qty: number }[];
      customer: { name: string; phone: string; email: string };
    };

    if (!subdomain || !items?.length) {
      return NextResponse.json({ error: "subdomain and items are required" }, { status: 400 });
    }

    const db = createServerClient();
    const { data: business } = await db
      .from("businesses")
      .select("id, name, subdomain, stripe_account_id")
      .eq("subdomain", subdomain)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://repo1-dashboard.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map(item => ({
        price_data: {
          currency: "aud",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),
      mode: "payment",
      customer_email: customer.email || undefined,
      success_url: `${origin}/store/${subdomain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/store/${subdomain}`,
      metadata: {
        business_id:    business.id,
        subdomain,
        customer_name:  customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        items:          JSON.stringify(items),
        source:         "storefront",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
