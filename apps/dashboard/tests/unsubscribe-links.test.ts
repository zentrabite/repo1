// Unsubscribe links in marketing emails (lib/unsubscribe.ts). They're signed
// with a secret kept in Supabase Vault (migration 035), not with the
// database key, so replacing a leaked key doesn't break links already sent.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

vi.mock("server-only", () => ({}));

const ID = "11111111-2222-4333-8444-555555555555";
const load = async () => { vi.resetModules(); return import("@/lib/unsubscribe"); };

beforeEach(() => { vi.unstubAllEnvs(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dashboard.zentrabite.com"); });

describe("unsubscribe links", () => {
  it("make a link the site reads back, whatever the database key is", async () => {
    const u = await load();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "old-key");
    const links = await u.unsubscribeLinks(fakeDb(), ID);
    expect(links?.page).toMatch(/^https:\/\/dashboard\.zentrabite\.com\/unsubscribe\?t=/);
    const token = decodeURIComponent(links!.page.split("t=")[1]!);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "a-new-key-after-a-leak");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_new");
    expect(await u.readUnsubscribeToken(fakeDb(), token)).toBe(ID);
  });

  it("refuse a changed or made-up token", async () => {
    const u = await load();
    const token = (await u.unsubscribeToken(fakeDb(), ID))!;
    const other = "11111111-2222-4333-8444-666666666666";
    expect(await u.readUnsubscribeToken(fakeDb(), `${other}${token.slice(ID.length)}`)).toBeNull();
    expect(await u.readUnsubscribeToken(fakeDb(), `${ID}.nope`)).toBeNull();
    expect(await u.readUnsubscribeToken(fakeDb(), "")).toBeNull();
    const differentSecret = fakeDb({ "rpc.link_signing_secret": () => ({ data: "another-secret-".padEnd(64, "y"), error: null }) });
    const fresh = await load();
    expect(await fresh.readUnsubscribeToken(differentSecret, token)).toBeNull();
  });

  it("aren't made when the secret can't be read, so the email isn't sent", async () => {
    const u = await load();
    const broken = fakeDb({ "rpc.link_signing_secret": () => ({ data: null, error: { message: "permission denied" } }) });
    expect(await u.unsubscribeLinks(broken, ID)).toBeNull();
    await expect(u.readUnsubscribeToken(broken, `${ID}.abc`)).rejects.toThrow(/secret unavailable/);
  });
});
