// Tests for a shop's team (lib/team.ts, /api/team, /api/team/invite and the
// Orders page's pause switch, /api/orders/pause). The database side, what a
// team member's browser can reach, is in tenant-isolation.test.ts.
//
// Before this, an invited team member logged in to an empty CRM, Settings
// listed only the person looking at it (always as Owner), every invite was
// Staff, and nobody could be removed.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  auth: { ok: true, businessId: "shop-a", userId: "u-owner", email: "owner@a.com", role: "Owner", isSuperAdmin: false } as Record<string, unknown>,
  inviter: { id: "u-owner", email: "owner@a.com" },
  sent: vi.fn(async () => ({ ok: false, skipped: true })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => h.db,
  createSessionClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.inviter } }) } }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: h.sent }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async (_id: unknown, opts?: { roles?: string[] }) => {
    if (opts?.roles && !opts.roles.includes(String(h.auth.role))) {
      return { ok: false, response: new Response(JSON.stringify({ error: "role" }), { status: 403 }) };
    }
    return h.auth;
  }),
}));

import { inviteProblem, listTeam, teamChangeProblem } from "@/lib/team";
import { DELETE as removeMember, GET as getTeam, PATCH as patchMember } from "@/app/api/team/route";
import { POST as invite } from "@/app/api/team/invite/route";
import { POST as pause } from "@/app/api/orders/pause/route";
import { blockedPage, firstAllowedPage } from "@/lib/permissions";

type Login = { id: string; email: string; business_id: string | null; is_seller?: boolean; is_super_admin?: boolean; invited_at?: string | null; email_confirmed_at?: string | null; last_sign_in_at?: string | null };
type Member = { business_id: string; email: string; role: string; status: string; created_at: string };

/** A fake database holding these logins and memberships, with Supabase's admin auth calls. */
function world(logins: Login[], members: Member[], extra: Record<string, (q: Query) => { data: unknown; error: null } | undefined> = {}) {
  const db = fakeDb({
    "users.select": q => {
      const biz = filterValue(q, "business_id");
      const email = filterValue(q, "email");
      let rows = logins;
      if (biz !== undefined) rows = rows.filter(l => l.business_id === biz);
      if (Array.isArray(email)) rows = rows.filter(l => email.includes(l.email));
      else if (email !== undefined) return { data: rows.find(l => l.email === email) ?? null, error: null };
      return { data: rows, error: null };
    },
    "business_members.select": q => {
      const biz = filterValue(q, "business_id");
      const email = filterValue(q, "email");
      const rows = members.filter(m => (biz === undefined || m.business_id === biz) && (email === undefined || m.email === email));
      return { data: biz !== undefined && email !== undefined ? rows[0] ?? null : rows, error: null };
    },
    ...extra,
  });
  return Object.assign(db, {
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: logins.find(l => l.id === id) ?? null }, error: null }),
        generateLink: vi.fn(async ({ type, email }: { type: string; email: string }) =>
          logins.some(l => l.email === email) && type === "invite"
            ? { data: null, error: { message: "A user with this email address has already been registered" } }
            : { data: { properties: { action_link: `https://login.example/${type}/${email}` } }, error: null }),
      },
    },
  });
}

const NOW = "2026-11-23T03:00:00Z";
const OWNER: Login = { id: "u-owner", email: "owner@a.com", business_id: "shop-a" };
const MIA: Login = { id: "u-mia", email: "mia@a.com", business_id: null, invited_at: NOW, email_confirmed_at: NOW };
const PIA: Login = { id: "u-pia", email: "pia@a.com", business_id: null, invited_at: NOW, email_confirmed_at: null };
const MAX: Login = { id: "u-max", email: "max@a.com", business_id: null, invited_at: NOW, email_confirmed_at: NOW };
const member = (email: string, role: string, status = "invited", business_id = "shop-a", created_at = NOW): Member => ({ business_id, email, role, status, created_at });

