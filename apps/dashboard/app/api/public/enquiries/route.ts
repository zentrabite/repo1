// ─── /api/public/enquiries ──────────────────────────────────────────────────
// The contact form on zentrabite.com/contact posts here from the browser.
// apps/web has no Supabase keys, so this route does the insert with the
// service-role client. No login: proxy.ts lets this path through.
//
// OPTIONS → CORS preflight for the allowed origins only
// POST    { name, email, phone?, business_name, business_type?, locations?,
//           current_tools?, modules?, message?, website (honeypot), elapsed_ms }
//   200 { ok: true }                     saved (or quietly dropped as spam)
//   400 { error: "invalid", fields }      field messages for the form
//   403 / 413 / 415                       wrong origin, too big, not JSON
//   429 { error: "rate_limited" }         too many from this address
//   500 { error: "server_error" }         couldn't save
//
// Saved rows are only readable by super admins (/admin/enquiries).

import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import {
  ENQUIRY_RATE_LIMITS,
  clientIp,
  enquiryEmailText,
  hashIp,
  looksLikeSpam,
  originKind,
  sourceFor,
  validateEnquiry,
} from "@/lib/enquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const NOTIFY_TO = "hello@zentrabite.com";

// localhost may call this route only while developing, the same rule
// lib/tenant.ts uses for trusted origins.
const ALLOW_LOCAL = process.env.NODE_ENV !== "production";

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && originKind(origin, ALLOW_LOCAL)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function reply(origin: string | null, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store", ...extra } });
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const kind = originKind(origin, ALLOW_LOCAL);

  // A browser on any other site gets nothing. Requests without an Origin
  // (not from a browser) still go through every check below.
  if (origin && !kind) return reply(null, { error: "origin_not_allowed" }, 403);

  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return reply(origin, { error: "unsupported_type" }, 415);
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reply(origin, { error: "too_large" }, 413);
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return reply(origin, { error: "bad_request" }, 400);
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return reply(origin, { error: "too_large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(origin, { error: "bad_request" }, 400);
  }

  // Bots get the same answer as people, so they can't tell they were caught.
  if (looksLikeSpam(body)) return reply(origin, { ok: true });

  const result = validateEnquiry(body);
  if (!result.ok) return reply(origin, { error: "invalid", fields: result.fields }, 400);
  const enquiry = result.data;
  const source = sourceFor(kind);

  try {
    const db = createAdminClient();
    // Keyed with the server key so the hash can't be reversed without it.
    const ipHash = await hashIp(clientIp(req.headers), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

    // Per-address limit, counted from saved rows.
    const now = Date.now();
    const counts = await Promise.all(
      ENQUIRY_RATE_LIMITS.map(limit =>
        db.from("enquiries").select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", new Date(now - limit.windowMs).toISOString()),
      ),
    );
    const failed = counts.find(c => c.error);
    if (failed?.error) throw new Error(`count: ${failed.status} ${failed.error.code ?? ""} ${failed.error.message}`);
    const hit = ENQUIRY_RATE_LIMITS.find((limit, i) => (counts[i]!.count ?? 0) >= limit.max);
    if (hit) {
      return reply(origin, { error: "rate_limited" }, 429, { "Retry-After": String(Math.round(hit.windowMs / 1000)) });
    }

    const { error } = await db.from("enquiries").insert({ ...enquiry, source, ip_hash: ipHash });
    if (error) throw new Error(`insert: ${error.code ?? ""} ${error.message}`);
  } catch (err) {
    // No form values in the log, only what went wrong.
    console.error("[enquiries] save failed:", err instanceof Error ? err.message : err);
    return reply(origin, { error: "server_error" }, 500);
  }

  // Tell the team after the reply has gone. sendEmail never throws and skips
  // quietly without RESEND_API_KEY or a verified domain, and the enquiry is
  // already saved, so a failed email only shows in the logs.
  after(async () => {
    const sent = await sendEmail({
      to: NOTIFY_TO,
      subject: `New enquiry from ${enquiry.business_name}`,
      text: enquiryEmailText(enquiry, source),
      replyTo: enquiry.email,
    });
    if (!sent.ok && !sent.skipped) console.error("[enquiries] notification email failed:", sent.error);
  });

  return reply(origin, { ok: true });
}
