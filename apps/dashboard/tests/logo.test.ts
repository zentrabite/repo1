// Settings' Upload logo goes through the server (/api/logo, lib/logo.ts),
// owners and managers only, and only real PNG, JPG or WEBP images. The
// storage rules that let any login at the shop write logos are gone (043),
// checked in tests/logo-db.test.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

vi.mock("server-only", () => ({}));

const SHOP = "bbbbbbbb-0000-4000-8000-000000000002";
const OTHER = "dddddddd-0000-4000-8000-000000000004";
const OWNER = "cccccccc-0000-4000-8000-000000000003";
const STAFF = "eeeeeeee-0000-4000-8000-000000000005";

const h = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("./fake-db").fakeDb> & { uploads: { path: string; type: string }[] },
  user: {} as Record<string, unknown>,
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/supabase-server", () => ({
  createSessionClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
  createAdminClient: () => h.db,
  createServerClient: () => h.db,
}));

import { POST } from "@/app/api/logo/route";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`);

let logoUrl: Record<string, unknown>;

function world() {
  const db = fakeDb({
    "users.select": () => ({ data: { business_id: h.user.id === OWNER ? SHOP : null, is_super_admin: false }, error: null }),
    "business_members.select": () => ({ data: [{ business_id: SHOP, role: "Staff", status: "joined" }], error: null }),
    "businesses.select": () => ({ data: { suspended_at: null }, error: null }),
    "businesses.update": (q: Query) => { logoUrl[filterValue(q, "id") as string] = (q.payload as { logo_url: unknown }).logo_url; return { data: null, error: null }; },
  });
  const uploads: { path: string; type: string }[] = [];
  const storage = {
    from: (bucket: string) => ({
      upload: async (path: string, _b: Buffer, o: { contentType: string }) => { uploads.push({ path: `${bucket}/${path}`, type: o.contentType }); return { error: null }; },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://db.example/storage/v1/object/public/${bucket}/${path}` } }),
    }),
  };
  return Object.assign(db, { storage, uploads });
}

function upload(file: Buffer, name: string, businessId?: string) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(file)], name));
  if (businessId) form.append("business_id", businessId);
  return POST(new Request("http://x/api/logo", { method: "POST", body: form }));
}

beforeEach(() => {
  logoUrl = {};
  h.user = { id: OWNER, email: "owner@example.com" };
  h.db = world();
});

describe("Upload logo in Settings", () => {
  it("saves a real image for the login's own shop, where browsers can't write", async () => {
    const res = await upload(PNG, "logo.png", SHOP);
    expect(res.status).toBe(200);
    const { logo_url } = await res.json() as { logo_url: string };
    expect(h.db.uploads).toHaveLength(1);
    expect(h.db.uploads[0]!.path).toMatch(new RegExp(`^menu-images/logos/${SHOP}/\\d+\\.png$`));
    expect(h.db.uploads[0]!.type).toBe("image/png");
    expect(logo_url).toContain(`/menu-images/logos/${SHOP}/`);
    expect(logoUrl).toEqual({ [SHOP]: logo_url });
  });

  it("judges the file by its bytes, not its name", async () => {
    const res = await upload(SVG, "logo.png", SHOP);
    expect(res.status).toBe(400);
    expect(h.db.uploads).toHaveLength(0);
    expect(logoUrl).toEqual({});
  });

  it("won't save a logo for another shop", async () => {
    expect((await upload(PNG, "logo.png", OTHER)).status).toBe(403);
    expect(h.db.uploads).toHaveLength(0);
  });

  it("is for owners and managers, not staff or POS logins", async () => {
    h.user = { id: STAFF, email: "staff@example.com", email_confirmed_at: "2026-11-01T00:00:00Z", invited_at: "2026-11-01T00:00:00Z" };
    h.db = world();
    const res = await upload(PNG, "logo.png", SHOP);
    expect(res.status).toBe(403);
    expect(h.db.uploads).toHaveLength(0);
    expect(logoUrl).toEqual({});
  });

  it("needs a login", async () => {
    h.user = null as unknown as Record<string, unknown>;
    expect((await upload(PNG, "logo.png", SHOP)).status).toBe(401);
  });
});
