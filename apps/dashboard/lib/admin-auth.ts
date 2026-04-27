// ─── Super-admin guard (server-side) ─────────────────────────────────────────
// Shared helper so every /api/admin/* route uses the same check. Returns the
// authenticated Supabase user if they have is_super_admin=true, else null.
//
// Usage:
//   const user = await assertSuperAdmin();
//   if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

import { createSessionClient, createAdminClient } from "@/lib/supabase-server";

export async function assertSuperAdmin() {
  const supa = await createSessionClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!data?.is_super_admin) return null;
  return user;
}
