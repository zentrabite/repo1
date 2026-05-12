// ═══════════════════════════════════════════════════════════════════════════
// /api/copilot — In-CRM AI assistant
// Reads the merchant's own data, sends to Claude with context, streams reply.
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { createSessionClient, createAdminClient } from "@/lib/supabase-server";
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

// ── Pull a snapshot of the merchant's data for context ───────────────────────
async function buildBusinessContext(businessId: string): Promise<string> {
  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    bizRes,
    todayOrdersRes,
    weekOrdersRes,
    customersRes,
    winbackRes,
    recsRes,
    lowStockRes,
    reviewsRes,
  ] = await Promise.all([
    admin
      .from("businesses")
      .select("name, type, subdomain, contact_phone, contact_email, address, settings")
      .eq("id", businessId)
      .single(),
    admin
      .from("orders")
      .select("total, source, status")
      .eq("business_id", businessId)
      .gte("created_at", `${today}T00:00:00`),
    admin
      .from("orders")
      .select("total, source")
      .eq("business_id", businessId)
      .gte("created_at", sevenDaysAgo),
    admin
      .from("customers")
      .select("segment, ltv")
      .eq("business_id", businessId),
    admin
      .from("winback_rules")
      .select("name, is_active, redemptions, revenue")
      .eq("business_id", businessId),
    admin
      .from("ai_recommendations")
      .select("title, priority, body")
      .eq("business_id", businessId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("stock_items")
      .select("name, on_hand, par_level")
      .eq("business_id", businessId)
      .order("on_hand", { ascending: true })
      .limit(10),
    admin
      .from("reviews")
      .select("rating, status, source")
      .eq("business_id", businessId)
      .gte("created_at", thirtyDaysAgo),
  ]);

  const biz = bizRes.data;
  const todayOrders = todayOrdersRes.data ?? [];
  const weekOrders = weekOrdersRes.data ?? [];
  const customers = customersRes.data ?? [];
  const winback = winbackRes.data ?? [];
  const recs = recsRes.data ?? [];
  const stock = lowStockRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const todayRev = todayOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const weekRev = weekOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const directOrders = todayOrders.filter((o: any) => o.source === "direct").length;
  const newStatus = todayOrders.filter((o: any) => o.status === "New").length;

  const vip = customers.filter((c: any) => c.segment === "VIP").length;
  const atRisk = customers.filter((c: any) => c.segment === "At Risk").length;
  const newCust = customers.filter((c: any) => c.segment === "New").length;
  const regular = customers.filter((c: any) => c.segment === "Regular").length;

  const winbackRevenue = winback.reduce((s: number, r: any) => s + (Number(r.revenue) ?? 0), 0);
  const winbackActive = winback.filter((r: any) => r.is_active).length;

  const lowStock = stock.filter((s: any) =>
    Number(s.on_hand ?? 0) <= Number(s.par_level ?? 0),
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : "—";
  const pendingReviews = reviews.filter((r: any) => r.status === "pending").length;

  return `
=== BUSINESS SNAPSHOT (live data — ${new Date().toLocaleString("en-AU")}) ===

Business: ${biz?.name ?? "Unknown"} (${biz?.type ?? "—"})
Storefront: ${biz?.subdomain ? `https://${biz.subdomain}.zentrabite.com.au` : "not set"}

TODAY:
- Orders: ${todayOrders.length} (${newStatus} new awaiting action)
- Revenue: $${todayRev.toFixed(2)}
- Direct vs aggregator: ${directOrders} direct / ${todayOrders.length - directOrders} aggregator

LAST 7 DAYS:
- Orders: ${weekOrders.length}
- Revenue: $${weekRev.toFixed(2)}

CUSTOMERS (${customers.length} total):
- VIP: ${vip}
- Regular: ${regular}
- New: ${newCust}
- At Risk: ${atRisk}

WIN-BACK ENGINE:
- Active rules: ${winbackActive} / ${winback.length} total
- Lifetime recovered revenue: $${winbackRevenue.toFixed(2)}

REVIEWS (last 30 days):
- Total: ${reviews.length}
- Avg rating: ${avgRating}
- Pending replies: ${pendingReviews}

LOW STOCK (≤ par level): ${lowStock.length > 0
    ? lowStock.map((s: any) => `${s.name} (${s.on_hand}/${s.par_level})`).join(", ")
    : "none"}

OPEN AI RECOMMENDATIONS: ${recs.length > 0
    ? recs.map((r: any) => `[${r.priority}] ${r.title}`).join(" · ")
    : "none"}
=== END SNAPSHOT ===
`.trim();
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(
      JSON.stringify({ error: "Not authenticated." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const businessId = userRow?.business_id as string | undefined;
  if (!businessId) {
    return new Response(
      JSON.stringify({ error: "No business linked to this user." }),
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
    snapshot = await buildBusinessContext(businessId);
  } catch (err) {
    console.error("[copilot] Failed to build context:", err);
    snapshot = "=== BUSINESS SNAPSHOT ===\nUnable to load data snapshot.\n=== END ===";
  }

  const fullSystem = `${COPILOT_SYSTEM_PROMPT}\n\n${snapshot}`;

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
