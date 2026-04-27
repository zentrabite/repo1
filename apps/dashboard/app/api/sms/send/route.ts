// ─── POST /api/sms/send ───────────────────────────────────────────────────────
// Sends a single SMS via Twilio and logs it to Supabase.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { to, message, businessId, customerId, campaignId } = await req.json() as {
      to:          string;
      message:     string;
      businessId:  string;
      customerId?: string;
      campaignId?: string;
    };

    if (!to || !message || !businessId) {
      return NextResponse.json({ error: "to, message, and businessId are required" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({
        error: "Twilio not configured — add keys to .env.local"
      }, { status: 500 });
    }

    // Send via Twilio
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res  = await fetch(url, {
      method:  "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }).toString(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Twilio error");

    // Log to Supabase — cast as any to bypass strict type check on sms_logs insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createServerClient().from("sms_logs") as any).insert({
      business_id: businessId,
      customer_id: customerId ?? null,
      campaign_id: campaignId ?? null,
      message,
      status:      "sent",
      twilio_sid:  data.sid,
    });

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms/send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
