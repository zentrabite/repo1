"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { RevealObserver } from "./reveal";
import { LOGIN_URL } from "../../lib/config";

// The bar at the top of every marketing page: the wordmark, three links,
// Log in and "Book a call".
// It's fixed. Over a navy section (marked data-nav-tone="navy") it turns navy
// too, as a hard cut. On a phone the links fold into a "Menu" sheet.

const LINKS = [
  { href: "/#tour", label: "Tour" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

/** startNavy: the page opens on a navy section, so the first paint is navy too. */
export function Nav({ startNavy = false }: { startNavy?: boolean }) {
  const [navy, setNavy] = useState(startNavy);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement | null>(null);
  const menuBtn = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navy while a navy section is under the bar.
  useEffect(() => {
    const sections = document.querySelectorAll("[data-nav-tone='navy']");
    if (!sections.length) {
      setNavy(false);
      return;
    }
    let io: IntersectionObserver | null = null;
    const under = new Set<Element>();
    const setup = () => {
      io?.disconnect();
      under.clear();
      const h = bar.current?.offsetHeight ?? 72;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) under.add(e.target);
            else under.delete(e.target);
          }
          setNavy(under.size > 0);
        },
        // A band as tall as the bar, across the top of the screen.
        { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - h / 2)}px 0px` },
      );
      sections.forEach((s) => io?.observe(s));
    };
    setup();
    window.addEventListener("resize", setup);
    return () => {
      window.removeEventListener("resize", setup);
      io?.disconnect();
    };
  }, []);

  // The phone menu: hold the page still, Escape closes it, focus goes in and comes back.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  const cls = ["site-nav", navy && !open ? "on-navy" : "", scrolled ? "scrolled" : "", open ? "menu-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header ref={bar} className={cls}>
        <div className="wrap site-nav-inner">
          <Link href="/" aria-label="ZentraBite home" className="nav-logo" onClick={close}>
            <Logo />
          </Link>

          <nav className="site-nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-link">
                {l.label}
              </Link>
            ))}
            <a href={LOGIN_URL} className="nav-link">
              Log in
            </a>
          </nav>

          <div className="site-nav-actions">
            <Link href="/contact" className="btn-primary nav-cta">
              Book a call
            </Link>
            <button
              ref={menuBtn}
              type="button"
              className="nav-menu-btn"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        <div id="mobile-menu" ref={menu} className={`mobile-menu${open ? " open" : ""}`} hidden={!open}>
          <nav className="wrap mobile-menu-inner" aria-label="Menu">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="menu-link" onClick={close}>
                {l.label}
              </Link>
            ))}
            <a href={LOGIN_URL} className="menu-link">
              Log in
            </a>
            <Link href="/contact" className="btn-primary btn-lg menu-cta" onClick={close}>
              Book a call
            </Link>
          </nav>
        </div>
      </header>
      <RevealObserver />
    </>
  );
}
