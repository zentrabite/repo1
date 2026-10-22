"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { ThemeButton } from "./theme-toggle";
import { LOGIN_URL } from "../../lib/config";

const LINKS = [
  { href: "/#features", label: "What's inside" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-nav${scrolled || open ? " scrolled" : ""}`}>
      <div className="container site-nav-inner">
        <Link href="/" aria-label="ZentraBite home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="site-nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="site-nav-actions">
          <ThemeButton />
          <a href={LOGIN_URL} className="btn-ghost hide-mobile">
            Log in
          </a>
          <Link href="/contact" className="btn-primary hide-mobile">
            Book a call
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu${open ? " open" : ""}`}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="menu-link" onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <div className="btn-row">
          <Link href="/contact" className="btn-primary" onClick={() => setOpen(false)}>
            Book a call
          </Link>
          <a href={LOGIN_URL} className="btn-secondary">
            Log in
          </a>
        </div>
      </div>
    </header>
  );
}
