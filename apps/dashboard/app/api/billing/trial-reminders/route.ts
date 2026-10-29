// ─── GET /api/billing/trial-reminders ─────────────────────────────────────────
// Daily Vercel cron (vercel.json). Emails each business once, about 3 days
// before its free trial ends, saying when the first payment is taken and how
// much it is.
//
// Security: only runs with "Authorization: Bearer $CRON_SECRET", which Vercel
// cron sends by itself. The path is let through the login gate in proxy.ts.
//
// How it decides
//   1. Businesses whose settings say subscription_status = "trialing" and
//      whose subscription_period_end (written by the Stripe webhook; while
//      trialing it's the trial end) is less than 4 days away.
//   2. Stripe is asked for the live trialing subscription, which gives the
//      real trial end, the price and the billing email. No subscription, or
//      one set to cancel, means no email.
//   3. Send when the trial ends within the next 3.5 days. Run daily, that
//      lands about 3 days before.
//   4. After a successful send, settings.trial_reminder_sent_for is set to
//      that trial end, so it's never sent twice for the same trial.
// Failed sends (for example before the mail domain is verified) aren't
// marked, so the next day's run tries again.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { formatAmount, stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEND_WITHIN_MS = 3.5 * DAY_MS;
const LOOK_AHEAD_MS = 4 * DAY_MS;

type Result = { business_id: string; status: string };

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const now = Date.now();

    const { data: rows, error } = await db
      .from("businesses")
      .select("id, name, settings, stripe_customer_id")
      .eq("settings->>subscription_status", "trialing");
    if (error) throw new Error(`business lookup failed: ${error.message}`);

    const results: Result[] = [];
    for (const biz of (rows ?? []) as BusinessRow[]) {
      results.push({ business_id: biz.id, status: await remindOne(db, biz, now) });
    }

    const sent = results.filter(r => r.status === "sent").length;
    return NextResponse.json({ success: true, checked: results.length, sent, results });
  } catch (err) {
    console.error("[trial-reminders]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Trial reminder run failed" }, { status: 500 });
  }
}

type BusinessRow = {
  id:                 string;
  name:               string | null;
  settings:           Record<string, unknown> | null;
  stripe_customer_id: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function remindOne(db: any, biz: BusinessRow, now: number): Promise<string> {
  const settings = biz.settings ?? {};
  const periodEnd = typeof settings.subscription_period_end === "string" ? Date.parse(settings.subscription_period_end) : NaN;
  if (!Number.isFinite(periodEnd) || periodEnd <= now || periodEnd - now > LOOK_AHEAD_MS) return "not_due";
  if (!biz.stripe_customer_id) return "no_stripe_customer";

  // Ask Stripe for the real trial, price and billing email.
  let sub: Stripe.Subscription | undefined;
  try {
    const list = await stripe.subscriptions.list({
      customer: biz.stripe_customer_id,
      status:   "trialing",
      limit:    1,
      expand:   ["data.customer"],
    });
    sub = list.data[0];
  } catch (err) {
    console.error(`[trial-reminders] ${biz.id} Stripe lookup failed:`, err instanceof Error ? err.message : err);
    return "stripe_error";
  }
  if (!sub || !sub.trial_end) return "no_trial";
  if (sub.cancel_at_period_end || sub.cancel_at) return "cancelling";

  const trialEndMs = sub.trial_end * 1000;
  if (trialEndMs <= now || trialEndMs - now > SEND_WITHIN_MS) return "not_due";

  const trialEndIso = new Date(trialEndMs).toISOString();
  if (settings.trial_reminder_sent_for === trialEndIso) return "already_sent";

  const to = await billingEmail(db, biz.id, sub);
  if (!to) return "no_email";

  const price = sub.items.data[0]?.price;
  const amount = price?.unit_amount != null ? formatAmount(price.unit_amount, price.currency) : null;
  const businessName = biz.name ?? "your business";
  const date = formatDate(trialEndMs, typeof settings.timezone === "string" ? settings.timezone : "Australia/Adelaide");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/+$/, "");

  const subject = `Your ZentraBite free trial ends on ${date}`;
  const text = [
    `Hi,`,
    ``,
    `The free trial of ZentraBite for ${businessName} ends on ${date}.`,
    ``,
    amount
      ? `That day we'll take your first payment of ${amount} from the card you added. After that it's ${amount} each month.`
      : `That day we'll take your first monthly payment from the card you added.`,
    ``,
    `You don't need to do anything to keep going.`,
    `To update your card or your plan, open Settings and choose Manage Subscription:`,
    `${appUrl}/settings`,
    ``,
    `ZentraBite`,
  ].join("\n");

  const out = await sendEmail({ to, subject, text });
  if (!out.ok) {
    if (!out.skipped) console.error(`[trial-reminders] ${biz.id} email failed: ${out.error}`);
    return out.skipped ? "email_not_set_up" : "email_failed";
  }

  // Re-read settings so a webhook write in the meantime isn't lost.
  const { data: fresh } = await db.from("businesses").select("settings").eq("id", biz.id).single();
  const latest = ((fresh?.settings ?? settings) as Record<string, unknown>);
  const { error: markErr } = await db
    .from("businesses")
    .update({ settings: { ...latest, trial_reminder_sent_for: trialEndIso } })
    .eq("id", biz.id);
  if (markErr) console.error(`[trial-reminders] ${biz.id} sent but not marked: ${markErr.message}`);
  return "sent";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function billingEmail(db: any, businessId: string, sub: Stripe.Subscription): Promise<string | null> {
  const customer = sub.customer;
  if (customer && typeof customer === "object" && !("deleted" in customer && customer.deleted)) {
    const email = (customer as Stripe.Customer).email;
    if (email) return email;
  }
  const { data: owner } = await db
    .from("users")
    .select("email")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();
  return (owner?.email as string | undefined) ?? null;
}

function formatDate(ms: number, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  try {
    return new Date(ms).toLocaleDateString("en-AU", { ...opts, timeZone });
  } catch {
    return new Date(ms).toLocaleDateString("en-AU", { ...opts, timeZone: "Australia/Adelaide" });
  }
}
