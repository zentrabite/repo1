// ─── POST /api/sms/inbound ────────────────────────────────────────────────────
// Twilio calls this when a customer replies to a text.
//
// Replies of STOP (or UNSUBSCRIBE, CANCEL, END, QUIT) mark that phone number
// as opted out for every business, since customers can't tell which
// restaurant the shared ZentraBite number belongs to. START opts them back in
// to texts but does NOT restore marketing consent. Required by the Spam Act.
//
// Setup in Twilio: Phone Numbers → your number → Messaging → "A message comes
// in" → Webhook → https://dashboard.zentrabite.com/api/sms/inbound (POST).
// If you use a Messaging Service, set the same URL on the service instead.
//
// Twilio's own Advanced Opt-Out also stops sending after STOP. This handler
// keeps our database in step so automations skip that customer too, and puts
// the STOP on the last marketing text to that number, which counts towards
// that shop's stop rules (lib/send-guard.ts).
//
// Security: every request must carry a valid X-Twilio-Signature, checked with
// TWILIO_AUTH_TOKEN. Set TWILIO_WEBHOOK_URL if the public URL differs from
// what the server sees (for example behind a proxy).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { isStartKeyword, isStopKeyword, normaliseAuPhone, phoneVariants, validTwilioSignature } from "@/lib/sms";
import { recordStop } from "@/lib/send-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });

  // Anything that isn't a form (a probe, an empty request) is turned away, not a crash.
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a form" }, { status: 400 });
  const params: Record<string, string> = {};
  form.forEach((value, key) => { params[key] = String(value); });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = process.env.TWILIO_WEBHOOK_URL ?? req.url;
  if (!signature || !validTwilioSignature(authToken, url, params, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From ? normaliseAuPhone(params.From) : "";
  const body = params.Body ?? "";
  if (!from) return twiml();

  // Customer phones may be saved as 04xx, +614xx, 614xx or with spaces.
  const variants = phoneVariants(from);

  const db = createAdminClient();

  if (isStopKeyword(body)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from("customers") as any)
      .update({ opted_out: true, opted_out_at: new Date().toISOString(), marketing_opt_in: false })
      .in("phone", variants);
    // Counts against the shop that last sent this number an offer.
    await recordStop(db, variants).catch(err => console.error("[sms/inbound] stop rules:", err instanceof Error ? err.message : err));
    // Twilio sends its own STOP confirmation, so reply with nothing.
    return twiml();
  }

  if (isStartKeyword(body)) {
    // Lets texts through again but doesn't invent marketing consent. The
    // restaurant needs a fresh opt-in (checkout tick box or rewards signup).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from("customers") as any)
      .update({ opted_out: false, opted_out_at: null })
      .in("phone", variants);
    return twiml();
  }

  // Any other reply: no automatic answer.
  return twiml();
}
