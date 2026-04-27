"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Logo } from "../components/logo";
import { slides } from "./slides";
import { SlideVisual } from "./slide-visual";

export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const total = slides.length;

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const goto = useCallback((i: number) => setIndex(Math.max(0, Math.min(i, total - 1))), [total]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        goto(0);
      } else if (e.key === "End") {
        goto(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goto, total]);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    if (index >= total - 1) {
      setAutoplay(false);
      return;
    }
    const t = setTimeout(() => next(), 7000);
    return () => clearTimeout(t);
  }, [autoplay, index, next, total]);

  const slide = slides[index]!;
  const isLast = index === total - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--near-black)",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(15,25,42,0.85)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--mist-9)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Link href="/">
            <Logo size={32} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "var(--steel)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <button
              onClick={() => setAutoplay((v) => !v)}
              className="btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
              aria-label="Toggle autoplay"
            >
              {autoplay ? "⏸ Pause" : "▶ Auto-play"}
            </button>
            <Link href="/" className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              Exit
            </Link>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--mist-6)" }}>
          <div
            style={{
              height: "100%",
              width: `${((index + 1) / total) * 100}%`,
              background: "var(--green)",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </header>

      {/* Slide stage */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          padding: "48px 24px",
        }}
        className="grid-bg"
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "center",
            maxWidth: 1200,
          }}
          key={slide.id}
        >
          <div className="fade-up">
            <div className="eyebrow" style={{ marginBottom: 18 }}>
              {slide.eyebrow}
            </div>
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                margin: "0 0 18px",
                color: "var(--cloud)",
                lineHeight: 1.1,
              }}
            >
              {slide.title}
            </h1>
            <p
              style={{
                fontSize: 17,
                color: "var(--steel)",
                lineHeight: 1.65,
                marginBottom: 24,
              }}
            >
              {slide.body}
            </p>

            <ul
              style={{
                listStyle: "none",
                display: "grid",
                gap: 10,
                marginBottom: 32,
              }}
            >
              {slide.bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    fontSize: 15,
                    color: "var(--cloud)",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: "var(--green-15)",
                      color: "var(--green)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {/* Impact tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
              className="impact-tiles"
            >
              {slide.impact.map((m) => (
                <div
                  key={m.metric}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-6)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--steel)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                    }}
                  >
                    {m.metric}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-outfit)",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "var(--green)",
                      marginTop: 4,
                    }}
                  >
                    {m.value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {isLast && (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 32,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  Four ways to dig in
                </div>
                <Link href="/demo/live" className="btn-primary" style={{ padding: "12px 20px", fontSize: 14, justifyContent: "flex-start" }}>
                  🧠 Run the merchant CRM sandbox →
                </Link>
                <Link href="/demo/merchant" className="btn-secondary" style={{ padding: "12px 20px", fontSize: 14, justifyContent: "flex-start" }}>
                  🛒 See the customer storefront →
                </Link>
                <Link href="/demo/super-admin" className="btn-secondary" style={{ padding: "12px 20px", fontSize: 14, justifyContent: "flex-start" }}>
                  🔐 See the platform super admin →
                </Link>
                <Link href="/contact" className="btn-ghost" style={{ padding: "12px 20px", fontSize: 14, justifyContent: "flex-start", marginTop: 6 }}>
                  → Start my 1-month free trial
                </Link>
              </div>
            )}
          </div>

          <div
            className="fade-up"
            style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <SlideVisual kind={slide.visual} />
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer
        style={{
          padding: "20px 24px",
          borderTop: "1px solid var(--mist-9)",
          background: "rgba(15,25,42,0.6)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <button
            onClick={prev}
            disabled={index === 0}
            className="btn-secondary"
            style={{
              padding: "10px 18px",
              fontSize: 14,
              opacity: index === 0 ? 0.4 : 1,
              cursor: index === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Previous
          </button>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
              flex: 1,
              maxWidth: 600,
            }}
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goto(i)}
                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                style={{
                  width: i === index ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === index ? "var(--green)" : "var(--mist-12)",
                  border: "none",
                  cursor: "pointer",
                  transition: "width 0.25s, background 0.2s",
                  padding: 0,
                }}
              />
            ))}
          </div>

          {isLast ? (
            <Link
              href="/contact"
              className="btn-primary"
              style={{ padding: "10px 18px", fontSize: 14 }}
            >
              Book a call →
            </Link>
          ) : (
            <button onClick={next} className="btn-primary" style={{ padding: "10px 18px", fontSize: 14 }}>
              Next →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}