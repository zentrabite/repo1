// GET /api/store/session?session_id=xxx&subdomain=yyy — returns order details
// for the success page.
//
// Since 20 Nov 2026 the checkout session lives on the shop's own Stripe
// account, so the shop is looked up from the subdomain and the session is read
// from that account.
//
// Items come from Stripe's own line items (what the customer actually paid
// for), not from metadata.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { pickupLabel, readOrderingRules } from "@/lib/pickup-times";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    const subdomain = searchParams.get("subdomain");

    if (!sessionId || !sessionId.startsWith("cs_") || !subdomain) {
      return NextResponse.json({ error: "session_id and subdomain required" }, { status: 400 });
    }

    const { data: business } = await createAdminClient()
      .from("businesses")
      .select("stripe_account_id, settings")
      .eq("subdomain", subdomain)
      .single();
    const stripeAccount = business?.stripe_account_id as string | null | undefined;
    if (!stripeAccount) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const [session, lineItems] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount }),
      stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 }, { stripeAccount }),
    ]);

    const items = lineItems.data.map(li => {
      const qty = li.quantity ?? 1;
      return {
        name:  li.description ?? "Item",
        qty,
        price: qty > 0 ? (li.amount_total ?? 0) / 100 / qty : 0,
      };
    });
    const total = (session.amount_total ?? 0) / 100;
    const customerEmail = session.customer_details?.email ?? session.metadata?.customer_email ?? null;
    const customerName  = session.customer_details?.name  ?? session.metadata?.customer_name  ?? null;
    const pickupMs = session.metadata?.pickup_at ? Date.parse(session.metadata.pickup_at) : NaN;
    const pickup = Number.isFinite(pickupMs)
      ? pickupLabel(new Date(pickupMs), session.metadata?.pickup_asap === "1", readOrderingRules(business?.settings).timezone)
      : null;

    return NextResponse.json({ items, total, customer_email: customerEmail, customer_name: customerName, pickup });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/session]", message);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
