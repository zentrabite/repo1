// ─── Owner notifications ──────────────────────────────────────────────────────
// Fires email + SMS to a business owner when a new order comes in.
// Uses Resend for email (REST, no deps) and Twilio for SMS (REST, no deps).
// Notification destinations are read from businesses.settings:
//   settings.notify_email   — owner email (optional; falls back to auth email)
//   settings.notify_phone   — owner phone for SMS (optional; set in Settings UI)
// Missing creds or destinations are silently skipped so the webhook never fails.
// Both are must_reach messages (lib/message-kinds.ts). The text has no emoji
// or long dashes, which would turn it into a costlier unicode text.

import "server-only";
import { createServerClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { sendTwilioSms } from "@/lib/sms";

type NotifyOrderInput = {
  businessId: string;
  orderId:    string;
  amount:     number;
  customerName?: string | null;
  itemCount?: number;
  /** "As soon as possible, about 6:20pm" or "6:30pm". */
  pickupLabel?: string | null;
  /** Delivered by the shop's own driver, to deliveryAddress. */
  delivery?: boolean;
  deliveryAddress?: string | null;
  /** The customer's note for the kitchen or the driver. */
  note?: string | null;
};

export async function notifyOwnerOfOrder(input: NotifyOrderInput): Promise<void> {
  const { businessId, orderId, amount, customerName, itemCount, pickupLabel, delivery, deliveryAddress, note } = input;
  const when = pickupLabel ? `${delivery ? "Delivery" : "Pick-up"} ${pickupLabel}` : null;

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
    when,
    delivery && deliveryAddress ? `Deliver to: ${deliveryAddress}` : null,
    note ? `Note: ${note}` : null,
    `Order: ${shortId}`,
  ].filter(Boolean);
  const plainBody = parts.join("\n");

  // Run email and SMS in parallel — failures don't block the webhook
  await Promise.allSettled([
    notifyEmail ? sendEmail({ kind: "must_reach", to: notifyEmail, subject, text: plainBody }) : Promise.resolve(),
    notifyPhone ? sendSms(notifyPhone, ownerAlertText(businessName, amount, shortId, when)) : Promise.resolve(),
    writeNotificationRow(db, businessId, orderId, subject, plainBody),
  ]);
}

// ─── SMS via Twilio ───────────────────────────────────────────────────────────

/** "New order $26.00 at Nonna's Kitchen (3f2a9c1b). Pick-up 6:30pm" */
export function ownerAlertText(businessName: string, amount: number, shortId: string, when: string | null): string {
  return `New order $${amount.toFixed(2)} at ${businessName} (${shortId}).${when ? ` ${when}` : ""}`;
}

async function sendSms(to: string, message: string): Promise<void> {
  const out = await sendTwilioSms(to, message);
  if (out.status === "skipped") console.warn("[notify] Twilio not configured, SMS skipped");
  else if (out.status === "failed") console.error("[notify] SMS failed:", out.error);
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

