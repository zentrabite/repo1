import Anthropic from "@anthropic-ai/sdk";
import {
  ZENTRABITE_SYSTEM_PROMPT,
  MAX_USER_MESSAGE_CHARS,
  MAX_HISTORY_TURNS,
} from "../../../lib/zentrabite-context";

export const runtime = "nodejs";

// ── Spend guards ─────────────────────────────────────────────────────────────
// Everything below lives in memory, so each serverless instance keeps its own
// counts and they reset when the instance is recycled. That makes them a
// brake, not a wall. The real ceiling is the monthly spend limit on the
// Anthropic key, which is set in the Anthropic console.
//
//   • per IP: 3 requests a minute and 8 an hour
//   • per instance: 120 requests an hour across everyone
//   • request body: 32 KB at most, refused before it's read in full
//   • conversation: the last MAX_HISTORY_TURNS messages, each cut to
//     MAX_USER_MESSAGE_CHARS
//   • answer: max_tokens 400 (about four short paragraphs)
const IP_PER_MINUTE = 3;
const IP_PER_HOUR = 8;
const INSTANCE_PER_HOUR = 120;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_OUTPUT_TOKENS = 400;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_TRACKED_IPS = 5000;

// Request times per IP in the last hour.
const ipHits = new Map<string, number[]>();
// Request times for this whole instance in the last hour.
let instanceHits: number[] = [];

type LimitResult = "ok" | "ip" | "instance";

function checkLimits(ip: string): LimitResult {
  const now = Date.now();

  instanceHits = instanceHits.filter((t) => now - t < HOUR_MS);
  if (instanceHits.length >= INSTANCE_PER_HOUR) return "instance";

  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  const lastMinute = hits.filter((t) => now - t < MINUTE_MS).length;
  if (hits.length >= IP_PER_HOUR || lastMinute >= IP_PER_MINUTE) {
    ipHits.set(ip, hits);
    return "ip";
  }

  hits.push(now);
  ipHits.set(ip, hits);
  instanceHits.push(now);

  // Keep the map from growing without end on a long-lived instance.
  if (ipHits.size > MAX_TRACKED_IPS) {
    for (const [key, times] of ipHits) {
      if (times.every((t) => now - t >= HOUR_MS)) ipHits.delete(key);
    }
  }
  return "ok";
}

function clientIp(req: Request): string {
  // Vercel sets both of these from the real connection.
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const UNAVAILABLE =
  "The chat isn't available right now. Try again later, or book a call at /contact and a person can help.";

/** Reads the body as text, giving up as soon as it passes the limit. */
async function readBody(req: Request, limit: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}
// ─────────────────────────────────────────────────────────────────────────────

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  // Refuse big bodies before doing any work.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json({ error: "That message is too long." }, 413);
  }

  const limit = checkLimits(clientIp(req));
  if (limit === "ip") {
    return json({ error: "Too many questions in a short time. Wait a few minutes and try again." }, 429, {
      "Retry-After": "120",
    });
  }
  if (limit === "instance") {
    console.error("[ai-chat] hourly cap for this instance reached");
    return json({ error: UNAVAILABLE }, 503, { "Retry-After": "600" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-chat] ANTHROPIC_API_KEY is not set, so the chat can't answer");
    return json({ error: UNAVAILABLE }, 503);
  }

  const raw = await readBody(req, MAX_BODY_BYTES);
  if (raw === null) {
    return json({ error: "That message is too long." }, 413);
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  if (incoming.length === 0) {
    return json({ error: "messages is required." }, 400);
  }

  // Sanitise: keep only the latest turns, trim, cap length, drop anything we
  // don't recognise. The page sends the whole conversation every time.
  const cleaned: Anthropic.MessageParam[] = incoming
    .slice(-MAX_HISTORY_TURNS * 2)
    .filter(
      (m): m is IncomingMessage =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_USER_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY_TURNS);

  // The conversation must start with the visitor (the page's greeting is an
  // assistant message).
  while (cleaned.length > 0 && cleaned[0]!.role !== "user") cleaned.shift();

  if (cleaned.length === 0 || cleaned[cleaned.length - 1]!.role !== "user") {
    return json({ error: "The last message must be from the user." }, 400);
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [
            {
              type: "text",
              text: ZENTRABITE_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
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
            ? `[ai-chat] Anthropic API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? `[ai-chat] ${err.message}`
              : "[ai-chat] Unknown error";
        console.error(message);
        controller.enqueue(
          encoder.encode(
            "\n\n_Sorry, something went wrong on our end. Try again, or book a call at /contact and a person can help._",
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
