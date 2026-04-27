// ============================================================
// app/menu/page.tsx
// MENU BUILDER PAGE — categories with item cards and toggles
// ============================================================

"use client";

import { useState } from "react";
import PageHeader from "@/components/page-header";

const MENU = [
  { cat: "Mains", items: [
    { name: "Margherita", price: 22, available: true, tags: ["Vegetarian"] },
    { name: "Pepperoni", price: 24, available: true, tags: [] },
    { name: "Prosciutto & Rocket", price: 26, available: true, tags: [] },
  ]},
  { cat: "Sides", items: [
    { name: "Garlic Bread", price: 9, available: true, tags: ["Vegetarian"] },
    { name: "Arancini (3pc)", price: 14, available: true, tags: ["Vegetarian"] },
    { name: "Bruschetta", price: 12, available: false, tags: ["Vegan"] },
  ]},
  { cat: "Drinks", items: [
    { name: "Sparkling Water", price: 5, available: true, tags: [] },
    { name: "Coke / Sprite", price: 4.5, available: true, tags: [] },
    { name: "House Wine", price: 12, available: true, tags: [] },
  ]},
];

export default function MenuPage() {
  // Track which items have been toggled on/off
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const toggle = (key: string, current: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: !current }));
  };

  return (
    <>
      <PageHeader title="Menu Builder" subtitle="Changes publish instantly" action={{ label: "+ Add Item" }} />

      {MENU.map((section, si) => (
        <div key={si} className="mb-7">
          {/* Category heading */}
          <div className="mb-3 flex items-center gap-2">
            <span className="font-heading text-[15px] font-semibold text-white">{section.cat}</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">{section.items.length}</span>
          </div>

          {/* Item cards */}
          {section.items.map((item, ii) => {
            const key = `${si}-${ii}`;
            const isOn = toggles[key] !== undefined ? toggles[key] : item.available;

            return (
              <div
                key={ii}
                className="mb-2 flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#1c2d48]/35 p-3.5 backdrop-blur-xl transition-all hover:border-white/[0.12]"
              >
                {/* Item icon placeholder */}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-lg">
                  🍕
                </div>

                {/* Item info */}
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white">{item.name}</p>
                  <div className="mt-1 flex gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[#00B67A]/15 bg-[#00B67A]/10 px-2 py-0.5 text-[10px] text-[#00B67A]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <span className="min-w-[50px] text-right font-heading text-sm font-bold text-white">
                  ${item.price.toFixed(2)}
                </span>

                {/* Toggle switch */}
                <button
                  onClick={() => toggle(key, isOn)}
                  className={`relative h-6 w-11 rounded-full border transition-all ${
                    isOn
                      ? "border-[#00B67A]/30 bg-[#00B67A]/30"
                      : "border-white/[0.08] bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all ${
                      isOn
                        ? "left-[21px] bg-[#00B67A] shadow-md shadow-[#00B67A]/40"
                        : "left-[3px] bg-slate-500"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
