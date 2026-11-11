"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// "What do you run?" sits in the homepage hero (picked 11 Nov, round 3). The
// choice changes the line under it and the WORDS in the sections after it
// (keep what you earn, the tour, win-back, the index and set up). The screens
// stay our demo restaurant, because that's the only demo there is so far.

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

// What the hero says for each kind of business, in the tour's words.
const LINE: Record<BusinessType, string> = {
  food: "Customers order on your own site with no commission. Then they're on your list, they earn points, and they get a text if they go quiet.",
  shops: "Customers buy on your own site with no commission. Then they're on your list, they earn points, and they get a text if they go quiet.",
  salons: "Clients book on your own site with no commission. Then they're on your client list, they earn points, and they get a text if they don't rebook.",
  trades: "Customers ask for a job on your own site. Then they're on your list, they earn points, and they get a text when they're due.",
};

export function BusinessTypePicker() {
  const { type, setType } = useBusinessType();
  return (
    <div className="hm-pick">
      <div className="hm-pick-row" role="radiogroup" aria-labelledby="pick-label">
        <span id="pick-label" className="hm-pick-label">
          What do you run?
        </span>
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
        <span key={type} className="hm-swap">
          {LINE[type]}
        </span>
      </p>
    </div>
  );
}

// Words that change with the business type. Each section picks its own set.
export function byType<T>(type: BusinessType, table: Record<BusinessType, T>): T {
  return table[type];
}
