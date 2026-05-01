"use client";

import { useEffect } from "react";

/**
 * Client-only behaviour for the 3D landing v4:
 * - Top progress bar
 * - Nav scroll-aware class toggle
 * - IntersectionObserver-based reveal animations
 * - count-up stat numbers
 * - Storytelling scroll-spy (sets .active on the panel/nav-item closest to centre)
 * - MacBook tilt on mouse-move
 * - Background blob parallax on mouse-move
 *
 * No three.js — the ambient look comes from the CSS .blob elements rendered
 * by V4Background. Drop this component once at the top of the page.
 */
export function V4Effects() {
  useEffect(() => {
    const onProgress = () => {
      const d = document.documentElement;
      const el = document.getElementById("prog");
      if (!el) return;
      const ratio = scrollY / (d.scrollHeight - d.clientHeight || 1);
      el.style.width = `${ratio * 100}%`;
    };
    const onNav = () => {
      const nav = document.querySelector(".v4-nav");
      if (nav) nav.classList.toggle("scrolled", scrollY > 50);
    };
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / innerWidth;
      const y = e.clientY / innerHeight;
      const a = document.getElementById("blob-a");
      const b = document.getElementById("blob-b");
      const c = document.getElementById("blob-c");
      if (a) a.style.transform = `translate(${x * 20}px,${y * 15}px)`;
      if (b) b.style.transform = `translate(${-x * 18}px,${-y * 14}px)`;
      if (c) c.style.transform = `translate(${(x - 0.5) * 25}px,${(y - 0.5) * 20}px)`;
    };
    window.addEventListener("scroll", onProgress, { passive: true });
    window.addEventListener("scroll", onNav, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    onProgress();
    onNav();

    // MacBook tilt
    const mb = document.getElementById("mbTilt");
    const wrap = mb?.closest(".macbook-wrap");
    const onMbMove = (e: Event) => {
      if (!mb) return;
      const me = e as MouseEvent;
      const r = mb.getBoundingClientRect();
      const rx = ((me.clientY - r.top) / r.height - 0.5) * -12;
      const ry = ((me.clientX - r.left) / r.width - 0.5) * 12;
      mb.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      mb.style.animation = "none";
      mb.style.transition = "transform 0.08s";
    };
    const onMbLeave = () => {
      if (!mb) return;
      mb.style.animation = "v4-mb-float 8s ease-in-out infinite";
      mb.style.transition = "";
      mb.style.transform = "";
    };
    wrap?.addEventListener("mousemove", onMbMove);
    wrap?.addEventListener("mouseleave", onMbLeave);

    // Reveal-on-scroll
    const reveals = document.querySelectorAll(".v4 .reveal");
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            setTimeout(() => el.classList.add("in"), i * 65);
            ro.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    reveals.forEach((el) => ro.observe(el));

    // Count-up
    const counts = document.querySelectorAll<HTMLElement>(".v4 .count-up");
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          const target = Number(el.dataset.target || 0);
          const suffix = el.dataset.suffix || "";
          let cur = 0;
          const inc = target / 60;
          const id = setInterval(() => {
            cur = Math.min(cur + inc, target);
            el.textContent = Math.round(cur).toLocaleString() + suffix;
            if (cur >= target) clearInterval(id);
          }, 16);
          co.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counts.forEach((el) => co.observe(el));

    // Storytelling scroll-spy
    const panels = document.querySelectorAll<HTMLElement>(".v4 .story-panel");
    const navItems = document.querySelectorAll<HTMLElement>(".v4 .story-nav-item");
    const storyObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.4) {
            const id = (e.target as HTMLElement).dataset.panel;
            panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === id));
            navItems.forEach((n) => n.classList.toggle("active", n.dataset.panel === id));
          }
        });
      },
      { threshold: 0.4, rootMargin: "-20% 0px -20% 0px" }
    );
    panels.forEach((p) => storyObs.observe(p));
    const onNavClick = (item: HTMLElement) => () => {
      const id = item.dataset.panel;
      const target = document.querySelector<HTMLElement>(`.v4 .story-panel[data-panel="${id}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const handlers: Array<[HTMLElement, () => void]> = [];
    navItems.forEach((item) => {
      const h = onNavClick(item);
      item.addEventListener("click", h);
      handlers.push([item, h]);
    });

    return () => {
      window.removeEventListener("scroll", onProgress);
      window.removeEventListener("scroll", onNav);
      window.removeEventListener("mousemove", onMove);
      wrap?.removeEventListener("mousemove", onMbMove);
      wrap?.removeEventListener("mouseleave", onMbLeave);
      ro.disconnect();
      co.disconnect();
      storyObs.disconnect();
      handlers.forEach(([el, h]) => el.removeEventListener("click", h));
    };
  }, []);

  return null;
}
