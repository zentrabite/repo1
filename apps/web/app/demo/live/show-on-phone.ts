import { useEffect, useState } from "react";

// On a phone the detail panel sits under the list, so tapping a row would look
// like nothing happened. This scrolls the panel into view, on phones only.
export function showOnPhone(id: string) {
  if (typeof window === "undefined" || !window.matchMedia("(max-width: 820px)").matches) return;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

// True on phone-sized screens. Charts use it to draw a narrower picture so the
// labels stay readable instead of shrinking to a few pixels.
export function useNarrow(maxWidth = 820) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [maxWidth]);
  return narrow;
}
