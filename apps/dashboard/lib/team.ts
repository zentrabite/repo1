// ─── A shop's team ───────────────────────────────────────────────────────────
// Who works in a shop and what they can do, for Settings → Team (/api/team)
// and the invite route (/api/team/invite).
//
//   • The shop's owner is the login whose users.business_id is the shop.
//     They're always Owner and can't be changed or removed from here.
//   • Everyone else is a row in business_members (email, role, status). They
//     reach the shop once the login was made by an invite and its link was
//     opened, and lose it the moment the row is marked removed. The database
//     applies the same rule (get_my_business_id() and get_my_role(), 030),
//     and so does the server (lib/request-business.ts).
//   • Owners and managers change the team. Nobody changes their own role or
//     removes themselves, and only an owner adds, changes or removes an owner.
//   • One shop per login. An email that runs a shop, is a ZentraBite seller or
//     staff login, already works in another shop, or has a login of its own
//     that no invite made, can't be invited (it would never reach the shop).

import "server-only";
import { ALL_ROLES } from "@/lib/permissions";
import { teamLoginProblem } from "@/lib/existing-login";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type TeamRow = {
  email: string;
  role: string;
  /** owner: the shop's own login. joined: opened the invite. invited: not yet. */
  status: "owner" | "joined" | "invited";
  you: boolean;
};

const GONE = new Set(["removed", "revoked"]);
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Did this login come from an invite, with its link opened? */
async function openedInvite(db: Db, userId: string): Promise<boolean> {
  try {
    const { data } = await db.auth.admin.getUserById(userId);
    const u = data?.user as { invited_at?: string | null; email_confirmed_at?: string | null } | undefined;
    return Boolean(u?.invited_at && u?.email_confirmed_at);
  } catch {
    return false;
  }
}

/** The shop's team, owner first, then members oldest first. Removed members aren't listed. */
export async function listTeam(db: Db, businessId: string, viewerEmail: string | null): Promise<TeamRow[]> {
  const me = lower(viewerEmail);
  const [{ data: owners }, { data: members }] = await Promise.all([
    db.from("users").select("id, email").eq("business_id", businessId),
    db.from("business_members").select("email, role, status, created_at").eq("business_id", businessId).order("created_at", { ascending: true }),
  ]);
  const ownerEmails = new Set(((owners ?? []) as { email: string | null }[]).map(o => lower(o.email)).filter(Boolean));
  const rows: TeamRow[] = [...ownerEmails].map(email => ({ email, role: "Owner", status: "owner", you: email === me }));

  const current = ((members ?? []) as { email: string; role: string | null; status: string | null }[])
    .filter(m => !GONE.has(m.status ?? "") && !ownerEmails.has(lower(m.email)));
  const emails = current.map(m => lower(m.email));
  const { data: logins } = emails.length
    ? await db.from("users").select("id, email").in("email", emails)
    : { data: [] };
  const idOf = new Map(((logins ?? []) as { id: string; email: string | null }[]).map(l => [lower(l.email), l.id]));

  const joined = await Promise.all(current.map(m => {
    const id = idOf.get(lower(m.email));
    return id ? openedInvite(db, id) : Promise.resolve(false);
  }));
  current.forEach((m, i) => rows.push({
    email: lower(m.email),
    role: m.role ?? "Staff",
    status: joined[i] ? "joined" : "invited",
    you: lower(m.email) === me,
  }));
  return rows;
}

/**
 * Why this change to the team isn't allowed, or null when it is. target is
 * the member's current row, newRole the role they'd get (none for a removal).
 */
export function teamChangeProblem(
  actor: { role: string; email: string | null },
  target: { email: string; role: string },
  newRole?: string,
): string | null {
  if (actor.role !== "Owner" && actor.role !== "Manager") return "Only the owner or a manager can change the team.";
  if (lower(target.email) === lower(actor.email)) return "You can't change your own role or remove yourself. Ask the owner.";
  if (newRole !== undefined && !ALL_ROLES.includes(newRole)) return "Unknown role.";
  if (actor.role !== "Owner" && (target.role === "Owner" || newRole === "Owner")) return "Only an owner can add, change or remove an owner.";
  return null;
}

/** The member's current row in this shop, or null if they aren't on its team. */
export async function findMember(db: Db, businessId: string, email: string): Promise<{ email: string; role: string } | null> {
  const { data } = await db.from("business_members").select("email, role, status").eq("business_id", businessId).eq("email", lower(email)).maybeSingle();
  const row = data as { email: string; role: string | null; status: string | null } | null;
  if (!row || GONE.has(row.status ?? "")) return null;
  return { email: row.email, role: row.role ?? "Staff" };
}

/** Why this email can't be invited to this shop, or null when it can. */
export async function inviteProblem(db: Db, businessId: string, email: string, inviterEmail: string | null): Promise<string | null> {
  const e = lower(email);
  if (e === lower(inviterEmail)) return "That's your own email.";

  const { data: login } = await db.from("users").select("id, business_id, is_seller, is_super_admin").eq("email", e).maybeSingle();
  const l = login as { id: string; business_id: string | null; is_seller: boolean | null; is_super_admin: boolean | null } | null;
  if (l?.business_id === businessId) return "That's the shop's owner. They already see everything.";
  if (l?.business_id) return "That email already runs another shop on ZentraBite. Ask them for a different email for your team.";
  if (l?.is_seller || l?.is_super_admin) return "That email is a ZentraBite staff login. Use a different email.";

  const { data: elsewhere } = await db.from("business_members").select("business_id, status").eq("email", e);
  const other = ((elsewhere ?? []) as { business_id: string; status: string | null }[])
    .some(m => m.business_id !== businessId && !GONE.has(m.status ?? ""));
  if (other) return "That email is already on another shop's team. Use a different email.";

  // A login that no invite made (someone who signed up themselves) never
  // reaches a team, and one that was used on another team may have a password
  // someone else holds (lib/existing-login.ts).
  if (l) return teamLoginProblem(db, e, businessId);
  return null;
}
