// ─── POST /api/sms/send ───────────────────────────────────────────────────────
// Sends a single SMS via Twilio and logs it to Supabase.
//
// Security
//   • The business comes from the login (requireBusiness), never the body.
//   • If a customerId is given it must belong to that business, and the text
//     goes to that customer's saved number.
//   • Opted-out customers are never texted.
//   • Per-minute and monthly limits protect the Twilio bill.
//   • Every text gets the business name and "Reply STOP to opt out".

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";
import { checkSmsAllowance, sendTwilioSms, withSenderAndOptOut } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { to, message, businessId: requestedBusinessId, customerId, campaignId } = await req.json() as {
      to?:         string;
      message:     string;
      businessId?: string;
      customerId?: string;
      campaignId?: string;
    };

    const auth = await requireBusiness(requestedBusinessId);
    if (!auth.ok) return auth.response;
    const { businessId } = auth;

    if (!message || (!to && !customerId)) {
      return NextResponse.json({ error: "message and either customerId or to are required" }, { status: 400 });
    }
    if (message.length > 640) {
      return NextResponse.json({ error: "Message is too long (max 640 characters)" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("name, settings")
      .eq("id", businessId)
      .single();

    // Resolve the recipient. A customer id must belong to this business.
    let recipient = to ?? "";
    if (customerId) {
      const { data: customer } = await db
        .from("customers")
        .select("id, phone, opted_out")
        .eq("id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      if (customer.opted_out) return NextResponse.json({ error: "This customer has opted out of texts" }, { status: 409 });
      if (!customer.phone) return NextResponse.json({ error: "This customer has no phone number" }, { status: 400 });
      recipient = customer.phone;
    } else {
      // Free-typed number: still refuse anyone who opted out with this business.
      const { data: optedOut } = await db
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("phone", recipient)
        .eq("opted_out", true)
        .limit(1);
      if (optedOut && optedOut.length > 0) {
        return NextResponse.json({ error: "This number has opted out of texts" }, { status: 409 });
      }
    }

    const allowance = await checkSmsAllowance(db, businessId, (business?.settings ?? null) as Record<string, unknown> | null);
    if (!allowance.ok) return NextResponse.json({ error: allowance.reason }, { status: allowance.status });

    const body = withSenderAndOptOut(message, business?.name);
    const out = await sendTwilioSms(recipient, body);
    if (out.status === "skipped") {
      return NextResponse.json({ error: "Texting isn't set up yet (Twilio not configured)" }, { status: 503 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from("sms_logs") as any).insert({
      business_id: businessId,
      customer_id: customerId ?? null,
      campaign_id: campaignId ?? null,
      channel:     "sms",
      recipient,
      message:     body,
      status:      out.status,
      twilio_sid:  out.sid,
    });

    if (out.status !== "sent") {
      return NextResponse.json({ error: out.error ?? "Text failed to send" }, { status: 502 });
    }
    return NextResponse.json({ success: true, sid: out.sid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms/send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
