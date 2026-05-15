// ─── POST /api/stripe/portal ──────────────────────────────────────────────────
// Creates a Stripe Billing Portal session so the merchant can update payment
// methods, view invoices, change plan, or cancel — all hosted by Stripe.
//
// We look up the merchant's stripe_customer_id from their business row. If
// they don't have one yet (i.e. they've never subscribed), we redirect them
// to /api/stripe/checkout instead.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSessionClient, createAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    // Authenticate
    const session = await createSessionClient();
    const { data: userRes } = await session.auth.getUser();
    if (!userRes?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: userRow } = await session
      .from("users")
      .select("business_id")
      .eq("id", userRes.user.id)
      .single();

    const businessId = userRow?.business_id as string | undefined;
    if (!businessId) {
      return NextResponse.json({ error: "No business" }, { status: 403 });
    }

    // Find their Stripe customer ID
    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", businessId)
      .single();

    const customerId = (business as any)?.stripe_customer_id as string | undefined;

    if (!customerId) {
      // They don't have a Stripe customer yet — direct them to start checkout
      return NextResponse.json(
        {
          error: "No subscription yet",
          redirect: "/settings?subscription=start",
        },
        { status: 404 },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", typescript: true });
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com";

    const portal = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/portal]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
