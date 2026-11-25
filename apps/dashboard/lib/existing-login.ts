// An email someone wants to make an owner, a seller or a team member may
// already have a ZentraBite login. Whoever made that login knows its password,
// and email confirmation is off, so it may not belong to the person whose
// email it is: anyone could sign up with a shop's public email until sign-ups
// were closed on 25 Nov, and a shop's owner can open an invite they sent to
// someone else's email. So an existing login is only given a shop, a seller
// role or a team when we know who holds it. Found in the second security run.
//
// Safe cases.
//   • It's already this shop's owner, or already on this team (a resend).
//   • One of our invites made it and nobody has ever signed in to it. A new
//     invite link replaces the old one, so only the person we send it to can
//     use it.
// Anything we can't check counts as unsafe.

import "server-only";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any; auth: any };

export type ExistingLogin = {
  id: string;
  business_id: string | null;
  is_seller: boolean;
  is_super_admin: boolean;
  invited: boolean;
  used: boolean;
};

const GONE = new Set(["removed", "revoked"]);

/** The login for an email, null when there's none, "unknown" when it can't be checked. */
export async function findLogin(db: Db, email: string): Promise<ExistingLogin | null | "unknown"> {
  const e = email.trim().toLowerCase();
  const { data: row, error } = await db.from("users")
    .select("id, business_id, is_seller, is_super_admin").eq("email", e).maybeSingle();
  if (error) return "unknown";
  if (!row) return null;
  try {
    const { data, error: authErr } = await db.auth.admin.getUserById(row.id);
    if (authErr || !data?.user) return "unknown";
    return {
      id: row.id,
      business_id: row.business_id ?? null,
      is_seller: Boolean(row.is_seller),
      is_super_admin: Boolean(row.is_super_admin),
      invited: Boolean(data.user.invited_at),
      used: Boolean(data.user.last_sign_in_at),
    };
  } catch {
    return "unknown";
  }
}

/** True when the email is on a team (still invited or joined) other than this shop's. */
async function onAnotherTeam(db: Db, email: string, businessId: string): Promise<boolean | "unknown"> {
  const { data, error } = await db.from("business_members").select("business_id, status").eq("email", email.trim().toLowerCase());
  if (error) return "unknown";
  return ((data ?? []) as { business_id: string; status: string | null }[])
    .some(m => m.business_id !== businessId && !GONE.has(m.status ?? ""));
}

const UNKNOWN = "Couldn't check that email's login. Try again in a minute.";

/** Why this email can't become this shop's owner, or null when it can. */
export async function ownerLoginProblem(db: Db, email: string, businessId: string): Promise<string | null> {
  const login = await findLogin(db, email);
  if (login === "unknown") return UNKNOWN;
  if (!login) return null;
  if (login.business_id === businessId) return null;
  if (login.business_id) return "That email already logs in to a different shop. Use another email for this owner.";
  if (login.is_seller || login.is_super_admin) return "That email is a ZentraBite staff login. Use another email for this owner.";
  const elsewhere = await onAnotherTeam(db, email, businessId);
  if (elsewhere === "unknown") return UNKNOWN;
  if (elsewhere) return "That email is on another shop's team. Use another email for this owner.";
  if (login.invited && !login.used) return null;
  return "That email already has a ZentraBite login we didn't set up for this shop, so we can't be sure who holds it. Use another email for this owner.";
}

/** Why this email can't be made a seller, or null when it can. */
export async function sellerLoginProblem(db: Db, email: string): Promise<string | null> {
  const login = await findLogin(db, email);
  if (login === "unknown") return UNKNOWN;
  if (!login) return null;
  if (login.is_seller || login.is_super_admin) return null;
  // A shop owner our own owner invite made.
  if (login.business_id && login.invited) return null;
  if (login.invited && !login.used) {
    const elsewhere = await onAnotherTeam(db, email, "");
    if (elsewhere === "unknown") return UNKNOWN;
    if (!elsewhere) return null;
  }
  return "That email already has a ZentraBite login we can't be sure about. Use another email for this seller.";
}

/**
 * Why a login that exists can't join this shop's team, or null when it can.
 * lib/team.ts has the other team rules. This one stops a login that was used
 * on another team, whose password someone else may hold.
 */
export async function teamLoginProblem(db: Db, email: string, businessId: string): Promise<string | null> {
  const login = await findLogin(db, email);
  if (login === "unknown") return UNKNOWN;
  if (!login) return null;
  if (!login.invited) return "That email already has its own ZentraBite login, so it can't join a team. Use a different email.";
  if (!login.used) return null;
  const { data, error } = await db.from("business_members").select("status")
    .eq("business_id", businessId).eq("email", email.trim().toLowerCase()).maybeSingle();
  if (error) return UNKNOWN;
  if (data) return null;
  return "That email has been used on another ZentraBite team. Use a different email.";
}
