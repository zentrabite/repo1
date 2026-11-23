// ─── Private page and event counts, sent to PostHog ────────────────────────
// No PostHog script and no cookies. This sends a small JSON event straight
// to PostHog's capture endpoint, so we decide exactly what leaves the
// browser:
//   • the event name, the page path, and from the address only utm_* tags
//     (never the rest of the query string)
//   • the site the visitor came from, not the full address
//   • a random id kept in this browser, and a session id per tab
// Never names, emails, phone numbers or anything typed into a form. Events
// are anonymous (no person profiles in PostHog).
//
// The CRM copy of apps/web/lib/analytics.ts. Each part is switched on by
// name in NEXT_PUBLIC_POSTHOG_ON (with NEXT_PUBLIC_POSTHOG_KEY set):
//   setup     the onboarding wizard and the seller's handover form (staff)
//   ordering  each shop's ordering page (the shop's customers)
// Orders are counted on the server (lib/analytics-server.ts), so an ad
// blocker can't hide them. Visitors with Do Not Track or Global Privacy
// Control on are never counted. Ask PostHog to discard IP addresses
// (project settings). The privacy policy must name PostHog before
// "ordering" is switched on.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
const PARTS = (process.env.NEXT_PUBLIC_POSTHOG_ON ?? "").split(",").map(s => s.trim());

export type Part = "setup" | "ordering";

const SESSION_IDLE_MS = 30 * 60 * 1000;

function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack === "1" || n.globalPrivacyControl === true;
}

/** A time-ordered random id (UUID v7), the form PostHog expects for sessions. */
function uuidv7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let ms = Date.now();
  for (let i = 5; i >= 0; i--) { b[i] = ms % 256; ms = Math.floor(ms / 256); }
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function stored(store: () => Storage, key: string, make: () => string): string {
  try {
    const s = store();
    const v = s.getItem(key);
    if (v) return v;
    const fresh = make();
    s.setItem(key, fresh);
    return fresh;
  } catch {
    return make();
  }
}

function sessionId(): string {
  try {
    const s = sessionStorage;
    const last = Number(s.getItem("zb_s_at") ?? 0);
    let id = s.getItem("zb_s");
    if (!id || Date.now() - last > SESSION_IDLE_MS) { id = uuidv7(); s.setItem("zb_s", id); }
    s.setItem("zb_s_at", String(Date.now()));
    return id;
  } catch {
    return uuidv7();
  }
}

/** The page address without its query string, keeping only utm_* tags. */
function pageProps(): Record<string, string> {
  const u = new URL(location.href);
  const props: Record<string, string> = {
    $current_url: `${u.origin}${u.pathname}`,
    $host: u.host,
    $pathname: u.pathname,
  };
  for (const [k, v] of u.searchParams) if (/^utm_(source|medium|campaign|term|content)$/.test(k)) props[k] = v.slice(0, 100);
  if (document.referrer) {
    try {
      const r = new URL(document.referrer);
      if (r.host !== u.host) { props.$referrer = r.origin; props.$referring_domain = r.host; }
    } catch { /* not a full address */ }
  }
  return props;
}

export const analyticsOn = (part: Part) => PARTS.includes(part) && KEY !== "" && typeof window !== "undefined" && !optedOut();

/** The random id this browser is counted under, to join an order paid on the server to its visit. Null when off. */
export function analyticsId(part: Part): string | null {
  return analyticsOn(part) ? stored(() => localStorage, "zb_a", () => `anon-${uuidv7()}`) : null;
}

/** Sends one event. Does nothing when analytics is off. Never throws. */
export function track(part: Part, event: string, props: Record<string, string | number | boolean> = {}): void {
  if (!analyticsOn(part)) return;
  try {
    const body = JSON.stringify({
      api_key: KEY,
      event,
      distinct_id: stored(() => localStorage, "zb_a", () => `anon-${uuidv7()}`),
      timestamp: new Date().toISOString(),
      properties: {
        ...pageProps(),
        ...props,
        $session_id: sessionId(),
        $screen_width: window.innerWidth < 640 ? 360 : window.innerWidth < 1024 ? 768 : 1280,
        $lib: "zentrabite-crm",
        part,
        $process_person_profile: false,
      },
    });
    void fetch(`${HOST}/i/v0/e/`, { method: "POST", body, keepalive: true, credentials: "omit", headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch { /* counting never breaks the page */ }
}
