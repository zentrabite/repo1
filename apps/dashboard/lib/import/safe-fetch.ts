// ─── Safe fetch for the website import ──────────────────────────────────────
// Staff paste a restaurant's URL and the server fetches it, so the server must
// not be talked into fetching its own network. Rules:
//   • http and https only, standard ports only, no user:pass@ in the URL
//   • the hostname must resolve only to public addresses (checked again on
//     every redirect hop, max 5 hops)
//   • the connection goes to the address that was checked. The request uses
//     a DNS lookup that refuses any answer with a private address, at the
//     moment it connects, so a host can't pass the check and then switch its
//     DNS answer to a private one (25 Nov, the second security run's gap).
//   • time limit and size limit on every response, after unzipping

import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { Readable } from "node:stream";
import zlib from "node:zlib";

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
  /** Which addresses are refused. Only tests change it. */
  blocked?:   (ip: string) => boolean;
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

const NOT_PUBLIC = "That address isn't a public website";

async function publicAddresses(host: string, blocked: (ip: string) => boolean): Promise<{ address: string; family: number }[]> {
  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ImportFetchError(`Couldn't find the website ${host}`);
  }
  if (!addrs.length || addrs.some(a => blocked(a.address))) throw new ImportFetchError(NOT_PUBLIC);
  return addrs;
}

async function assertPublicHost(hostname: string, blocked: (ip: string) => boolean): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|home\.arpa)$/.test(host)) {
    throw new ImportFetchError(NOT_PUBLIC);
  }
  if (net.isIP(host)) {
    if (blocked(host)) throw new ImportFetchError(NOT_PUBLIC);
    return;
  }
  await publicAddresses(host, blocked);
}

type LookupCallback = (err: Error | null, address: string | { address: string; family: number }[], family?: number) => void;

/** The lookup the connection itself uses. It checks again, so the address it connects to is one that was checked. */
function guardedLookup(blocked: (ip: string) => boolean) {
  return (hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    publicAddresses(hostname, blocked).then(
      addrs => (options?.all ? callback(null, addrs) : callback(null, addrs[0]!.address, addrs[0]!.family)),
      err => callback(err as Error, ""),
    );
  };
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

type Answer = { status: number; header: (name: string) => string; body: Readable };

/** One GET, connecting only to a checked address. No redirects followed. */
function get(url: URL, headers: Record<string, string>, signal: AbortSignal, blocked: (ip: string) => boolean): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, { method: "GET", headers, signal, agent: false, lookup: guardedLookup(blocked) as never }, res => {
      const header = (name: string) => {
        const v = res.headers[name.toLowerCase()];
        return Array.isArray(v) ? v.join(", ") : v ?? "";
      };
      // Unzipped here, so the size limit counts what's actually read.
      const encoding = header("content-encoding").toLowerCase().trim();
      let body: Readable = res;
      if (encoding === "gzip" || encoding === "x-gzip") body = res.pipe(zlib.createGunzip());
      else if (encoding === "deflate") body = res.pipe(zlib.createInflate());
      else if (encoding === "br") body = res.pipe(zlib.createBrotliDecompress());
      if (body !== res) res.on("error", err => body.destroy(err));
      resolve({ status: res.statusCode ?? 0, header, body });
    });
    req.on("error", reject);
    req.end();
  });
}

async function readCapped(answer: Answer, maxBytes: number, truncate: boolean): Promise<{ body: Buffer; truncated: boolean }> {
  const declared = Number(answer.header("content-length") || 0);
  if (declared > maxBytes && !truncate && !answer.header("content-encoding")) {
    answer.body.destroy();
    throw new ImportFetchError("File is too large to import");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;
  try {
    for await (const chunk of answer.body) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += value.byteLength;
      if (size > maxBytes) {
        if (!truncate) throw new ImportFetchError("File is too large to import");
        chunks.push(value.subarray(0, value.byteLength - (size - maxBytes)));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ImportFetchError) throw err;
    throw new ImportFetchError(err instanceof Error && err.name === "AbortError" ? "The website took too long to answer" : "Couldn't read the website");
  } finally {
    answer.body.destroy();
  }
  return { body: Buffer.concat(chunks), truncated };
}

export async function safeFetch(input: string | URL, opts: Options): Promise<FetchedDoc> {
  let current = typeof input === "string" ? normaliseUrl(input) : normaliseUrl(input.toString());
  const signal = AbortSignal.timeout(opts.timeoutMs);
  const blocked = opts.blocked ?? isBlockedAddress;
  const headers = {
    "User-Agent":      BROWSER_UA,
    "Accept":          opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  };

  for (let hop = 0; hop <= 5; hop++) {
    // Checked here for a plain message, and again as the connection is made.
    await assertPublicHost(current.hostname, blocked);

    let res: Answer;
    try {
      res = await get(current, headers, signal, blocked);
    } catch (err) {
      if (err instanceof ImportFetchError) throw err;
      const name = err instanceof Error ? err.name : "";
      const msg = name === "TimeoutError" || name === "AbortError" ? "The website took too long to answer" : "Couldn't reach the website";
      throw new ImportFetchError(msg);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.header("location");
      res.body.destroy();
      if (!loc) throw new ImportFetchError("The website sent a broken redirect", res.status);
      current = normaliseUrl(new URL(loc, current).toString());
      continue;
    }

    if (res.status < 200 || res.status > 299) {
      res.body.destroy();
      throw new ImportFetchError(`The website answered with an error (${res.status})`, res.status);
    }

    const { body, truncated } = await readCapped(res, opts.maxBytes, Boolean(opts.truncate));
    return {
      url:         current.toString(),
      status:      res.status,
      contentType: res.header("content-type").toLowerCase(),
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