const req = (method: string, body?: unknown, url = "https://dashboard.zentrabite.com/api/team?businessId=shop-a") =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const written = (table: string, op: string) => h.db.calls.filter((q: Query) => q.table === table && q.op === op);

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { ok: true, businessId: "shop-a", userId: "u-owner", email: "owner@a.com", role: "Owner", isSuperAdmin: false };
  h.inviter = { id: "u-owner", email: "owner@a.com" };
});

describe("who can change whom", () => {
  const owner = { role: "Owner", email: "owner@a.com" };
  const manager = { role: "Manager", email: "max@a.com" };
  it("owners and managers change the team, staff don't", () => {
    expect(teamChangeProblem(owner, { email: "mia@a.com", role: "Staff" }, "Manager")).toBeNull();
    expect(teamChangeProblem(manager, { email: "mia@a.com", role: "Staff" }, "POS")).toBeNull();
    expect(teamChangeProblem({ role: "Staff", email: "mia@a.com" }, { email: "pia@a.com", role: "Staff" })).toMatch(/owner or a manager/);
  });
  it("nobody changes their own role or removes themselves", () => {
    expect(teamChangeProblem(manager, { email: "MAX@a.com", role: "Manager" }, "Owner")).toMatch(/your own role/);
    expect(teamChangeProblem(manager, { email: "max@a.com", role: "Manager" })).toMatch(/your own role/);
  });
  it("only an owner touches an owner", () => {
    expect(teamChangeProblem(manager, { email: "co@a.com", role: "Owner" }, "Staff")).toMatch(/Only an owner/);
    expect(teamChangeProblem(manager, { email: "co@a.com", role: "Owner" })).toMatch(/Only an owner/);
    expect(teamChangeProblem(manager, { email: "mia@a.com", role: "Staff" }, "Owner")).toMatch(/Only an owner/);
    expect(teamChangeProblem(owner, { email: "co@a.com", role: "Owner" })).toBeNull();
    expect(teamChangeProblem(owner, { email: "mia@a.com", role: "Staff" }, "Boss")).toBe("Unknown role.");
  });
});

describe("the team list", () => {
  it("shows the owner first, then members with whether they've joined, and leaves out removed members", async () => {
    h.db = world([OWNER, MIA, PIA], [member("owner@a.com", "Owner"), member("mia@a.com", "Staff"), member("pia@a.com", "Manager"), member("gus@a.com", "Staff", "removed"), member("zed@a.com", "POS")]);
    expect(await listTeam(h.db, "shop-a", "Mia@a.com")).toEqual([
      { email: "owner@a.com", role: "Owner", status: "owner", you: false },
      { email: "mia@a.com", role: "Staff", status: "joined", you: true },
      { email: "pia@a.com", role: "Manager", status: "invited", you: false },
      { email: "zed@a.com", role: "POS", status: "invited", you: false },
    ]);
  });

  it("is for owners and managers", async () => {
    h.db = world([OWNER, MIA], [member("mia@a.com", "Staff")]);
    expect((await getTeam(req("GET"))).status).toBe(200);
    h.auth = { ...h.auth, role: "Staff", email: "mia@a.com" };
    expect((await getTeam(req("GET"))).status).toBe(403);
  });
});

