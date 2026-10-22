// ─── Restaurant sites on name.zentrabite.com ────────────────────────────────
// Every business gets a website at <subdomain>.zentrabite.com, served by this
// app (the wildcard *.zentrabite.com points at the repo1-dashboard project).
// proxy.ts uses tenantFromHost() to send those requests to /site/<subdomain>
// and /store/<subdomain>. Everything here is pure so proxy.ts can import it.

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "zentrabite.com").toLowerCase();

// Subdomains that are ours, not a restaurant's. Keep in sync with any new
// ZentraBite service before it goes live on a subdomain.
export const RESERVED_SUBDOMAINS = new Set([
  "www", "dashboard", "app", "api", "admin", "mail", "email", "smtp", "shop", "store", "order",
  "help", "support", "docs", "status", "blog", "news", "megarewards", "rewards",
  "staging", "dev", "test", "preview", "demo", "cdn", "assets", "static", "img", "images",
]);

/** The restaurant subdomain for a request host, or null for our own hosts. */
export function tenantFromHost(rawHost: string | null | undefined): string | null {
  const host = (rawHost ?? "").split(":")[0]!.trim().toLowerCase();
  const suffix = `.${ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes(".") || RESERVED_SUBDOMAINS.has(sub)) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(sub)) return null;
  return sub;
}

/** Public website for a business. */
export function siteUrl(subdomain: string): string {
  return `https://${subdomain}.${ROOT_DOMAIN}`;
}

/** Public ordering page for a business. */
export function orderUrl(subdomain: string): string {
  return `${siteUrl(subdomain)}/order`;
}

/**
 * The origin to send customers back to after Stripe checkout. Only our own
 * hosts are allowed, so a forged Origin header can't send customers elsewhere.
 */
export function trustedOrigin(origin: string | null | undefined, fallback: string): string {
  if (!origin) return fallback;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    const appHost = new URL(fallback).hostname.toLowerCase();
    const ok = u.protocol === "https:" && (
      host === appHost ||
      host === ROOT_DOMAIN ||
      host.endsWith(`.${ROOT_DOMAIN}`) ||
      /^repo1-dashboard[a-z0-9-]*\.vercel\.app$/.test(host)
    );
    if (ok) return `${u.protocol}//${u.host}`;
    if (process.env.NODE_ENV !== "production" && u.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) {
      return `${u.protocol}//${u.host}`;
    }
  } catch { /* fall through */ }
  return fallback;
}
