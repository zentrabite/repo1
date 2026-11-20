"use client";

// ─── Bring in a customer list ───────────────────────────────────────────────
// On the Customers page. The owner picks a CSV, checks which column is which,
// confirms marketing consent if the list has it, and the rows go to
// POST /api/customers/import. The rules (who counts as agreed, phone formats,
// dates) live in lib/customer-import.ts and run here for the preview and
// again on the server.

import { useMemo, useRef, useState } from "react";
import { FIELD_LABEL, guessMapping, MAX_IMPORT_ROWS, parseCsv, rowsFrom, type Field, type Mapping } from "@/lib/customer-import";

const C = { g: "#00AD82", st: "#6B7C93", cl: "#F8FAFB", y: "#FFC14B", r: "#FF4757", mist: "rgba(226,232,240,.09)", bg: "rgba(28,45,72,.5)" };
const FIELDS: Field[] = ["name", "first", "last", "phone", "email", "consent", "last_visit"];
const MAX_BYTES = 5_000_000;

type Result = { added: number; updated: number; unchanged: number; invalid: number; optedIn: number; keptOptedOut: number };

export default function CustomerImport({ onDone, onCancel }: { onDone: (r: Result) => void; onCancel: () => void }) {
  const [fileName, setFileName] = useState("");
  const [table,    setTable]    = useState<string[][] | null>(null);
  const [mapping,  setMapping]  = useState<Mapping>({});
  const [agreed,   setAgreed]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (table ? rowsFrom(table, mapping) : null), [table, mapping]);
  const consenting = preview?.rows.filter(r => r.consent).length ?? 0;
  const withVisit = preview?.rows.filter(r => r.last_visit).length ?? 0;
  const headers = table?.[0] ?? [];

  async function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text\/plain/.test(file.type)) {
      setError("Save the list as CSV first. In Excel or Numbers, use Save As or Export and pick CSV.");
      return;
    }
    if (file.size > MAX_BYTES) { setError("That file is too big. Split it into smaller files."); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setError("That file has no customers in it, or no heading row."); return; }
    if (rows.length - 1 > MAX_IMPORT_ROWS) { setError(`That's more than ${MAX_IMPORT_ROWS.toLocaleString("en-AU")} people. Split the file and add it in parts.`); return; }
    setFileName(file.name);
    setTable(rows);
    setMapping(guessMapping(rows[0]!));
    setAgreed(false);
    if (picker.current) picker.current.value = "";
  }

  async function save() {
    if (!preview?.rows.length) return;
    if (consenting && !agreed) { setError("Tick the box about marketing, or set the Agreed to marketing column to Not in the file."); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows, fileName, consentConfirmed: consenting > 0 && agreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `Couldn't add the list (${res.status})`); return; }
      onDone(data as Result);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const text: React.CSSProperties = { fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5, color: C.st };

  if (!table) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ ...text, margin: 0 }}>
        {`Add the customers the shop already has, from Square, Shopify, Mailchimp, a loyalty app or a spreadsheet. Export or save the list as a CSV file first. You'll see what's in it before anything is added.`}
      </p>
      <input ref={picker} id="customer-import-file" type="file" accept=".csv,text/csv,text/plain" onChange={e => pick(e.target.files?.[0])} style={{ display: "none" }} />
      <label htmlFor="customer-import-file" className="bp" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", margin: 0, cursor: "pointer" }}>Choose a CSV file</label>
      {error && <div role="alert" style={{ ...text, color: C.r }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="bg-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...text, color: C.cl }}>{`${fileName}, ${table.length - 1} rows`}</div>

      <div>
        <div style={{ ...text, marginBottom: 8 }}>Check which column is which.</div>
        <div className="zb-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FIELDS.map(f => (
            <div key={f}>
              <label htmlFor={`map-${f}`}>{FIELD_LABEL[f]}</label>
              <select id={`map-${f}`} value={mapping[f] ?? ""} onChange={e => setMapping({ ...mapping, [f]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                <option value="">Not in the file</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <div style={{ background: C.bg, border: `1px solid ${C.mist}`, borderRadius: 10, padding: 14, ...text }}>
          <div style={{ color: C.g, fontWeight: 600 }}>{`${preview.rows.length} people ready to add`}</div>
          {preview.skipped.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {`${preview.skipped.length} rows left out. `}
              {preview.skipped.slice(0, 3).map(s => `Row ${s.line}, ${s.reason}`).join(". ")}
              {preview.skipped.length > 3 ? ". And more." : "."}
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            {mapping.consent === undefined
              ? "No marketing column, so nobody will be texted or emailed offers."
              : `${consenting} marked as agreed to marketing.`}
          </div>
          <div style={{ marginTop: 4 }}>
            {mapping.last_visit === undefined
              ? "No last visit column. Win-back only texts people who haven't been in for a while, so these people won't get win-back texts until they order."
              : `${withVisit} with a last visit date.`}
          </div>
          {preview.rows.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
              {preview.rows.slice(0, 3).map((r, i) => (
                <div key={i} style={{ color: C.cl, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[r.name, r.phone, r.email, r.consent ? "agreed" : null, r.last_visit].filter(Boolean).join(" · ")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {consenting > 0 && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, ...text, color: C.cl, margin: 0, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 16, height: 16, flex: "none", marginTop: 2, padding: 0 }} />
          <span>{`The ${consenting} people marked as agreed told the shop they're happy to get texts or emails from it, and the shop can show where and when. Win-back can text them from tomorrow morning if they haven't been in for a while.`}</span>
        </label>
      )}

      {error && <div role="alert" style={{ ...text, color: C.r }}>{error}</div>}

      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button className="bg-btn" onClick={() => { setTable(null); setError(null); }} disabled={saving}>Pick another file</button>
        <button className="bp" onClick={save} disabled={saving || !preview?.rows.length}>
          {saving ? "Adding…" : `Add ${preview?.rows.length ?? 0} people`}
        </button>
      </div>
    </div>
  );
}
