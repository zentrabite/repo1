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

// The browser bar colour on phones. app/layout.tsx gives two theme-color tags,
// one per device setting. When someone picks light or dark, both take that
// theme's page colour (--bg). "Device" puts them back.
function syncBarColour() {
  const root = document.documentElement;
  const forced = root.hasAttribute("data-theme");
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (m.dataset.device === undefined) m.dataset.device = m.content;
    m.content = forced && bg ? bg : m.dataset.device;
  });
}

function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  syncBarColour();
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
  // The nav is on every page, so this also covers a choice saved on an earlier visit.
  useEffect(syncBarColour, []);
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
