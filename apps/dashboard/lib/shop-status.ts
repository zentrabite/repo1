// Super Admin's Suspend and Delete for a shop (migration 041).
//
// Suspend: the shop's logins see a "paused" screen and reach nothing (the
// database refuses them, and so does requireBusiness), its ordering page and
// website are off, and it sends no texts and gets no daily run. Super admins
// can still open it. Undone with resumeShop.
//
// Delete: only for a shop that's suspended, has no orders or customers and
// no live ZentraBite subscription (delete_empty_shop in 041 checks all of
// that, inside one transaction). For test shops and set-ups that never went
// ahead. The owner's login stays, with no shop. Its pictures go too.

import "server-only";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type ShopResult = { ok: true; name?: string } | { ok: false; status: 400 | 404 | 409 | 500; error: string };

export const REASON_MAX = 300;
const BUCKET = "menu-images";

export async function suspendShop(db: Db, businessId: string, by: string, reason: unknown): Promise<ShopResult> {
  const why = typeof reason === "string" ? reason.trim() : "";
  if (!why) return { ok: false, status: 400, error: "Say why, for the team. The shop doesn't see it." };
  if (why.length > REASON_MAX) return { ok: false, status: 400, error: `Keep the reason under ${REASON_MAX} characters.` };

  const { data, error } = await db.from("businesses")
    .update({ suspended_at: new Date().toISOString(), suspended_by: by, suspended_reason: why })
    .eq("id", businessId)
    .select("id, name")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "Shop not found" };
  return { ok: true, name: data.name };
}

export async function resumeShop(db: Db, businessId: string): Promise<ShopResult> {
  const { data, error } = await db.from("businesses")
    .update({ suspended_at: null, suspended_by: null, suspended_reason: null })
    .eq("id", businessId)
    .select("id, name")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 404, error: "Shop not found" };
  return { ok: true, name: data.name };
}

/** The checks delete_empty_shop makes, as the admin page says them. */
const REFUSALS = [/Suspend the shop/, /orders or customers/, /subscription/];

export async function deleteEmptyShop(db: Db, businessId: string, typedName: unknown): Promise<ShopResult> {
  const { data: shop, error: readErr } = await db.from("businesses").select("id, name").eq("id", businessId).maybeSingle();
  if (readErr) return { ok: false, status: 500, error: readErr.message };
  if (!shop) return { ok: false, status: 404, error: "Shop not found" };
  if (typeof typedName !== "string" || typedName.trim() !== String(shop.name).trim()) {
    return { ok: false, status: 400, error: "Type the shop's name exactly as it's shown to delete it." };
  }

  const { error } = await db.rpc("delete_empty_shop", { p_business: businessId });
  if (error) {
    const message = String(error.message ?? "");
    if (REFUSALS.some(r => r.test(message))) return { ok: false, status: 409, error: message.endsWith(".") ? message : `${message}.` };
    if (/Shop not found/.test(message)) return { ok: false, status: 404, error: "Shop not found" };
    return { ok: false, status: 500, error: message || "Couldn't delete the shop." };
  }

  await removeShopFiles(db, businessId);
  return { ok: true, name: shop.name };
}

/** The shop's menu pictures, logo and website photos. Best effort: the shop is already gone. */
async function removeShopFiles(db: Db, businessId: string): Promise<void> {
  for (const folder of [businessId, `logos/${businessId}`, `site/${businessId}`]) {
    try {
      const { data: files } = await db.storage.from(BUCKET).list(folder, { limit: 1000 });
      const paths = ((files ?? []) as { name: string }[]).map(f => `${folder}/${f.name}`);
      if (paths.length) await db.storage.from(BUCKET).remove(paths);
    } catch (err) {
      console.error(`[shop-status] couldn't remove ${folder}`, err instanceof Error ? err.message : err);
    }
  }
}
