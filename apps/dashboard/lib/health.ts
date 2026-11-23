// ─── Connection lights ──────────────────────────────────────────────────────
// One light for each outside service ZentraBite needs, for Super Admin,
// Sending. Each check is small, read only and gives up after 5 seconds.
//   ok    working
//   warn  working, but something limits it (a trial account, no verified
//         email domain, a report webhook not set up, a job that hasn't run)
//   down  set up but failing (a key rejected, the service unreachable)
//   off   not set up yet
// No key or secret ever leaves here, only what state it's in.
// The daily run calls checkConnections() and tells the team when one is down
// (lib/alerts.ts).

import "server-only";
import { stripe } from "@/lib/stripe";
import { activePauses } from "@/lib/send-guard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type LightStatus = "ok" | "warn" | "down" | "off";
export type Light = { key: string; name: string; status: LightStatus; detail: string };

const TIMEOUT_MS = 5000;

async function within<T>(work: Promise<T>): Promise<T> {
  return await Promise.race([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), TIMEOUT_MS)),
  ]);
}

async function getJson(url: string, headers: Record<string, string>): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await within(fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }));
  return { status: res.status, body: await res.json().catch(() => ({})) as Record<string, unknown> };
}

const failed = (err: unknown) => (err instanceof Error && err.message === "timed out" ? "Didn't answer within 5 seconds." : "Couldn't reach it.");

async function database(db: Db): Promise<Light> {
  const name = "Database (Supabase)";
  try {
    const { error } = await within(db.from("businesses").select("id", { count: "exact", head: true }) as Promise<{ error: unknown }>);
    return error ? { key: "database", name, status: "down", detail: "A simple read failed." } : { key: "database", name, status: "ok", detail: "Reads work." };
  } catch (err) {
    return { key: "database", name, status: "down", detail: failed(err) };
  }
}

async function payments(): Promise<Light> {
  const name = "Payments (Stripe)";
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return { key: "stripe", name, status: "off", detail: "No Stripe key set." };
  const mode = /_live_/.test(key) ? "Live mode" : "Test mode";
  const hooks = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean).length;
  try {
    await within(stripe.balance.retrieve());
    return hooks === 2
      ? { key: "stripe", name, status: "ok", detail: `${mode}. The key works and both webhook secrets are set.` }
      : { key: "stripe", name, status: "warn", detail: `${mode}. The key works, but ${2 - hooks} of the 2 webhook secrets isn't set, so some payments won't reach the CRM.` };
  } catch (err) {
    const rejected = typeof err === "object" && err !== null && "type" in err && (err as { type?: string }).type === "StripeAuthenticationError";
    return { key: "stripe", name, status: "down", detail: rejected ? `${mode}. Stripe rejected the key.` : `${mode}. ${failed(err)}` };
  }
}

async function texts(): Promise<Light> {
  const name = "Texts (Twilio)";
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  if (!sid || !token) return { key: "twilio", name, status: "off", detail: "No Twilio account set." };
  const sender = Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER);
  try {
    const { status, body } = await getJson(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    });
    if (status === 401 || status === 403) return { key: "twilio", name, status: "down", detail: "Twilio rejected the account details." };
    if (status >= 400) return { key: "twilio", name, status: "down", detail: `Twilio answered ${status}.` };
    if (body.status !== "active") return { key: "twilio", name, status: "down", detail: `The account is ${String(body.status ?? "not active")}.` };
    if (!sender) return { key: "twilio", name, status: "warn", detail: "The account works, but no number or sender is set, so no text can go." };
    if (body.type === "Trial") return { key: "twilio", name, status: "warn", detail: "Trial account. Texts only reach numbers verified in Twilio." };
    return { key: "twilio", name, status: "ok", detail: "The account is active and a sender is set." };
  } catch (err) {
    return { key: "twilio", name, status: "down", detail: failed(err) };
  }
}

