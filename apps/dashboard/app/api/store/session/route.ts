// GET /api/store/session?session_id=xxx — returns order details for success page
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
    const total = (session.amount_total ?? 0) / 100;
    const customerEmail = session.customer_details?.email ?? session.metadata?.customer_email ?? null;
    const customerName  = session.customer_details?.name  ?? session.metadata?.customer_name  ?? null;

    return NextResponse.json({ items, total, customer_email: customerEmail, customer_name: customerName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
