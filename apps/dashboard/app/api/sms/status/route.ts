// ─── POST /api/sms/status ─────────────────────────────────────────────────────
// Twilio reports here what happened to each text (sendTwilioSms sends this
// address as StatusCallback with every text). "delivered" and "didn't arrive"
// (undelivered or failed) are saved on the send's sms_logs row. A marketing
// text that didn't arrive counts towards that shop's stop rules
// (lib/send-guard.ts), so a send to a bad list pauses itself.
//
// Security: every request must carry a valid X-Twilio-Signature for this
// address, checked with TWILIO_AUTH_TOKEN. Nothing else is trusted.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { statusCallbackUrl, validTwilioSignature } from "@/lib/sms";
import { checkStopRules, recordOutcome } from "@/lib/send-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIDNT_ARRIVE = new Set(["undelivered", "failed"]);

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });

  // Anything that isn't a form (a probe, an empty request) is turned away, not a crash.
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a form" }, { status: 400 });
  const params: Record<string, string> = {};
  form.forEach((value, key) => { params[key] = String(value); });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!signature || !validTwilioSignature(authToken, statusCallbackUrl(), params, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const sid = params.MessageSid ?? "";
  const status = (params.MessageStatus ?? "").toLowerCase();
  const outcome = status === "delivered" ? "delivered" : DIDNT_ARRIVE.has(status) ? "undelivered" : null;
  if (!sid || !outcome) return new NextResponse(null, { status: 204 });

  const db = createAdminClient();
  const row = await recordOutcome(db, sid, outcome);
  if (row && outcome === "undelivered" && row.kind === "marketing") {
    await checkStopRules(db, row.business_id, "sms");
  }
  return new NextResponse(null, { status: 204 });
}
