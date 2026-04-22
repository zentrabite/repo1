// ─── POST /api/ai-calls/start ────────────────────────────────────────────────
// Kicks off an outbound AI phone call to a customer.
//
// Uses Twilio to dial the customer and connect them to our AI voice provider
// (Vapi / Retell / custom). The AI profile (voice, personality, greeting, FAQ,
// escalation phone) is loaded from the `ai_call_profiles` table for this
// business and handed to the voice provider via TwiML webhook.
//
// Env required:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_PHONE_NUMBER          — the business's ZentraBite Twilio number
//   AI_VOICE_WEBHOOK_URL         — the TwiML endpoint your voice provider serves
//                                  (Vapi/Retell/your own). If missing we fall
//                                  back to a simple <Say> that reads the
//                                  business greeting and hangs up — useful for
//                                  testing without a full voice stack.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { businessId, customerId, phone, reason } = await req.json() as {
      businessId: string;
      customerId?: string;
      phone:      string;
      reason?:    string;
    };

    if (!businessId || !phone) {
      return NextResponse.json(
        { error: "businessId and phone are required" },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env.local" },
        { status: 500 }
      );
    }

    // Load the business's AI profile so the voice provider can personalise the call.
    const db = createServerClient();
    const { data: profile } = await db
      .from("ai_call_profiles")
      .select("enabled, voice, personality, greeting, faq_context, escalation_phone, take_orders, take_bookings, send_followup_sms")
      .eq("business_id", businessId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "No AI call profile for this business — configure one on /ai-calls first" },
        { status: 400 }
      );
    }
    if (!profile.enabled) {
      return NextResponse.json(
        { error: "AI calling is disabled for this business — enable it on /ai-calls" },
        { status: 400 }
      );
    }

    // Where Twilio should pull TwiML from once the customer answers. If the
    // business has plugged in Vapi / Retell / a custom provider, that URL goes
    // in AI_VOICE_WEBHOOK_URL. We append the business + customer + reason as
    // query params so the provider can bootstrap the AI session.
    const webhookBase = process.env.AI_VOICE_WEBHOOK_URL;
    const qs = new URLSearchParams({
      business_id: businessId,
      customer_id: customerId ?? "",
      reason:      reason ?? "followup",
    }).toString();

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const body = new URLSearchParams({
      To:   phone,
      From: fromNumber,
      ...(webhookBase
        ? { Url: `${webhookBase}?${qs}` }
        // Fallback: inline TwiML <Say>. Useful for wiring verification before
        // the AI provider is live.
        : {
            Twiml: `<Response><Say voice="Polly.Nicole">${escapeXml(
              profile.greeting ?? "Hi, this is an automated call from your favourite cafe — give us a ring back when you have a moment."
            )}</Say></Response>`,
          }),
      ...(customerId ? { StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/ai-calls/webhook?customer_id=${customerId}` } : {}),
    });

    const twRes  = await fetch(url, {
      method:  "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await twRes.json();
    if (!twRes.ok) throw new Error(data.message ?? "Twilio error");

    // Log the call-start event so the dashboard copilot panel can surface it.
    // Swallow any insert error (e.g. table missing in a fresh env) — we don't
    // want a logging failure to break the outbound call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from("campaign_events") as any).insert({
      business_id:    businessId,
      customer_id:    customerId ?? null,
      event_type:     "ai_call_started",
      channel:        "voice",
      reference_id:   data.sid,
    }).then(() => undefined, () => undefined);

    return NextResponse.json({ success: true, callSid: data.sid, status: data.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai-calls/start]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, ch =>
    ch === "<" ? "&lt;"  :
    ch === ">" ? "&gt;"  :
    ch === "&" ? "&amp;" :
    ch === "'" ? "&apos;" :
                 "&quot;"
  );
}
