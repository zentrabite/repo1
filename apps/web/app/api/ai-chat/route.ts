import Anthropic from "@anthropic-ai/sdk";
import {
  ZENTRABITE_SYSTEM_PROMPT,
  MAX_USER_MESSAGE_CHARS,
  MAX_HISTORY_TURNS,
} from "../../../lib/zentrabite-context";

export const runtime = "nodejs";

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY not set on the server. Add it to apps/web's environment (Vercel → Settings → Environment Variables).",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

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
  if (incoming.length === 0) {
    return new Response(JSON.stringify({ error: "messages is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitise: trim, cap length, drop anything we don't recognise.
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

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 2048,
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
            "\n\n_Sorry — I hit an error talking to the model. Try again, or book a call at /contact and a human can help._",
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
