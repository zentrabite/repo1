"use client";

// ─── Menu from a photo, a PDF or pasted text ────────────────────────────────
// Used on the sale handover form (components/new-shop-form.tsx) and the
// onboarding wizard's menu step. The person adds photos of the menu, a PDF, or
// pastes it in, and POST /api/admin/onboarding/menu-read reads it with AI.
// The parent decides what to do with the result (onRead).
//
// Photos are shrunk here before sending, to a long edge of MAX_EDGE pixels as
// JPG, because a phone photo can be 4 MB or more and the server takes 4.3 MB
// in total. A photo the browser can't open (an iPhone HEIC file on a computer)
// gets a message asking for a screenshot or a JPG instead.

import { useEffect, useRef, useState } from "react";
import type { MenuRead } from "@/lib/import/types";

const MAX_EDGE = 2000;
const MAX_FILES = 5;
const MAX_TOTAL = 4_300_000;
const MAX_TEXT = 20_000;

const C = { g: "#00AD82", st: "#6B7C93", cl: "#F8FAFB", y: "#FFC14B", r: "#FF4757", mist: "rgba(226,232,240,.09)", bg: "rgba(28,45,72,.5)" };
const ghost: React.CSSProperties = {
  background: "transparent", border: `1px solid ${C.mist}`, color: C.cl, borderRadius: 8,
  padding: "10px 14px", minHeight: 44, boxSizing: "border-box", margin: 0, fontSize: 13, lineHeight: 1.3,
  cursor: "pointer", fontFamily: "var(--font-inter)",
};

class PrepareError extends Error {}

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** A photo as a JPG no bigger than MAX_EDGE on its long side. PDFs go as they are. */
async function prepare(file: File): Promise<{ blob: Blob; name: string }> {
  if (isPdf(file)) return { blob: file, name: file.name };
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); }
  catch { throw new PrepareError(`"${file.name}" can't be opened here. Take a screenshot of it, or save it as a JPG, and add that.`); }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.82));
  if (!blob) throw new PrepareError(`"${file.name}" couldn't be prepared. Try another photo.`);
  return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
}