describe("changing the team", () => {
  beforeEach(() => {
    h.db = world([OWNER, MIA, MAX], [member("mia@a.com", "Staff"), member("max@a.com", "Manager"), member("co@a.com", "Owner"), member("gus@a.com", "Staff", "removed")]);
  });

  it("an owner changes a role", async () => {
    const res = await patchMember(req("PATCH", { email: "Mia@a.com", role: "Manager" }));
    expect(res.status).toBe(200);
    const [w] = written("business_members", "update");
    expect(w.payload).toEqual({ role: "Manager" });
    expect(filterValue(w, "business_id")).toBe("shop-a");
    expect(filterValue(w, "email")).toBe("mia@a.com");
  });

  it("a manager can't make an owner, change an owner, or change themselves", async () => {
    h.auth = { ...h.auth, role: "Manager", email: "max@a.com" };
    expect((await patchMember(req("PATCH", { email: "mia@a.com", role: "Owner" }))).status).toBe(403);
    expect((await patchMember(req("PATCH", { email: "co@a.com", role: "Staff" }))).status).toBe(403);
    expect((await removeMember(req("DELETE", { email: "co@a.com" }))).status).toBe(403);
    expect((await patchMember(req("PATCH", { email: "max@a.com", role: "Staff" }))).status).toBe(403);
    expect(written("business_members", "update")).toHaveLength(0);
  });

  it("staff can't change the team at all", async () => {
    h.auth = { ...h.auth, role: "Staff", email: "mia@a.com" };
    expect((await removeMember(req("DELETE", { email: "max@a.com" }))).status).toBe(403);
    expect(written("business_members", "update")).toHaveLength(0);
  });

  it("removing marks them removed, which ends their access (030)", async () => {
    const res = await removeMember(req("DELETE", { email: "mia@a.com" }));
    expect(res.status).toBe(200);
    expect(written("business_members", "update")[0].payload).toEqual({ status: "removed" });
  });

  it("the shop's owner, a removed member and a stranger aren't on the team", async () => {
    for (const email of ["owner@a.com", "gus@a.com", "who@a.com"]) {
      expect((await removeMember(req("DELETE", { email }))).status, email).toBe(404);
    }
    expect((await patchMember(req("PATCH", { email: "mia@a.com", role: "Boss" }))).status).toBe(400);
    expect((await patchMember(req("PATCH", {}))).status).toBe(400);
  });
});