async function email(): Promise<Light> {
  const name = "Email (Resend)";
  const key = process.env.RESEND_API_KEY ?? "";
  if (!key) return { key: "resend", name, status: "off", detail: "No Resend key set." };
  const reports = process.env.RESEND_WEBHOOK_SECRET ? "" : " Bounce and spam reports aren't set up (RESEND_WEBHOOK_SECRET).";
  try {
    const { status, body } = await getJson("https://api.resend.com/domains", { Authorization: `Bearer ${key}` });
    if (status === 401) return { key: "resend", name, status: "down", detail: "Resend rejected the key." };
    if (status === 403) return { key: "resend", name, status: "warn", detail: `The key can only send, so the domain can't be checked here.${reports}` };
    if (status >= 400) return { key: "resend", name, status: "down", detail: `Resend answered ${status}.` };
    const domains = Array.isArray(body.data) ? body.data as { name?: string; status?: string }[] : [];
    const verified = domains.filter(d => d.status === "verified").map(d => d.name).filter(Boolean);
    if (!verified.length) return { key: "resend", name, status: "warn", detail: `No verified domain, so no email sends.${reports}` };
    return { key: "resend", name, status: reports ? "warn" : "ok", detail: `${verified.join(", ")} verified.${reports}` };
  } catch (err) {
    return { key: "resend", name, status: "down", detail: failed(err) };
  }
}

async function ai(): Promise<Light> {
  const name = "AI (Anthropic)";
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key) return { key: "anthropic", name, status: "off", detail: "No Anthropic key set." };
  try {
    const { status } = await getJson("https://api.anthropic.com/v1/models?limit=1", { "x-api-key": key, "anthropic-version": "2023-06-01" });
    if (status === 401 || status === 403) return { key: "anthropic", name, status: "down", detail: "Anthropic rejected the key." };
    if (status >= 400) return { key: "anthropic", name, status: "down", detail: `Anthropic answered ${status}.` };
    return { key: "anthropic", name, status: "ok", detail: "The key works." };
  } catch (err) {
    return { key: "anthropic", name, status: "down", detail: failed(err) };
  }
}

function counting(): Light {
  const name = "Counting (PostHog)";
  const parts = (process.env.NEXT_PUBLIC_POSTHOG_ON ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !parts.length) return { key: "posthog", name, status: "off", detail: "Switched off." };
  return { key: "posthog", name, status: "ok", detail: `Counting ${parts.join(", ")}.` };
}

/** The daily jobs, from the run log (edge_function_runs). Older than 2 days is a warning. */
async function jobs(db: Db, now: Date): Promise<Light> {
  const name = "Daily jobs";
  const watched: Record<string, string> = { "automations-run": "Win-back run", "birthday-loyalty": "Birthday points", "nightly-analytics-done": "Analytics" };
  try {
    const { data, error } = await within(db.from("edge_function_runs").select("function_name, run_date").in("function_name", Object.keys(watched)).order("run_date", { ascending: false }).limit(50) as Promise<{ data: unknown; error: unknown }>);
    if (error) return { key: "jobs", name, status: "down", detail: "Couldn't read the run log." };
    const rows = (data ?? []) as { function_name: string; run_date: string }[];
    const today = Date.parse(now.toISOString().slice(0, 10));
    const late: string[] = [];
    const seen: string[] = [];
    for (const [fn, label] of Object.entries(watched)) {
      const last = rows.filter(r => r.function_name === fn).map(r => Date.parse(r.run_date)).sort((a, b) => b - a)[0];
      if (last === undefined) late.push(`${label} hasn't run yet`);
      else {
        const days = Math.round((today - last) / 86_400_000);
        if (days > 2) late.push(`${label} last ran ${days} days ago`);
        else seen.push(`${label} ran ${days === 0 ? "today" : days === 1 ? "yesterday" : "2 days ago"}`);
      }
    }
    return late.length
      ? { key: "jobs", name, status: "warn", detail: `${[...late, ...seen].join(". ")}.` }
      : { key: "jobs", name, status: "ok", detail: `${seen.join(". ")}.` };
  } catch (err) {
    return { key: "jobs", name, status: "down", detail: failed(err) };
  }
}

async function sending(db: Db): Promise<Light> {
  const name = "Sending";
  const open = await activePauses(db).catch(() => []);
  if (!open.length) return { key: "sending", name, status: "ok", detail: "Nothing is paused." };
  const every = open.filter(p => p.business_id === null).length;
  return { key: "sending", name, status: "warn", detail: `${open.length} paused${every ? `, ${every} of them for every shop` : ""}. See below.` };
}

/** Every light, checked at once. */
export async function checkConnections(db: Db, now: Date = new Date()): Promise<Light[]> {
  return Promise.all([database(db), payments(), texts(), email(), ai(), counting(), jobs(db, now), sending(db)]);
}
