// ─── The owner's own photos on their website ───────────────────────────────
// Staff tick which photos found by the website import the owner took or has
// the rights to (the wizard's Website step). The site used to show them
// straight from the owner's old website, so they broke as soon as the owner
// closed it, which is the point of moving to us. Now each ticked photo is
// copied into our storage when it's saved, the same way the imported logo is.
//
// settings.site keeps
//   photos            the ticked photos' addresses on the old site, in order
//   photo_copies      { old address: our copy }, read by lib/site.ts
//   photos_confirmed  { by, at }, who ticked them and when
//
// Only photos the import found for this shop can be ticked, and only PNG,
// JPG and WebP files are kept, checked from their bytes. A photo that can't be
// copied stays linked from the old site, and the wizard says how many.

import "server-only";
import { createHash } from "node:crypto";
import { checkImage } from "@/lib/image-check";
import { safeFetch } from "@/lib/import/safe-fetch";

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_SITE_PHOTOS = 8;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;

export type PhotoCopies = Record<string, string>;

/** The photos the import found for this shop. Only these can be ticked. */
export function importedPhotos(settings: Settings | null): string[] {
  const list = settings?.import?.photos;
  return Array.isArray(list) ? list.map(p => (typeof p?.url === "string" ? p.url : "")).filter(Boolean) : [];
}

export type PhotoPlan =
  | { ok: true; photos: string[]; toCopy: string[]; copies: PhotoCopies; changed: boolean }
  | { ok: false; error: string };

/** Works out what to keep and what to copy. Pure, so it's tested on its own. */
export function planPhotos(settings: Settings | null, wanted: unknown): PhotoPlan {
  if (!Array.isArray(wanted)) return { ok: false, error: "Photos must be a list" };
  const photos = Array.from(new Set(wanted.filter((u): u is string => typeof u === "string")));
  if (photos.length > MAX_SITE_PHOTOS) return { ok: false, error: `Tick ${MAX_SITE_PHOTOS} photos at most` };
  const found = new Set(importedPhotos(settings));
  const stranger = photos.find(u => !found.has(u));
  if (stranger) return { ok: false, error: "That photo wasn't found by the import for this business" };

  const before = settings?.site ?? {};
  const had: PhotoCopies = before.photo_copies && typeof before.photo_copies === "object" ? before.photo_copies : {};
  const copies: PhotoCopies = {};
  for (const u of photos) if (typeof had[u] === "string") copies[u] = had[u];
  const previous: string[] = Array.isArray(before.photos) ? before.photos : [];
  return {
    ok: true,
    photos,
    toCopy: photos.filter(u => !copies[u]),
    copies,
    changed: previous.length !== photos.length || previous.some((u, i) => u !== photos[i]),
  };
}

/** Copies one photo into our storage. Returns our address, or null if it can't. */
async function copyOne(db: Db, businessId: string, url: string): Promise<string | null> {
  try {
    const doc = await safeFetch(url, { maxBytes: MAX_BYTES, timeoutMs: 15_000, accept: "image/png,image/jpeg,image/webp,image/*;q=0.8" });
    const image = checkImage(doc.body, ["png", "jpg", "webp"]);
    if (!image.ok) return null;
    // Named by its contents, so the same photo saved twice is one file.
    const name = createHash("sha256").update(doc.body).digest("hex").slice(0, 24);
    const path = `site/${businessId}/${name}.${image.kind}`;
    const { error } = await db.storage.from(BUCKET).upload(path, doc.body, { contentType: image.contentType, upsert: true });
    if (error) return null;
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return typeof data?.publicUrl === "string" ? data.publicUrl : null;
  } catch {
    return null;
  }
}

/**
 * The settings.site slice to save for the ticked photos: the list, our
 * copies and who confirmed them. failed counts photos still linked from the
 * old site.
 */
export async function savePhotos(db: Db, businessId: string, settings: Settings | null, wanted: unknown, by: string, now = new Date()):
  Promise<{ ok: true; site: Settings; failed: number } | { ok: false; error: string }> {
  const plan = planPhotos(settings, wanted);
  if (!plan.ok) return plan;
  const results = await Promise.all(plan.toCopy.map(u => copyOne(db, businessId, u)));
  const copies = { ...plan.copies };
  plan.toCopy.forEach((u, i) => { if (results[i]) copies[u] = results[i]!; });
  const site: Settings = { photos: plan.photos, photo_copies: copies };
  if (plan.changed) site.photos_confirmed = plan.photos.length ? { by, at: now.toISOString() } : null;
  return { ok: true, site, failed: results.filter(r => !r).length };
}
