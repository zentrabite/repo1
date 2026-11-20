"use client";

// The "Options" part of the Add and Edit item boxes on the Menu page: sizes,
// extras and choices. Each choice's price is added to the item's price.
// Saved on menu_items.options (see lib/menu-options.ts).

import { MAX_CHOICES, MAX_GROUPS, newOptionId, readOptions, type OptionGroup } from "@/lib/menu-options";

const C = { st: "#6B7C93", r: "#FF4757", mist: "rgba(255,255,255,.07)" };

export type DraftChoice = { id: string; name: string; price: string; available: boolean };
export type DraftGroup  = { id: string; name: string; required: boolean; max: number; choices: DraftChoice[] };

const blankChoice = (): DraftChoice => ({ id: newOptionId(), name: "", price: "", available: true });

export function toDraft(raw: unknown): DraftGroup[] {
  return readOptions(raw).map(g => ({
    id: g.id,
    name: g.name,
    required: g.min > 0,
    max: g.max,
    choices: g.choices.map(c => ({ id: c.id, name: c.name, price: c.price ? c.price.toFixed(2) : "", available: c.available })),
  }));
}

/** Turns the boxes back into saved options, or says what to fix. */
export function fromDraft(draft: DraftGroup[]): { ok: true; options: OptionGroup[] } | { ok: false; error: string } {
  const out: OptionGroup[] = [];
  for (const g of draft) {
    const name = g.name.trim();
    const rows = g.choices.filter(c => c.name.trim());
    if (!name && rows.length === 0) continue;
    if (!name) return { ok: false, error: "Give each option group a name, like Size or Extras" };
    if (rows.length === 0) return { ok: false, error: `Add at least one choice to ${name}` };

    const choices = [];
    for (const c of rows) {
      const price = c.price.trim() === "" ? 0 : Number(c.price);
      if (!Number.isFinite(price) || price < 0 || price > 10000) return { ok: false, error: `Check the price for ${c.name.trim()}` };
      choices.push({ id: c.id, name: c.name.trim(), price, available: c.available });
    }
    const max = Math.max(1, Math.min(g.max, choices.length));
    out.push({ id: g.id, name, min: g.required ? 1 : 0, max, choices });
  }
  const options = readOptions(out);
  const count = (gs: OptionGroup[]) => gs.reduce((n, g) => n + g.choices.length, 0);
  if (options.length !== out.length || count(options) !== count(out)) {
    return { ok: false, error: "Check the option names and prices" };
  }
  return { ok: true, options };
}

export function OptionsEditor({ value, onChange }: { value: DraftGroup[]; onChange: (next: DraftGroup[]) => void }) {
  const setGroup = (i: number, next: DraftGroup) => onChange(value.map((g, idx) => (idx === i ? next : g)));
  const setChoice = (gi: number, ci: number, next: DraftChoice) =>
    setGroup(gi, { ...value[gi], choices: value[gi].choices.map((c, idx) => (idx === ci ? next : c)) });

  return (
    <div style={{ marginBottom: 18 }}>
      <label>Options</label>
      <div style={{ fontSize: 11, color: C.st, lineHeight: 1.5, marginBottom: 8 }}>
        Sizes, extras or choices. Each choice&apos;s price is added to the item&apos;s price. Leave it blank if it&apos;s free.
      </div>

      {value.map((g, gi) => (
        <div key={g.id} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${C.mist}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              aria-label="Option group name"
              value={g.name}
              onChange={e => setGroup(gi, { ...g, name: e.target.value })}
              placeholder="e.g. Size, Extras, Sauce"
              style={{ flex: 1, fontWeight: 600 }}
            />
            <button type="button" className="bg-btn" style={{ color: C.r, fontSize: 12, padding: "6px 10px", flexShrink: 0 }}
              onClick={() => onChange(value.filter((_, idx) => idx !== gi))}>
              Remove
            </button>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: 0, cursor: "pointer", minHeight: 32 }}>
              <input type="checkbox" checked={g.required} onChange={e => setGroup(gi, { ...g, required: e.target.checked })}
                style={{ width: 16, height: 16, flexShrink: 0 }} />
              Customer must choose
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: 0 }}>
              Most they can pick
              <select value={Math.min(g.max, Math.max(1, g.choices.length))} onChange={e => setGroup(gi, { ...g, max: Number(e.target.value) })}
                style={{ width: 72, padding: "6px 10px" }}>
                {Array.from({ length: Math.max(1, g.choices.length) }, (_, n) => n + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          {g.choices.map((c, ci) => (
            <div key={c.id} className="zb-opt-choice" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 84px auto 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <input aria-label="Choice name" value={c.name} onChange={e => setChoice(gi, ci, { ...c, name: e.target.value })}
                placeholder={ci === 0 ? "e.g. Large" : "Choice"} />
              <input aria-label={`Extra price for ${c.name || "this choice"}`} type="number" inputMode="decimal" step="0.5" min="0"
                value={c.price} onChange={e => setChoice(gi, ci, { ...c, price: e.target.value })} placeholder="+ $0" />
              <label className="zb-opt-out" title="Customers can't pick it while it's sold out" style={{ display: "flex", gap: 5, alignItems: "center", margin: 0, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={!c.available} onChange={e => setChoice(gi, ci, { ...c, available: !e.target.checked })}
                  style={{ width: 14, height: 14 }} />
                Sold out
              </label>
              <button type="button" aria-label={`Remove ${c.name || "choice"}`} className="bg-btn" style={{ padding: "4px 0", width: 32, height: 32 }}
                onClick={() => setGroup(gi, { ...g, choices: g.choices.filter((_, idx) => idx !== ci) })}>
                ×
              </button>
            </div>
          ))}

          {g.choices.length < MAX_CHOICES && (
            <button type="button" className="bg-btn" style={{ fontSize: 12, padding: "5px 10px", marginTop: 2 }}
              onClick={() => setGroup(gi, { ...g, choices: [...g.choices, blankChoice()] })}>
              + Choice
            </button>
          )}
        </div>
      ))}

      {value.length < MAX_GROUPS && (
        <button type="button" className="bg-btn" style={{ fontSize: 12, padding: "6px 12px" }}
          onClick={() => onChange([...value, { id: newOptionId(), name: "", required: false, max: 1, choices: [blankChoice(), blankChoice()] }])}>
          + Option group
        </button>
      )}
    </div>
  );
}
