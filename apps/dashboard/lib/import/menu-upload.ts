// ─── Menu from a photo, a PDF or pasted text ────────────────────────────────
// For a shop whose menu isn't on its website: on paper, in a PDF, or only on a
// delivery app. The seller or staff member takes photos, adds a PDF or pastes
// the menu, and the same AI read as the website import turns it into a menu
// draft (lib/import/ai.ts, source "upload"). Nothing is saved here. The draft
// goes back to the handover form or the wizard's menu step, and is stored with
// the shop when it's created (withUploadedMenu in lib/import/store.ts).
//
// Limits. Vercel turns away a request body over 4.5 MB, so the browser shrinks
// photos before sending (components/menu-upload.tsx) and the total is capped
// below that. Each photo stays under the AI service's 5 MB image limit once
// encoded.

import "server-only";
import { sniffImage } from "@/lib/image-check";
import { aiExtract, IMPORT_MODEL } from "./ai";
import { menuFromAi } from "./run";
import type { MenuRead } from "./types";

export const MENU_UPLOAD = {
  maxFiles:      5,
  maxTotalBytes: 4_300_000,
  maxImageBytes: 3_700_000,
  maxTextChars:  20_000,
} as const;

export type UploadFile = { name: string; type: string; data: Buffer };

export class MenuUploadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const MEDIA = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" } as const;

/** Checks what was sent and sorts it into photos and PDFs. Throws MenuUploadError with a message for the person. */
export function sortUpload(files: UploadFile[], text: string): { images: { url: string; data: Buffer; mediaType: string }[]; pdfs: { url: string; data: Buffer }[]; text: string } {
  const pasted = text.trim();
  if (!files.length && !pasted) throw new MenuUploadError("Add a photo or PDF of the menu, or paste it in.");
  if (files.length > MENU_UPLOAD.maxFiles) throw new MenuUploadError(`Add ${MENU_UPLOAD.maxFiles} files at most in one go.`);
  if (pasted.length > MENU_UPLOAD.maxTextChars) throw new MenuUploadError("That pasted menu is too long. Paste it in two goes, or add it as a PDF.");
  const total = files.reduce((n, f) => n + f.data.length, 0);
  if (total > MENU_UPLOAD.maxTotalBytes) throw new MenuUploadError("That's too much for one go. Try fewer photos or a smaller PDF.", 413);

  const images: { url: string; data: Buffer; mediaType: string }[] = [];
  const pdfs: { url: string; data: Buffer }[] = [];
  for (const f of files) {
    const label = f.name.slice(0, 120) || "menu";
    if (f.data.subarray(0, 5).toString("ascii") === "%PDF-") { pdfs.push({ url: label, data: f.data }); continue; }
    const kind = sniffImage(f.data);
    if (!kind) throw new MenuUploadError(`"${label}" isn't a photo or PDF we can read. Use JPG, PNG or PDF.`);
    if (f.data.length > MENU_UPLOAD.maxImageBytes) throw new MenuUploadError(`"${label}" is too big. Take the photo again or use a smaller copy.`, 413);
    images.push({ url: label, data: f.data, mediaType: MEDIA[kind] });
  }
  return { images, pdfs, text: pasted };
}

/** Reads the menu. Throws MenuUploadError for anything the person can fix, or when the AI read fails.
 *  onStart runs once the files have passed the checks, just before the AI read (the route counts the run there). */
export async function readMenuUpload(files: UploadFile[], text: string, opts: { timeoutMs: number; onStart?: () => Promise<void> }): Promise<MenuRead> {
  const { images, pdfs, text: pasted } = sortUpload(files, text);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MenuUploadError("Reading menus is switched off on this server. Type the menu in instead.", 503);
  await opts.onStart?.();

  let res: Awaited<ReturnType<typeof aiExtract>>;
  try {
    res = await aiExtract({
      source: "upload",
      url:    "menu from the owner",
      pages:  pasted ? [{ url: "pasted by staff", kind: "menu", text: pasted }] : [],
      pdfs,
      images,
      hints:  {},
    }, { apiKey, timeoutMs: opts.timeoutMs });
  } catch (err) {
    console.error(`[menu-upload] AI read failed (${IMPORT_MODEL}):`, err instanceof Error ? err.message : err);
    throw new MenuUploadError("Couldn't read the menu this time. Try again, or try a clearer photo.", 502);
  }

  const menu = menuFromAi(res.output, "menu");
  const items = menu.reduce((n, c) => n + c.items.length, 0);
  if (!items) {
    throw new MenuUploadError(images.length
      ? "No menu items could be read. Take the photo straight on, in good light, with the prices in the shot."
      : "No menu items could be read from that. Check it's the menu, with prices.", 422);
  }
  const cut = res.output.menu_truncated || res.stopReason === "max_tokens";
  const sources = [
    images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "",
    pdfs.length ? `${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"}` : "",
    pasted ? "the pasted text" : "",
  ].filter(Boolean).join(", ");
  return {
    menu,
    items,
    check: `${items} items read from ${sources}. Check every price with the owner.${cut ? " The menu was cut short, so some items are missing." : ""}`,
    surcharges: res.output.surcharges,
    warnings:   res.output.staff_should_check,
    read:       { photos: images.length, pdfs: pdfs.length, text: Boolean(pasted) },
  };
}
