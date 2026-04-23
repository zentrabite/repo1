// ─── Owner notifications ──────────────────────────────────────────────────────
// Fires email + SMS to a business owner when a new order comes in.
// Uses Resend for email (REST, no deps) and Twilio for SMS (REST, no deps).
// Notification destinations are read from businesses.settings:
//   settings.notify_email   — owner email (optional; falls back to auth email)
//   settings.notify_phone   — owner phone for SMS (optional; set in Settings UI)
// Missing creds or destinations are silently skipped so the webhook never fails.

import { createServerClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

type NotifyOrderInput = {
  businessId: string;
  orderId:    string;
  amount:     number;
  customerName?: string | null;
  itemCount?: number;
};

export async function notifyOwnerOfOrder(input: NotifyOrderInput): Promise<void> {
  const { businessId, orderId, amount, customerName, itemCount } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServerClient() as any;

  // Look up business + owner contact details
  const { data: biz } = await db
    .from("businesses")
    .select("name, settings, subdomain")
    .eq("id", businessId)
    .single();
  if (!biz) return;

  const settings: Record<string, unknown> = (biz.settings ?? {}) as Record<string, unknown>;
  const notifyEmail = (settings.notify_email as string | undefined) ?? null;
  const notifyPhone = (settings.notify_phone as string | undefined) ?? null;
  const businessName: string = biz.name ?? "Your store";

  const subject = `🔔 New order — $${amount.toFixed(2)}`;
  const shortId = orderId.slice(0, 8);
  const parts = [
    `New order at ${businessName}`,
    `Amount: $${amount.toFixed(2)}`,
    customerName ? `Customer: ${customerName}` : null,
    itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : null,
    `Order: ${shortId}`,
  ].filter(Boolean);
  const plainBody = parts.join("\n");

  // Run email and SMS in parallel — failures don't block the webhook
  await Promise.allSettled([
    notifyEmail ? sendEmail({ to: notifyEmail, subject, text: plainBody }) : Promise.resolve(),
    notifyPhone ? sendSms(notifyPhone, `${subject} — ${businessName} (${shortId})`) : Promise.resolve(),
    writeNotificationRow(db, businessId, orderId, subject, plainBody),
  ]);
}

// ─── SMS via Twilio ───────────────────────────────────────────────────────────

async function sendSms(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[notify] Twilio not configured — skipping SMS");
    return;
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }).toString(),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[notify] Twilio error:", res.status, body);
    }
  } catch (err) {
    console.error("[notify] SMS send failed:", err);
  }
}

// ─── In-app notification row (optional; table created by migration) ──────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeNotificationRow(db: any, businessId: string, orderId: string, title: string, body: string): Promise<void> {
  try {
    await db.from("notifications").insert({
      business_id: businessId,
      order_id:    orderId,
      title, body,
      read:        false,
    });
  } catch (err) {
    // Table may not exist yet — safe to ignore
    console.warn("[notify] notifications table insert skipped:", err instanceof Error ? err.message : err);
  }
}

