// ─── /api/unsubscribe ─────────────────────────────────────────────────────────
// Records an email opt-out from a signed link (lib/unsubscribe.ts). Public:
// proxy.ts lets it through the login gate, and the HMAC token is the only
// credential, so nobody can unsubscribe a customer they didn't email.
//
//   POST ?t=<token>  body "List-Unsubscribe=One-Click"
//        One-click unsubscribe from Gmail, Outlook and other mail apps
//        (RFC 8058, from the List-Unsubscribe header). Answers 200 text.
//
//   POST form { t, from: "page" }
//        The button on /unsubscribe. Redirects back to that page.
//
//   GET  ?t=<token>
//        Never unsubscribes. Link scanners and mail previews open links on
//        their own, so a GET just shows the confirm page.
//
// Transactional emails (receipts, password resets) don't use this.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { readUnsubscribeToken, recordUnsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pageUrl(req: Request, token: string, status?: "done" | "error" | "invalid"): URL {
  const url = new URL("/unsubscribe", req.url);
  if (token) url.searchParams.set("t", token);
  if (status) url.searchParams.set("status", status);
  return url;
}

function text(body: string, status: number): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("t") ?? "";
  let fromPage = false;

  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const t = form?.get("t");
    if (typeof t === "string" && t) token = t;
    fromPage = form?.get("from") === "page";
  }

  const customerId = readUnsubscribeToken(token);
  if (!customerId) {
    return fromPage
      ? NextResponse.redirect(pageUrl(req, token, "invalid"), 303)
      : text("This unsubscribe link doesn't work.", 400);
  }

  try {
    // A customer who no longer exists gets no more emails either, so that
    // still counts as done.
    await recordUnsubscribe(createAdminClient(), customerId);
  } catch (err) {
    console.error("[unsubscribe]", err instanceof Error ? err.message : err);
    return fromPage
      ? NextResponse.redirect(pageUrl(req, token, "error"), 303)
      : text("We couldn't save that. Try again in a minute.", 500);
  }

  return fromPage
    ? NextResponse.redirect(pageUrl(req, token, "done"), 303)
    : text("You're unsubscribed.", 200);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(pageUrl(req, token), 303);
}
