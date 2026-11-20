"use client";

// Lets a customer (on the ordering page) or staff (on the POS) pick an item's
// sizes, extras and choices. The page around it adds the Add button and works
// out the price with priceSelection() from lib/menu-options.

import { groupRule, toggleChoice, type OptionGroup } from "@/lib/menu-options";

export type PickerColors = { text: string; muted: string; accent: string; onAccent: string; line: string };

export function OptionPicker({ groups, picked, onChange, colors }: {
  groups:   OptionGroup[];
  picked:   string[];
  onChange: (next: string[]) => void;
  colors:   PickerColors;
}) {
  return (
    <>
      {groups.map(g => {
        const count = picked.filter(id => g.choices.some(c => c.id === id)).length;
        const full = g.max > 1 && count >= g.max;
        const needsMore = count < g.min;
        const single = g.max === 1;
        return (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div id={`grp-${g.id}`} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>{g.name}</span>
              <span style={{ fontSize: 12, color: needsMore ? colors.accent : colors.muted, fontWeight: needsMore ? 600 : 400 }}>{groupRule(g)}</span>
            </div>
            <div role={single ? "radiogroup" : "group"} aria-labelledby={`grp-${g.id}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.choices.map(c => {
                const on = picked.includes(c.id);
                const disabled = !on && (!c.available || full);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role={single ? "radio" : "checkbox"}
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => onChange(toggleChoice(groups, picked, c.id))}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, minHeight: 46, padding: "10px 12px",
                      borderRadius: 10, border: `1px solid ${on ? colors.accent : colors.line}`,
                      background: on ? `color-mix(in srgb, ${colors.accent} 14%, transparent)` : "transparent",
                      color: colors.text, textAlign: "left", font: "inherit", width: "100%",
                      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
                    }}
                  >
                    <span aria-hidden="true" style={{
                      width: 20, height: 20, flexShrink: 0, borderRadius: single ? "50%" : 6,
                      border: `2px solid ${on ? colors.accent : colors.muted}`,
                      background: on ? colors.accent : "transparent",
                      display: "grid", placeItems: "center",
                    }}>
                      {on && (single
                        ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.onAccent }} />
                        : <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke={colors.onAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, lineHeight: 1.3 }}>
                      {c.name}{!c.available && <span style={{ color: colors.muted }}> · Sold out</span>}
                    </span>
                    {c.price > 0 && <span style={{ fontSize: 13, color: colors.muted, whiteSpace: "nowrap" }}>+${c.price.toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** The first group still missing a pick, for the Add button's wording. */
export function missingGroup(groups: OptionGroup[], picked: string[]): OptionGroup | undefined {
  return groups.find(g => picked.filter(id => g.choices.some(c => c.id === id)).length < g.min);
}