export default function MenuUpload({ onRead, intro }: { onRead: (r: MenuRead) => void; intro?: string }) {
  const [files,    setFiles]    = useState<File[]>([]);
  const [text,     setText]     = useState("");
  const [paste,    setPaste]    = useState(false);
  const [reading,  setReading]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [error,    setError]    = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!reading) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [reading]);

  function add(list: FileList | null) {
    setError(null);
    const picked = Array.from(list ?? []).filter(f => isPdf(f) || f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (list && picked.length < list.length) setError("Only photos and PDFs can be read.");
    const next = [...files, ...picked];
    if (next.length > MAX_FILES) setError(`Add ${MAX_FILES} files at most in one go.`);
    setFiles(next.slice(0, MAX_FILES));
    if (picker.current) picker.current.value = "";
  }

  async function read() {
    setError(null);
    if (!files.length && !text.trim()) return setError("Add a photo or PDF of the menu, or paste it in.");
    if (text.length > MAX_TEXT) return setError("That pasted menu is too long. Paste it in two goes, or add it as a PDF.");
    setReading(true);
    setElapsed(0);
    try {
      const form = new FormData();
      let total = 0;
      for (const f of files) {
        const { blob, name } = await prepare(f);
        total += blob.size;
        form.append("files", blob, name);
      }
      if (total > MAX_TOTAL) { setError("That's too much for one go. Try fewer photos or a smaller PDF."); return; }
      if (text.trim()) form.append("text", text);
      const res = await fetch("/api/admin/onboarding/menu-read", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.status === 413) { setError("That's too much for one go. Try fewer photos or a smaller PDF."); return; }
      if (!res.ok) { setError(data.error ?? `Couldn't read the menu (${res.status})`); return; }
      onRead(data.result as MenuRead);
      setFiles([]);
      setText("");
      setPaste(false);
    } catch (err) {
      setError(err instanceof PrepareError ? err.message : "Network error. Check your connection and try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "var(--font-inter)" }}>
      {intro && <div style={{ fontSize: 13, color: C.st, lineHeight: 1.5 }}>{intro}</div>}

      <input
        ref={picker}
        id="menu-upload-files"
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={e => add(e.target.files)}
        disabled={reading}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor="menu-upload-files" style={{ ...ghost, display: "inline-flex", alignItems: "center", opacity: reading || files.length >= MAX_FILES ? 0.5 : 1, pointerEvents: reading || files.length >= MAX_FILES ? "none" : "auto" }}>
          {files.length ? "Add another photo or PDF" : "Add photos or a PDF"}
        </label>
        {!paste && (
          <button type="button" onClick={() => setPaste(true)} disabled={reading} style={ghost}>Paste the menu instead</button>
        )}
      </div>

      {files.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 8, padding: "4px 4px 4px 12px", fontSize: 13, color: C.cl }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ color: C.st, whiteSpace: "nowrap" }}>{isPdf(f) ? "PDF" : "Photo"} · {kb(f.size)}</span>
              <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} disabled={reading} aria-label={`Remove ${f.name}`}
                style={{ background: "transparent", border: "none", color: C.st, fontSize: 18, width: 44, height: 36, cursor: "pointer" }}>×</button>
            </li>
          ))}
        </ul>
      )}

      {paste && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          disabled={reading}
          placeholder={"Pizzas\nMargherita $18\nPepperoni $21\n\nSides\nGarlic bread $8"}
          aria-label="Paste the menu"
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={read} disabled={reading || (!files.length && !text.trim())} className="bp"
          style={{ padding: "11px 18px", opacity: reading || (!files.length && !text.trim()) ? 0.6 : 1 }}>
          {reading ? "Reading…" : "Read the menu"}
        </button>
        {reading && (
          <span style={{ fontSize: 13, color: C.st }}>Reading the menu… {elapsed}s. A long menu can take up to 2 minutes.</span>
        )}
      </div>

      {error && (
        <div role="alert" style={{ padding: "10px 12px", background: "rgba(255,71,87,.12)", border: "1px solid rgba(255,71,87,.3)", borderRadius: 8, color: C.r, fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/** What a menu read found, with the items to look over. */
export function MenuReadSummary({ r, replaces, onRemove }: { r: MenuRead; replaces?: number; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14, fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ color: C.g, fontWeight: 600 }}>
        {`${r.items} menu items in ${r.menu.length} section${r.menu.length === 1 ? "" : "s"}`}
      </div>
      <div style={{ color: C.st, marginTop: 4 }}>{r.check}</div>
      {replaces ? <div style={{ color: C.st, marginTop: 4 }}>{`This replaces the ${replaces} items from their website.`}</div> : null}
      {r.surcharges.length > 0 && <div style={{ color: C.st, marginTop: 4 }}>Fees kept out of the menu: {r.surcharges.join(" · ")}</div>}
      {r.warnings.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: C.y }}>
          {r.warnings.map((w, i) => <li key={i} style={{ marginTop: 2 }}>{w}</li>)}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setOpen(!open)} style={ghost}>{open ? "Hide the items" : "Show the items"}</button>
        {onRemove && <button type="button" onClick={onRemove} style={{ ...ghost, color: C.st }}>Remove this menu</button>}
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {r.menu.map((c, i) => (
            <div key={i}>
              <div style={{ color: C.cl, fontWeight: 600 }}>{c.name}</div>
              {c.items.map((it, j) => (
                <div key={j} style={{ display: "flex", gap: 10, color: C.st, marginTop: 2 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {it.name}
                    {it.variants?.length ? <span>{` (${it.variants.map(v => `${v.name} $${v.price.toFixed(2)}`).join(", ")})`}</span> : null}
                  </span>
                  <span style={{ color: it.price === null ? C.y : C.cl, whiteSpace: "nowrap" }}>{it.price === null ? "No price" : `$${it.price.toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
