"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { LOGIN_URL, SIGNUP_URL } from "../../lib/config";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#showcase", label: "Product" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.25s, border-color 0.25s, backdrop-filter 0.25s",
        background: scrolled ? "rgba(15,25,42,0.78)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled ? "1px solid var(--mist-9)" : "1px solid transparent",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 72,
        }}
      >
        <Link href="/" aria-label="ZentraBite home">
          <Logo />
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          className="nav-links-desktop"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost">
              {l.label}
            </Link>
          ))}
        </nav>

        <div
          style={{ display: "flex", alignItems: "center", gap: 10 }}
          className="nav-cta-desktop"
        >
          <a href={LOGIN_URL} className="btn-ghost">
            Log in
          </a>
          <a href={SIGNUP_URL} className="btn-primary">
            Start free trial
            <span aria-hidden>→</span>
          </a>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="nav-toggle"
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid var(--mist-12)",
            borderRadius: 10,
            padding: 10,
            color: "var(--cloud)",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="mobile-menu"
          style={{
            background: "rgba(15,25,42,0.96)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid var(--mist-9)",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 8px",
                color: "var(--cloud)",
                fontWeight: 500,
                borderRadius: 8,
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ height: 8 }} />
          <a href={LOGIN_URL} className="btn-secondary" style={{ justifyContent: "center" }}>
            Log in
          </a>
          <a href={SIGNUP_URL} className="btn-primary" style={{ justifyContent: "center" }}>
            Start free trial
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .nav-links-desktop, .nav-cta-desktop { display: none !important; }
          .nav-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
