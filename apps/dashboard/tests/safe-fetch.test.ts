// The website import's fetch (lib/import/safe-fetch.ts). It only connects to
// an address it checked, so a host can't pass the check and then switch its
// DNS answer to a private address (the second security run's DNS gap).
// A local server stands in for a shop's website, with the DNS answers faked.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";

const dns = vi.hoisted(() => ({ answers: [] as string[][], calls: 0 }));
vi.mock("node:dns/promises", () => ({
  lookup: async () => {
    const answer = dns.answers[Math.min(dns.calls, dns.answers.length - 1)] ?? [];
    dns.calls++;
    return answer.map(address => ({ address, family: address.includes(":") ? 6 : 4 }));
  },
}));

import { isBlockedAddress, safeFetch } from "@/lib/import/safe-fetch";

let server: http.Server;
let port = 0;
let hits = 0;
const PAGE = "<html><body><h1>Nonna's Kitchen</h1></body></html>";

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits++;
    if (req.url === "/gz") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-encoding": "gzip" });
      return res.end(zlib.gzipSync(PAGE));
    }
    if (req.url === "/move") {
      res.writeHead(302, { location: "/" });
      return res.end();
    }
    if (req.url === "/big") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("x".repeat(5000));
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>(r => server.close(() => r())));
beforeEach(() => { dns.answers = []; dns.calls = 0; hits = 0; });

// The test server is on 127.0.0.1, so these tests let that one address through.
const onlyLocal = (ip: string) => ip !== "127.0.0.1";
// safeFetch only takes the normal web ports, so the URL's port is swapped as
// the request goes out.
const url = (path = "/") => `http://shop.example${path}`;

async function fetchLocal(path: string, opts: Partial<Parameters<typeof safeFetch>[1]> = {}) {
  const realRequest = http.request;
  const spy = vi.spyOn(http, "request").mockImplementation(((u: URL, o: http.RequestOptions, cb: (res: http.IncomingMessage) => void) => {
    const moved = new URL(u.toString());
    moved.port = String(port);
    return realRequest(moved, o, cb);
  }) as typeof http.request);
  try {
    return await safeFetch(url(path), { maxBytes: 100_000, timeoutMs: 5_000, ...opts });
  } finally {
    spy.mockRestore();
  }
}

describe("the import's fetch", () => {
  it("reads a page, and unzips one sent zipped", async () => {
    dns.answers = [["127.0.0.1"]];
    const doc = await fetchLocal("/", { blocked: onlyLocal });
    expect(doc.body.toString()).toBe(PAGE);
    expect(doc.contentType).toContain("text/html");
    const gz = await fetchLocal("/gz", { blocked: onlyLocal });
    expect(gz.body.toString()).toBe(PAGE);
  });

  it("follows a redirect and checks the address again", async () => {
    dns.answers = [["127.0.0.1"]];
    const doc = await fetchLocal("/move", { blocked: onlyLocal });
    expect(doc.body.toString()).toBe(PAGE);
    expect(dns.calls).toBeGreaterThanOrEqual(4); // a check and a connection for each hop
  });

  it("never connects when the address changes to a private one after the check", async () => {
    // The first answer is public and passes the check. The second, when the
    // connection is made, is the server's own address.
    dns.answers = [["93.184.216.34"], ["127.0.0.1"]];
    await expect(fetchLocal("/")).rejects.toThrow("That address isn't a public website");
    expect(hits).toBe(0);
  });

  it("refuses a host that answers with a private address straight away", async () => {
    dns.answers = [["10.0.0.5"]];
    await expect(fetchLocal("/")).rejects.toThrow("That address isn't a public website");
    expect(hits).toBe(0);
  });

  it("stops at the size limit, or keeps the start when asked to", async () => {
    dns.answers = [["127.0.0.1"]];
    await expect(fetchLocal("/big", { blocked: onlyLocal, maxBytes: 1000 })).rejects.toThrow("too large");
    const cut = await fetchLocal("/big", { blocked: onlyLocal, maxBytes: 1000, truncate: true });
    expect(cut.body.length).toBe(1000);
    expect(cut.truncated).toBe(true);
  });

  it("knows the private addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
    for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });
});
