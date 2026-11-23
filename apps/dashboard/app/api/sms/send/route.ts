// ─── POST /api/sms/send ───────────────────────────────────────────────────────
// An owner or manager texts one customer from the Customers page, and it's
// logged in sms_logs.
//
// The owner says what it's about, which sets its kind (lib/message-kinds.ts).
//   • must_reach, "about their order". Goes even to someone who hasn't
//     agreed to marketing. Someone who opted out only within 7 days of an
//     order. Refused if it reads like an offer.
//   • marketing, "an offer or news". Only to someone who agreed and hasn't
//     opted out, nor anyone else at this shop with the same number. Ends
//     with "Reply STOP to opt out". Not while the shop's marketing texts are
//     paused by a stop rule (lib/stop-rules.ts).
// checkCustomerText() is the same rule the page shows as the owner types.
//
// Security
//   • The business comes from the login (requireBusiness), never the body.
//   • The customer must belong to that business, and the text goes to the
//     customer's saved number. There's no free-typed number.
//   • Per-minute and monthly limits protect the Twilio bill.
//   • Every text names the business.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { checkSmsAllowance, phoneVariants, sendTwilioSms, smsBody } from "@/lib/sms";
import { checkCustomerText } from "@/lib/message-kinds";
import { activePause } from "@/lib/send-guard";
import { describePause } from "@/lib/stop-rules";

export async function POST(req: Request) {
  try {
    const { message, kind: rawKind, businessId: requestedBusinessId, customerId, campaignId } = await req.json() as {
      message:     string;
      kind?:       string;
      businessId?: string;
      customerId?: string;
      campaignId?: string;
    };

    const auth = await requireBusiness(requestedBusinessId, { roles: MANAGER_ROLES });
    if (!auth.ok) return auth.response;
    const { businessId } = auth;

    if (!message?.trim() || !customerId) {
      return NextResponse.json({ error: "message and customerId are required" }, { status: 400 });
    }
    if (message.length > 640) {
      return NextResponse.json({ error: "Message is too long (max 640 characters)" }, { status: 400 });
    }
    // Anything but "about their order" is treated as an offer, the stricter one.
    const kind = rawKind === "must_reach" ? "must_reach" : "marketing";

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("name, settings")
      .eq("id", businessId)
      .single();

    const { data: customer } = await db
      .from("customers")
      .select("id, phone, opted_out, marketing_opt_in, last_order_date")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!customer.phone) return NextResponse.json({ error: "This customer has no phone number" }, { status: 400 });

    // A STOP can sit on another record with the same number at this shop.
    const { data: sameNumberOut } = await db
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .in("phone", phoneVariants(customer.phone))
      .eq("opted_out", true)
      .limit(1);
    const optedOut = Boolean(customer.opted_out) || (sameNumberOut ?? []).length > 0;

    const check = checkCustomerText(kind, message, {
      opted_out:        optedOut,
      marketing_opt_in: customer.marketing_opt_in,
      last_order_date:  customer.last_order_date,
    });
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 409 });

    if (kind === "marketing") {
      const pause = await activePause(db, businessId, "sms");
      if (pause) {
        return NextResponse.json({ error: `Marketing texts are paused for your shop. ${describePause("sms", pause.reason, pause.detail)} Texts about an order still go.` }, { status: 409 });
      }
    }

    const allowance = await checkSmsAllowance(db, businessId, (business?.settings ?? null) as Record<string, unknown> | null);
    if (!allowance.ok) return NextResponse.json({ error: allowance.reason }, { status: allowance.status });

    const body = smsBody(kind, message, business?.name);
    const out = await sendTwilioSms(customer.phone, body);
    if (out.status === "skipped") {
      return NextResponse.json({ error: "Texting isn't set up yet (Twilio not configured)" }, { status: 503 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from("sms_logs") as any).insert({
      business_id: businessId,
      customer_id: customer.id,
      campaign_id: campaignId ?? null,
      kind,
      channel:     "sms",
      recipient:   customer.phone,
      message:     body,
      status:      out.status,
      twilio_sid:  out.sid,
      provider_id: out.sid,
    });

    if (out.status !== "sent") {
      return NextResponse.json({ error: out.error ?? "Text failed to send" }, { status: 502 });
    }
    return NextResponse.json({ success: true, sid: out.sid, kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms/send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
