// ─── POST /api/email/events ───────────────────────────────────────────────────
// Resend reports here what happened to each email. Only marketing emails are
// in sms_logs (with Resend's id in provider_id), so reports on receipts and
// alerts are ignored.
//   • email.delivered   saved as delivered
//   • email.bounced     saved as bounced, counts towards the stop rules
//   • email.complained  saved as complained (marked as spam), counts towards
//                       the stop rules, and unsubscribes that customer from
//                       the shop's marketing, the same as the unsubscribe link
//
// Setup in Resend, once the domain is verified: Webhooks, add
// https://dashboard.zentrabite.com/api/email/events with email.delivered,
// email.bounced and email.complained, then put its signing secret in Vercel
// as RESEND_WEBHOOK_SECRET.
//
// Security: every request must carry a valid Svix signature for that secret.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { validResendSignature } from "@/lib/email";
import { checkStopRules, recordOutcome } from "@/lib/send-guard";
import { recordUnsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTCOMES = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained" } as const;

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Resend webhook not set up" }, { status: 503 });

  const body = await req.text();
  const ok = validResendSignature(secret, {
    id:        req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
  }, body);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  let event: { type?: string; data?: { email_id?: string } };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: "Bad body" }, { status: 400 }); }

  const outcome = OUTCOMES[event.type as keyof typeof OUTCOMES];
  const emailId = event.data?.email_id ?? "";
  if (!outcome || !emailId) return NextResponse.json({ ok: true });

  const db = createAdminClient();
  const row = await recordOutcome(db, emailId, outcome);
  if (!row || row.kind !== "marketing" || outcome === "delivered") return NextResponse.json({ ok: true });

  if (outcome === "complained" && row.customer_id) {
    await recordUnsubscribe(db, row.customer_id).catch(err => console.error("[email/events] unsubscribe:", err instanceof Error ? err.message : err));
  }
  await checkStopRules(db, row.business_id, "email");
  return NextResponse.json({ ok: true });
}
