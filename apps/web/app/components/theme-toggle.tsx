"use client";

import { useEffect, useState } from "react";
import { Icon } from "./zb-icon";

// Light and dark mode.
// With nothing saved, the site follows the device setting (the CSS does that
// on its own). Picking light or dark saves it and sets data-theme on <html>.
// The script in app/layout.tsx applies the saved choice before first paint.

export type ThemeChoice = "system" | "light" | "dark";

const KEY = "zb-theme";
const EVENT = "zb-theme-change";

function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private mode or storage blocked. The choice still applies to this visit.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: choice }));
}

function isDarkNow(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function useThemeChoice(): ThemeChoice {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    setChoice(readChoice());
    const onChange = (e: Event) => setChoice((e as CustomEvent<ThemeChoice>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return choice;
}

/** One button for the top bar. Swaps between light and dark. The icon is
 *  picked by CSS so it's right before the page has finished loading. */
export function ThemeButton() {
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={() => applyChoice(isDarkNow() ? "light" : "dark")}
      aria-label="Switch between light and dark mode"
      title="Light or dark mode"
    >
      <span className="icon-sun"><Icon name="sun" size={20} /></span>
      <span className="icon-moon"><Icon name="moon" size={20} /></span>
    </button>
  );
}

/** Three-way choice for the footer, including following the device. */
export function ThemeChoicePicker() {
  const choice = useThemeChoice();
  const options: { value: ThemeChoice; label: string; icon: "monitor" | "sun" | "moon" }[] = [
    { value: "system", label: "Device", icon: "monitor" },
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
  ];
  return (
    <div className="theme-choice" role="group" aria-label="Colour theme">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={choice === o.value}
          onClick={() => applyChoice(o.value)}
        >
          <Icon name={o.icon} size={16} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
