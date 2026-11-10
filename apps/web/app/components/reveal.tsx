"use client";

import { useEffect } from "react";

// Scroll reveals for [data-reveal] sections. Their [data-r] parts rise in once,
// in order (--i sets the stagger), when the section's top passes 88% of the
// way down the screen. Styles are under "Reveals" in globals.css.
//
// Nothing is hidden until this runs: sections already on screen are marked
// shown first, then html gets .reveal-ready, which is what hides the rest.
// With no script, or with reduced motion, everything simply shows.
export function RevealObserver() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")];
    const h = window.innerHeight;
    for (const el of els) {
      if (el.getBoundingClientRect().top < h * 0.88) el.classList.add("is-in");
    }
    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of els) if (!el.classList.contains("is-in")) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
