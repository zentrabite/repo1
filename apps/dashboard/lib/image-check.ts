// ─── Image upload checks ──────────────────────────────────────────────────────
// Checks the real file type from its first bytes, not the file name. SVG is
// never accepted because it can carry scripts.

export type ImageKind = "png" | "jpg" | "webp" | "gif";

const CONTENT_TYPES: Record<ImageKind, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") return "gif";
  return null;
}

/**
 * Returns the detected kind and matching content type, or an error message.
 * `allowed` lets a caller narrow the list (logos don't need GIF).
 */
export function checkImage(buf: Buffer, allowed: ImageKind[] = ["png", "jpg", "webp", "gif"]):
  | { ok: true; kind: ImageKind; contentType: string }
  | { ok: false; error: string } {
  const kind = sniffImage(buf);
  if (!kind || !allowed.includes(kind)) {
    return { ok: false, error: `Only ${allowed.map(k => k.toUpperCase()).join(", ")} images are allowed` };
  }
  return { ok: true, kind, contentType: CONTENT_TYPES[kind] };
}
