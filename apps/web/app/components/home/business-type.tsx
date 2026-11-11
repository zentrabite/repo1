"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// "How do your customers buy?" at the start of the tour (12 Nov). It asks how
// a business sells, not what it is, so every kind of business fits one of the
// three. The choice changes the WORDS in the sections from the green band to
// set up (keep what you earn, the tour, the index and set up). The screens
// stay our demo restaurant, because that's the only demo there is so far.

export type BusinessType = "order" | "book" | "quote";

export const TYPES: { id: BusinessType; label: string; who: string }[] = [
  { id: "order", label: "They order", who: "Restaurants, cafés, takeaways, bakeries, shops and online sellers." },
  { id: "book", label: "They book", who: "Salons, barbers, gyms, studios, clinics and personal trainers." },
  { id: "quote", label: "They ask for a quote", who: "Plumbers, electricians, cleaners, mechanics and other services." },
];

const Ctx = createContext<{ type: BusinessType; setType: (t: BusinessType) => void }>({
  type: "order",
  setType: () => {},
});

export function BusinessTypeProvider({ children }: { children: ReactNode }) {
  const [type, setTypeState] = useState<BusinessType>("order");
  const setType = (t: BusinessType) => {
    // From the first change on, the words that change fade in (.hm-swap in globals.css).
    document.documentElement.dataset.typeChanged = "1";
    setTypeState(t);
  };
  return <Ctx.Provider value={{ type, setType }}>{children}</Ctx.Provider>;
}

export function useBusinessType() {
  return useContext(Ctx);
}

export function BusinessTypePicker() {
  const { type, setType } = useBusinessType();
  const current = TYPES.find((t) => t.id === type) ?? TYPES[0]!;
  return (
    <div className="hm-pick">
      <p id="pick-label" className="hm-pick-label">
        How do your customers buy?
      </p>
      <div className="hm-pick-row" role="radiogroup" aria-labelledby="pick-label">
        {TYPES.map((t) => (
          <label key={t.id} className="hm-type">
            <input
              type="radio"
              name="business-type"
              value={t.id}
              checked={type === t.id}
              onChange={() => setType(t.id)}
            />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
      <p className="hm-pick-line" aria-live="polite">
        <span key={current.id} className="hm-swap">
          {current.who}
        </span>
      </p>
    </div>
  );
}

// Words that change with how customers buy. Each section picks its own set.
export function byType<T>(type: BusinessType, table: Record<BusinessType, T>): T {
  return table[type];
}
