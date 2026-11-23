// ═══════════════════════════════════════════════════════════════════════════
// /api/copilot — In-CRM AI assistant
// Reads the shop's own data, sends a snapshot to Claude, streams the reply.
// Read only. The model gets no tools and the snapshot holds no customer's
// name, contact details or words, only counts and the shop's own entries.
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";
import { canAccess } from "@/lib/permissions";
import { shopMidnight, shopTimezone, shopToday } from "@/lib/pickup-times";
import { buildSnapshot } from "@/lib/copilot-snapshot";
import {
  COPILOT_SYSTEM_PROMPT,
  MAX_USER_MESSAGE_CHARS,
  MAX_HISTORY_TURNS,
} from "@/lib/copilot-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Per-user rate limiter (in-memory) ────────────────────────────────────────
// 30 requests per business per hour. Higher than the public chat because these
// are authenticated paying merchants, not anonymous visitors.
const RATE_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;
const bucket = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    bucket.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

type IncomingMessage = { role: "user" | "assistant"; content: string };

// ── Pull a snapshot of the shop's data for context ───────────────────────
type Business = { name: string | null; type: string | null; subdomain: string | null; settings: unknown };

async function buildBusinessContext(businessId: string, biz: Business): Promise<string> {
  const admin = createAdminClient();
  const now = new Date();
  const tz = shopTimezone(biz);
  const t = shopToday(now, tz);
  const todayStart = shopMidnight(t.y, t.m, t.d, tz).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [todayOrders, weekOrders, customers, winback, recs, stock, reviews] = await Promise.all([
    admin.from("orders").select("total, source, status, refunded_amount")
      .eq("business_id", businessId).gte("created_at", todayStart),
    admin.from("orders").select("total, source, refunded_amount")
      .eq("business_id", businessId).gte("created_at", sevenDaysAgo),
    // Customers whose details were deleted at their request (037) aren't counted.
    admin.from("customers").select("segment")
      .eq("business_id", businessId).is("erased_at", null),
    admin.from("winback_rules").select("is_active, revenue")
      .eq("business_id", businessId),
    admin.from("ai_recommendations").select("title, priority")
      .eq("business_id", businessId).eq("status", "open")
      .order("created_at", { ascending: false }).limit(5),
    admin.from("stock_items").select("name, on_hand, par_level")
      .eq("business_id", businessId).order("on_hand", { ascending: true }).limit(10),
    admin.from("reviews").select("rating, status")
      .eq("business_id", businessId).gte("created_at", thirtyDaysAgo),
  ]);

  const failed = [todayOrders, weekOrders, customers, winback, recs, stock, reviews].find(r => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  return buildSnapshot({
    business: biz,
    todayOrders: todayOrders.data ?? [],
    weekOrders: weekOrders.data ?? [],
    customers: customers.data ?? [],
    winback: winback.data ?? [],
    recommendations: recs.data ?? [],
    stock: stock.data ?? [],
    reviews: reviews.data ?? [],
  }, now, tz);
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  // The shop comes from the login, so team members and staff using a shop's
  // CRM through Super Admin get their shop too (it used to read the owner's
  // row only, so a team member got "No business linked").
  const auth = await requireBusiness(null);
  if (!auth.ok) return auth.response;
  const { businessId } = auth;

  const { data: biz } = await createAdminClient()
    .from("businesses")
    .select("name, type, subdomain, settings")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) {
    return new Response(
      JSON.stringify({ error: "Business not found." }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // The same rule as the AI Copilot page in the menu (Settings → Permissions).
  const overrides = (biz.settings as { role_permissions?: Record<string, string[]> } | null)?.role_permissions ?? null;
  if (!canAccess("/copilot", auth.role, overrides, auth.isSuperAdmin)) {
    return new Response(
      JSON.stringify({ error: "Your role can't use the AI Copilot." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (isRateLimited(businessId)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a few minutes." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── API key ───────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY not configured on apps/dashboard. Add it in Vercel settings.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const cleaned: Anthropic.MessageParam[] = incoming
    .filter((m): m is IncomingMessage =>
      m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_USER_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY_TURNS);

  if (cleaned.length === 0 || cleaned[cleaned.length - 1]!.role !== "user") {
    return new Response(
      JSON.stringify({ error: "The last message must be from the user." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Build snapshot + system prompt ───────────────────────────────────────
  let snapshot = "";
  try {
    snapshot = await buildBusinessContext(businessId, biz as Business);
  } catch (err) {
    console.error("[copilot] Failed to build context:", err);
    snapshot = "=== BUSINESS SNAPSHOT ===\nUnable to load data snapshot.\n=== END ===";
  }

  // ── Stream ────────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          // System prompt has two blocks: the static instructions (cached) and
          // the fresh business snapshot (not cached).
          system: [
            {
              type: "text",
              text: COPILOT_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            } as Anthropic.TextBlockParam,
            { type: "text", text: snapshot } as Anthropic.TextBlockParam,
          ],
          messages: cleaned,
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `[copilot] Anthropic API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? `[copilot] ${err.message}`
              : "[copilot] Unknown error";
        console.error(message);
        controller.enqueue(
          encoder.encode(
            "\n\n_Sorry — I hit an error. Try again, or refresh the page._",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
