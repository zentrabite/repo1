// ─── Resolve which business an API request may act on ────────────────────────
//
// Every merchant API route must take the business from the LOGIN, never from
// the request body. Routes that use the service-role client bypass RLS, so a
// business_id sent by the browser would let one merchant act as another.
//
// Usage in a route:
//
//   const auth = await requireBusiness(body.businessId);
//   if (!auth.ok) return auth.response;
//   const { businessId } = auth;
//
// Rules
//   • Not logged in                        → 401
//   • Super admin                          → may act on any existing business
//                                             (requested id, else the
//                                             impersonation cookie, else own)
//   • Owner (users.business_id)            → that business only
//   • Team member (business_members.email) → the businesses they belong to
//   • Requested id not in the allowed set  → 403
//
// The requested id is optional. Existing UI keeps sending businessId, which is
// now checked rather than trusted.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createSessionClient } from "@/lib/supabase-server";

const IMPERSONATE_COOKIE = "zb_impersonate";

export type BusinessAuth =
  | {
      ok: true;
      userId: string;
      email: string | null;
      businessId: string;
      isSuperAdmin: boolean;
    }
  | { ok: false; response: NextResponse };

function deny(status: 401 | 403 | 404, error: string): BusinessAuth {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function requireBusiness(requestedId?: string | null): Promise<BusinessAuth> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return deny(401, "Not authenticated");

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? null;
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

    return { ok: true, userId: user.id, email, businessId: target, isSuperAdmin: true };
  }

  // ── Everyone else: own business plus team memberships ───────────────────
  const allowed = new Set<string>();
  if (userRow?.business_id) allowed.add(userRow.business_id as string);

  if (email) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberships } = await (admin.from("business_members") as any)
      .select("business_id, status")
      .in("email", [...new Set([email, email.toLowerCase()])]);
    for (const m of (memberships ?? []) as { business_id: string; status: string | null }[]) {
      // Invited-but-never-joined rows still count once the person has an
      // account with that email, which is how invites are accepted today.
      if (m.status !== "removed" && m.status !== "revoked") allowed.add(m.business_id);
    }
  }

  if (allowed.size === 0) return deny(403, "No business linked to this account");

  if (requested) {
    if (!allowed.has(requested)) return deny(403, "Not allowed for this business");
    return { ok: true, userId: user.id, email, businessId: requested, isSuperAdmin: false };
  }

  const businessId = (userRow?.business_id as string | null) ?? [...allowed][0]!;
  return { ok: true, userId: user.id, email, businessId, isSuperAdmin: false };
}
