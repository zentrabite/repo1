// ─── POST /api/automations/run ────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { businessId } = await req.json() as { businessId: string };

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    const db = createServerClient();
    const today = new Date();

    const { data: campaigns, error: campErr } = await db
      .from("campaigns")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true);

    if (campErr) throw campErr;
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: "No active campaigns", sent: 0 });
    }

    const { data: customers, error: custErr } = await db
      .from("customers")
      .select("id, name, phone, last_order_date")
      .eq("business_id", businessId)
      .eq("opted_out", false)
      .not("phone", "is", null);

    if (custErr) throw custErr;
    if (!customers || customers.length === 0) {
      return NextResponse.json({ message: "No eligible customers", sent: 0 });
    }

    const cooldownFrom = new Date();
    cooldownFrom.setDate(cooldownFrom.getDate() - 90);

    const { data: recentLogs, error: logErr } = await db
      .from("sms_logs")
      .select("customer_id, campaign_id, sent_at")
      .eq("business_id", businessId)
      .gte("sent_at", cooldownFrom.toISOString());

    if (logErr) throw logErr;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({
        error: "Twilio not configured"
      }, { status: 500 });
    }

    let totalSent = 0;
    const results: { customer: string; campaign: string; status: string }[] = [];

    for (const campaign of campaigns) {
      for (const customer of customers) {
        if (!customer.last_order_date) continue;

        const lastOrder = new Date(customer.last_order_date);
        const daysSince = Math.floor((today.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < campaign.trigger_days) continue;

        const lastSent = recentLogs?.find(
          l => l.customer_id === customer.id && l.campaign_id === campaign.id
        );
        if (lastSent) {
          const daysSinceLastSent = Math.floor(
            (today.getTime() - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastSent < campaign.cooldown_days) continue;
        }

        const message = (campaign.template ?? "Hey {name}, we miss you! Come back for ${discount} off your next order.")
          .replace("{name}",     customer.name.split(" ")[0])
          .replace("{discount}", String(campaign.discount_amount));

        let twilioSid: string | null = null;
        let status = "sent";

        try {
          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method:  "POST",
              headers: {
                "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
                "Content-Type":  "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To:   customer.phone!,
                From: fromNumber,
                Body: message,
              }).toString(),
            }
          );
          const twilioData = await twilioRes.json();
          if (!twilioRes.ok) {
            status = "failed";
          } else {
            twilioSid = twilioData.sid;
            totalSent++;
          }
        } catch {
          status = "failed";
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from("sms_logs") as any).insert({
          business_id: businessId,
          customer_id: customer.id,
          campaign_id: campaign.id,
          message,
          status,
          twilio_sid:  twilioSid,
        });

        results.push({ customer: customer.name, campaign: campaign.name ?? campaign.type, status });
      }
    }

    return NextResponse.json({ success: true, sent: totalSent, results });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