describe("inviting", () => {
  const post = (body: Record<string, unknown>) => invite(req("POST", body, "https://dashboard.zentrabite.com/api/team/invite"));

  it("saves the membership with the role picked, and gives back the link while email isn't set up", async () => {
    h.db = world([OWNER], []);
    const res = await post({ email: "New@Person.com", role: "POS" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, delivered: false, actionLink: "https://login.example/invite/new@person.com" });
    expect(written("business_members", "upsert")[0].payload).toMatchObject({ business_id: "shop-a", email: "new@person.com", role: "POS", status: "invited" });
  });

  it("someone invited before gets a magic link, because their login already exists", async () => {
    h.db = world([OWNER, PIA], [member("pia@a.com", "Staff")]);
    const res = await post({ email: "pia@a.com", role: "Staff" });
    expect(await res.json()).toMatchObject({ actionLink: "https://login.example/magiclink/pia@a.com" });
  });

  it("one shop per login", async () => {
    const otherOwner: Login = { id: "u-b", email: "boss@b.com", business_id: "shop-b" };
    const seller: Login = { id: "u-s", email: "sam@zentrabite.com", business_id: null, is_seller: true, invited_at: NOW };
    const selfSignup: Login = { id: "u-self", email: "self@x.com", business_id: null, invited_at: null, email_confirmed_at: NOW };
    const elsewhere: Login = { id: "u-e", email: "eli@x.com", business_id: null, invited_at: NOW, email_confirmed_at: NOW };
    h.db = world([OWNER, otherOwner, seller, selfSignup, elsewhere], [member("eli@x.com", "Staff", "invited", "shop-b")]);
    const cases: [string, RegExp][] = [
      ["owner@a.com", /your own email/],
      ["boss@b.com", /runs another shop/],
      ["sam@zentrabite.com", /ZentraBite staff login/],
      ["eli@x.com", /another shop's team/],
      ["self@x.com", /its own ZentraBite login/],
    ];
    for (const [email, why] of cases) {
      const res = await post({ email, role: "Staff" });
      expect(res.status, email).toBe(409);
      expect((await res.json()).error, email).toMatch(why);
    }
    expect(written("business_members", "upsert")).toHaveLength(0);
    // Removed from another shop is fine.
    expect(await inviteProblem(world([elsewhere], [member("eli@x.com", "Staff", "removed", "shop-b")]), "shop-a", "eli@x.com", "owner@a.com")).toBeNull();
  });

  it("won't take a login someone used on another team", async () => {
    // Another shop invited this email, opened the link itself, then removed it.
    const used: Login = { id: "u-u", email: "una@x.com", business_id: null, invited_at: NOW, email_confirmed_at: NOW, last_sign_in_at: NOW };
    h.db = world([OWNER, used], [member("una@x.com", "Staff", "removed", "shop-b")]);
    const res = await post({ email: "una@x.com", role: "Staff" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/used on another ZentraBite team/);
    expect(written("business_members", "upsert")).toHaveLength(0);
    // Someone who worked here before can come back.
    expect(await inviteProblem(world([used], [member("una@x.com", "Staff", "removed", "shop-a")]), "shop-a", "una@x.com", "owner@a.com")).toBeNull();
    // And a login that can't be checked isn't let through.
    const down = world([used], []);
    down.auth.admin.getUserById = async () => { throw new Error("down"); };
    expect(await inviteProblem(down, "shop-a", "una@x.com", "owner@a.com")).toMatch(/Couldn't check/);
  });

  it("a second invite can't do what a role change couldn't", async () => {
    h.db = world([OWNER, MAX], [member("max@a.com", "Manager"), member("co@a.com", "Owner")]);
    h.auth = { ...h.auth, role: "Manager", email: "max@a.com" };
    h.inviter = { id: "u-max", email: "max@a.com" };
    const res = await post({ email: "co@a.com", role: "Staff" });
    expect(res.status).toBe(403);
    expect((await post({ email: "new@a.com", role: "Owner" })).status).toBe(403);
    expect(written("business_members", "upsert")).toHaveLength(0);
  });

  it("says so when the membership can't be saved, instead of pretending", async () => {
    h.db = world([OWNER], [], { "business_members.upsert": () => ({ data: null, error: { message: "boom" } as never }) });
    const res = await post({ email: "new@a.com", role: "Staff" });
    expect(res.status).toBe(500);
    expect(h.sent).not.toHaveBeenCalled();
  });
});

describe("pausing online orders", () => {
  it("works for anyone on the team and keeps the other settings", async () => {
    h.auth = { ...h.auth, role: "Staff", email: "mia@a.com" };
    h.db = fakeDb({ "businesses.select": () => ({ data: { settings: { hours: { mon: {} }, ordering: { prep_minutes: 25 } } }, error: null }) });
    const res = await pause(req("POST", { paused: true }, "https://dashboard.zentrabite.com/api/orders/pause"));
    expect(res.status).toBe(200);
    const [w] = written("businesses", "update");
    expect(w.payload).toEqual({ settings: { hours: { mon: {} }, ordering: { prep_minutes: 25, paused: true } } });
    expect(filterValue(w, "id")).toBe("shop-a");
    expect((await pause(req("POST", { paused: "yes" }, "https://dashboard.zentrabite.com/api/orders/pause"))).status).toBe(400);
  });
});

describe("pages a role can't open", () => {
  it("blocks a hidden page by its address, and leaves owners and other pages alone", () => {
    expect(blockedPage("/financials", "Staff", null)).toBe("/financials");
    expect(blockedPage("/settings", "POS", null)).toBe("/settings");
    expect(blockedPage("/zentra-rewards/report", "Staff", null)).toBe("/zentra-rewards");
    expect(blockedPage("/orders", "POS", null)).toBeNull();
    expect(blockedPage("/financials", "Owner", null)).toBeNull();
    expect(blockedPage("/financials", "Staff", null, true)).toBeNull();
    expect(blockedPage("/print/counter", "Staff", null)).toBeNull();
    expect(blockedPage("/orders", "Staff", { Staff: ["/pos"] })).toBe("/orders");
    expect(firstAllowedPage("POS", null)).toBe("/orders");
    expect(firstAllowedPage("Staff", { Staff: [] })).toBeNull();
  });
});
