// GET /api/store/session?session_id=xxx — returns order details for success page
//
// Items come from Stripe's own line items (what the customer actually paid
// for), not from metadata.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const [session, lineItems] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 }),
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

    return NextResponse.json({ items, total, customer_email: customerEmail, customer_name: customerName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/session]", message);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
