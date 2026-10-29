// ─── Resolve which business an API request may act on ────────────────────────
//
// Every merchant API route must take the business from the LOGIN, never from
// the request body. Routes that use the service-role client bypass RLS, so a
// business_id sent by the browser would let one merchant act as another.
//
// Usage in a route:
//
//   const auth = await requireBusiness(body.businessId, { roles: MANAGER_ROLES });
//   if (!auth.ok) return auth.response;
//   const { businessId } = auth;
//
// Rules
//   • Not logged in                        → 401
//   • Super admin                          → may act on any existing business
//                                             (requested id, else the
//                                             impersonation cookie, else own)
//   • Owner (users.business_id)            → that business, role "Owner"
//   • Team member (business_members.email) → the businesses they belong to,
//                                             with their member role. Only
//                                             counts once the login's email
//                                             is confirmed, so nobody can
//                                             claim an invite by signing up
//                                             with someone else's address.
//   • Requested id not in the allowed set  → 403
//   • Role not in options.roles            → 403
//
// users.is_super_admin and users.business_id are protected from browser
// writes by migration 015. Don't loosen those grants without revisiting this.

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createSessionClient } from "@/lib/supabase-server";

const IMPERSONATE_COOKIE = "zb_impersonate";

/** Roles allowed to spend money or change billing and team settings. */
export const MANAGER_ROLES = ["Owner", "Manager"] as const;

export type BusinessAuth =
  | {
      ok: true;
      userId: string;
      email: string | null;
      businessId: string;
      role: string;
      isSuperAdmin: boolean;
    }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403 | 404, error: string): BusinessAuth {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function requireBusiness(
  requestedId?: string | null,
  options: { roles?: readonly string[] } = {},
): Promise<BusinessAuth> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return deny(401, "Not authenticated");

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ? user.email.toLowerCase() : null;
  const isSuperAdmin = Boolean(userRow?.is_super_admin);
  const requested = typeof requestedId === "string" && requestedId.length > 0 ? requestedId : null;

  // ── Super admin: any real business ──────────────────────────────────────
  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impersonating = cookieStore.get(IMPERSONATE_COOKIE)?.value || null;
    const target = requested ?? impersonating ?? (userRow?.business_id as string | null) ?? null;
    if (!target) return deny(403, "No business selected");

    const { data: biz } = await admin.from("businesses").select("id").eq("id", target).maybeSingle();
    if (!biz) return deny(404, "Business not found");

    return { ok: true, userId: user.id, email, businessId: target, role: "Owner", isSuperAdmin: true };
  }

  // ── Everyone else: own business plus confirmed team memberships ─────────
  const roles = new Map<string, string>();
  if (userRow?.business_id) roles.set(userRow.business_id as string, "Owner");

  const emailConfirmed = Boolean(user.email_confirmed_at);
  if (email && emailConfirmed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships } = await (admin.from("business_members") as any)
      .select("business_id, role, status")
      .in("email", [...new Set([email, user.email!])]);
    for (const m of (memberships ?? []) as { business_id: string; role: string | null; status: string | null }[]) {
      if (m.status === "removed" || m.status === "revoked") continue;
      if (!roles.has(m.business_id)) roles.set(m.business_id, m.role ?? "Staff");
    }
  }

  if (roles.size === 0) return deny(403, "No business linked to this account");

  let businessId: string;
  if (requested) {
    if (!roles.has(requested)) return deny(403, "Not allowed for this business");
    businessId = requested;
  } else {
    businessId = (userRow?.business_id as string | null) ?? [...roles.keys()][0]!;
  }

  const role = roles.get(businessId)!;
  if (options.roles && !options.roles.includes(role)) {
    return deny(403, "Your role can't do this. Ask the owner or a manager.");
  }

  return { ok: true, userId: user.id, email, businessId, role, isSuperAdmin: false };
}
