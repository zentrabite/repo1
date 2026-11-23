// ─── Counting events from the server ────────────────────────────────────────
// For things a browser can't be trusted to report: an order paid, a shop
// created or published. Same rules as lib/analytics.ts. Off unless
// NEXT_PUBLIC_POSTHOG_KEY is set and NEXT_PUBLIC_POSTHOG_ON lists the part.
// Never sends a customer's name, email or phone. Never throws, and gives up
// after 2 seconds so it can't slow a webhook down.

import "server-only";
import type { Part } from "@/lib/analytics";

export async function captureServer(part: Part, event: string, distinctId: string, props: Record<string, string | number | boolean | null> = {}): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
  const on = (process.env.NEXT_PUBLIC_POSTHOG_ON ?? "").split(",").map(s => s.trim()).includes(part);
  if (!key || !on) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        timestamp: new Date().toISOString(),
        properties: { ...props, part, $lib: "zentrabite-server", $process_person_profile: false },
      }),
    });
  } catch (err) {
    console.warn("[analytics] not counted", event, err instanceof Error ? err.message : err);
  }
}
