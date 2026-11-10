"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// "What do you run?" on the homepage. The choice changes the WORDS in the
// sections after it (the tour, keep what you earn, the index and see your own
// site). The screens stay our demo restaurant, because that's the only demo
// there is so far.

export type BusinessType = "food" | "shops" | "salons" | "trades";

export const TYPES: { id: BusinessType; label: string; who: string }[] = [
  { id: "food", label: "Food", who: "Restaurants, cafés, takeaways, food trucks, bakeries and bars." },
  { id: "shops", label: "Shops", who: "Retail stores, boutiques, convenience stores and online sellers." },
  { id: "salons", label: "Salons and gyms", who: "Hair, beauty, nails, barbers, gyms and personal trainers." },
  { id: "trades", label: "Trades", who: "Plumbers, electricians, cleaners and mechanics." },
];

const Ctx = createContext<{ type: BusinessType; setType: (t: BusinessType) => void }>({
  type: "food",
  setType: () => {},
});

export function BusinessTypeProvider({ children }: { children: ReactNode }) {
  const [type, setTypeState] = useState<BusinessType>("food");
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

export function BusinessTypeSwitch() {
  const { type, setType } = useBusinessType();
  const current = TYPES.find((t) => t.id === type) ?? TYPES[0]!;
  return (
    <section className="hm-switch" aria-labelledby="switch-title" data-reveal>
      <div className="wrap hm-switch-grid">
        <div className="hm-switch-head">
          <h2 id="switch-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            What do you run?
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            Pick one. We&apos;ll show the parts you&apos;d use.
          </p>
        </div>
        <fieldset className="hm-types">
          <legend className="sr-only">Your kind of business</legend>
          <div className="hm-types-row">
            {TYPES.map((t, i) => (
              <label key={t.id} className="hm-type" data-r style={{ "--i": i + 2 } as React.CSSProperties}>
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
          <p className="hm-types-who" aria-live="polite">
            <span key={current.id} className="hm-swap">
              {current.who}
            </span>
          </p>
        </fieldset>
      </div>
    </section>
  );
}

// Words that change with the business type. Each section picks its own set.
export function byType<T>(type: BusinessType, table: Record<BusinessType, T>): T {
  return table[type];
}
