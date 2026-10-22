// ─── Safe fetch for the website import ──────────────────────────────────────
// Staff paste a restaurant's URL and the server fetches it, so the server must
// not be talked into fetching its own network. Rules:
//   • http and https only, standard ports only, no user:pass@ in the URL
//   • the hostname must resolve only to public addresses (checked again on
//     every redirect hop, max 5 hops)
//   • time limit and size limit on every response
//
// Known gap: fetch() resolves DNS again after our check, so a host that
// changes its DNS answer between the two lookups could still slip through.
// The route is super-admin only, which keeps that risk small.

import { lookup } from "node:dns/promises";
import net from "node:net";

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export class ImportFetchError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ImportFetchError";
  }
}

export type FetchedDoc = {
  url:         string;   // final URL after redirects
  status:      number;
  contentType: string;
  body:        Buffer;
  truncated:   boolean;
};

type Options = {
  maxBytes:   number;
  timeoutMs:  number;
  accept?:    string;
  /** Keep the first maxBytes instead of failing (fine for HTML, not for PDFs or images). */
  truncate?:  boolean;
};

// ─── Address checks ─────────────────────────────────────────────────────────

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function isBlockedV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const a = ip.toLowerCase();
  if (a === "::" || a === "::1") return true;
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]!);
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(a)) return true; // mapped v4 in hex form
  if (/^f[cd]/.test(a)) return true;           // fc00::/7 unique local
  if (/^fe[89ab]/.test(a)) return true;        // fe80::/10 link local
  if (/^ff/.test(a)) return true;              // multicast
  if (a.startsWith("64:ff9b:")) return true;   // NAT64, can reach v4 space
  if (a.startsWith("2001:db8")) return true;   // documentation
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|home\.arpa)$/.test(host)) {
    throw new ImportFetchError("That address isn't a public website");
  }
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new ImportFetchError("That address isn't a public website");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ImportFetchError(`Couldn't find the website ${host}`);
  }
  if (!addrs.length || addrs.some(a => isBlockedAddress(a.address))) {
    throw new ImportFetchError("That address isn't a public website");
  }
}

export function normaliseUrl(input: string): URL {
  let raw = input.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { throw new ImportFetchError("That doesn't look like a web address"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ImportFetchError("Only http and https links can be imported");
  if (url.username || url.password) throw new ImportFetchError("Links with a username or password can't be imported");
  if (url.port && url.port !== "80" && url.port !== "443") throw new ImportFetchError("Only normal web ports can be imported");
  url.hash = "";
  return url;
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

async function readCapped(res: Response, maxBytes: number, truncate: boolean): Promise<{ body: Buffer; truncated: boolean }> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes && !truncate) {
    await res.body?.cancel().catch(() => {});
    throw new ImportFetchError("File is too large to import");
  }
  if (!res.body) return { body: Buffer.alloc(0), truncated: false };
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      if (!truncate) {
        await reader.cancel().catch(() => {});
        throw new ImportFetchError("File is too large to import");
      }
      chunks.push(Buffer.from(value.subarray(0, value.byteLength - (size - maxBytes))));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(Buffer.from(value));
  }
  return { body: Buffer.concat(chunks), truncated };
}

export async function safeFetch(input: string | URL, opts: Options): Promise<FetchedDoc> {
  let current = typeof input === "string" ? normaliseUrl(input) : normaliseUrl(input.toString());
  const signal = AbortSignal.timeout(opts.timeoutMs);

  for (let hop = 0; hop <= 5; hop++) {
    await assertPublicHost(current.hostname);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent":      BROWSER_UA,
          "Accept":          opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-AU,en;q=0.9",
        },
      });
    } catch (err) {
      const msg = err instanceof Error && err.name === "TimeoutError" ? "The website took too long to answer" : "Couldn't reach the website";
      throw new ImportFetchError(msg);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!loc) throw new ImportFetchError("The website sent a broken redirect", res.status);
      current = normaliseUrl(new URL(loc, current).toString());
      continue;
    }

    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new ImportFetchError(`The website answered with an error (${res.status})`, res.status);
    }

    const { body, truncated } = await readCapped(res, opts.maxBytes, Boolean(opts.truncate));
    return {
      url:         current.toString(),
      status:      res.status,
      contentType: (res.headers.get("content-type") ?? "").toLowerCase(),
      body,
      truncated,
    };
  }
  throw new ImportFetchError("The website redirected too many times");
}

export function decodeText(doc: FetchedDoc): string {
  const m = doc.contentType.match(/charset=([\w-]+)/i);
  const charset = (m?.[1] ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset === "utf8" ? "utf-8" : charset).decode(doc.body);
  } catch {
    return new TextDecoder("utf-8").decode(doc.body);
  }
}
