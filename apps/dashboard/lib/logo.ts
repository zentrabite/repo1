// A shop's logo, saved by the server only.
//
// Used by Settings (/api/logo, owners and managers) and the staff setup
// wizard (/api/admin/onboarding/[id]/logo). The file type comes from the
// file's own bytes, so a renamed file or an SVG (which can carry scripts) is
// refused. Logos sit in the menu-images bucket under logos/<shop id>/, which
// browsers can't write to, and Delete in Super Admin removes that folder
// (lib/shop-status.ts).
//
// Before 043, Settings uploaded straight from the browser into the
// business-logos bucket. Any login at the shop could replace the logo on the
// shop's public website that way, POS logins included, and the bucket let
// anyone list every shop's folder. 043 drops those storage rules.

import "server-only";
import { checkImage } from "@/lib/image-check";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const LOGO_BUCKET = "menu-images";
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export type LogoResult = { ok: true; url: string } | { ok: false; status: 400 | 500; error: string };

export async function saveLogo(db: Db, businessId: string, file: Buffer): Promise<LogoResult> {
  if (file.length > LOGO_MAX_BYTES) return { ok: false, status: 400, error: "File too large (max 5 MB)" };
  const image = checkImage(file, ["png", "jpg", "webp"]);
  if (!image.ok) return { ok: false, status: 400, error: image.error };

  const path = `logos/${businessId}/${Date.now()}.${image.kind}`;
  const { error: uploadErr } = await db.storage.from(LOGO_BUCKET).upload(path, file, {
    contentType: image.contentType,
    upsert: false,
  });
  if (uploadErr) return { ok: false, status: 500, error: uploadErr.message ?? "Upload failed" };

  const { data: { publicUrl } } = db.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const { error } = await db.from("businesses").update({ logo_url: publicUrl }).eq("id", businessId);
  if (error) return { ok: false, status: 500, error: error.message ?? "Couldn't save the logo" };
  return { ok: true, url: publicUrl };
}
