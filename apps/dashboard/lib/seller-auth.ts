// ─── Who can make a sale ────────────────────────────────────────────────────
// Super admins (ZentraBite staff) and sellers (users.is_seller, migration 022)
// can fill in the sale handover form: run a website import and create a shop.
// Sellers can also see the shops they sold. Nothing else. They have no
// business of their own, so every row rule in the database shows them
// nothing, and their pages read only through server routes that use this.
//
// Usage in a route:
//   const seller = await assertSellerOrAdmin();
//   if (!seller) return NextResponse.json({ error: "forbidden" }, { status: 403 });

import "server-only";
import { createAdminClient, createSessionClient } from "@/lib/supabase-server";

export type SellerAuth = { userId: string; email: string | null; isSuperAdmin: boolean; isSeller: boolean };

/** Website imports a seller can run in a day. Each one costs AI time. Staff aren't limited. */
export const SELLER_IMPORTS_PER_DAY = 20;
/** Shops a seller can create in a day. Staff aren't limited. */
export const SELLER_SHOPS_PER_DAY = 20;

export async function assertSellerOrAdmin(): Promise<SellerAuth | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient().from("users") as any)
    .select("is_super_admin, is_seller")
    .eq("id", user.id)
    .maybeSingle();
  const isSuperAdmin = Boolean(data?.is_super_admin);
  const isSeller = Boolean(data?.is_seller);
  if (!isSuperAdmin && !isSeller) return null;
  return { userId: user.id, email: user.email ?? null, isSuperAdmin, isSeller };
}

/** The start of the 24 hours a daily limit counts over. */
export const dayAgo = () => new Date(Date.now() - 24 * 60 * 60_000).toISOString();
