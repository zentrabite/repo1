"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { OPEN_ASSISTANT } from "./assistant-trigger";

// The website assistant, as a round chat button fixed bottom-right on every
// marketing page. The footer renders it (last in the tab order), so the demos,
// which have their own shell, never get it.
//
// - Closed by default. It never opens by itself and never nudges.
// - A panel that grows out of the button's corner, 380 x 560 on a computer and
//   nearly full width on a phone. The button stays below it and turns into an
//   X while it's open, so the same spot opens and closes it.
// - On a phone the page behind is dimmed and doesn't scroll while it's open.
// - Escape, the X button or a tap outside closes it. Focus goes in on open
//   and back to whatever opened it on close.
// - The chat itself (AiChat and /api/ai-chat, with their limits and greeting)
//   only loads when the button is first used.
// - It steps out of the way of buttons, form fields and the theme picker that
//   scroll into its corner, so it never covers them.

const AiChat = dynamic(() => import("./ai-chat").then((m) => m.AiChat), {
  ssr: false,
  loading: () => <p className="zb-assist-loading">Loading the assistant…</p>,
});

// Things the button must never sit on top of.
const AVOID = '.btn-primary, input, textarea, select, button[type="submit"], .theme-choice, [data-launcher-avoid]';
const SHEET = "(max-width: 640px)";

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const button = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const show = useCallback((from?: HTMLElement | null) => {
    returnTo.current = from ?? (document.activeElement as HTMLElement | null) ?? button.current;
    setLoaded(true);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    const back = returnTo.current;
    // After the panel is inert again, so focus can't land inside it.
    requestAnimationFrame(() => (back && document.contains(back) ? back : button.current)?.focus());
  }, []);

  // "Ask the assistant" links elsewhere on the page.
  useEffect(() => {
    const onOpen = (e: Event) => show((e as CustomEvent<HTMLElement | undefined>).detail ?? null);
    window.addEventListener(OPEN_ASSISTANT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT, onOpen);
  }, [show]);

  // While open: Escape, tap outside, keep Tab inside, and on a phone hold the page still.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const sheet = window.matchMedia(SHEET).matches;
    const prev = root.style.overflow;
    if (sheet) root.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Tab cycles through the panel and the X button below it.
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
        ...(button.current ? [button.current] : []),
      ].filter((el) => el.offsetParent !== null || el === button.current);
      if (!focusable.length) return;
      // The X button sits before the panel in the page, so the browser's own
      // order would leave the set. Step through the list ourselves, wrapping.
      e.preventDefault();
      const at = focusable.indexOf(document.activeElement as HTMLElement);
      const step = e.shiftKey ? -1 : 1;
      const next = at === -1 ? (e.shiftKey ? focusable.length - 1 : 0) : (at + step + focusable.length) % focusable.length;
      focusable[next]!.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || button.current?.contains(t)) return;
      hide();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      root.style.overflow = prev;
    };
  }, [open, hide]);

  // Move focus in once the panel is showing (and again when the chat finishes loading).
  useEffect(() => {
    if (!open) return;
    let tries = 0;
    let t = 0;
    const focusIn = () => {
      const input = panel.current?.querySelector<HTMLInputElement>("#ai-chat-input");
      if (input) {
        input.focus({ preventScroll: true });
        return;
      }
      button.current?.focus({ preventScroll: true });
      if (tries++ < 20) t = window.setTimeout(focusIn, 100);
    };
    t = window.setTimeout(focusIn, 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // Step aside when something that matters scrolls into the button's corner.
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    const hits = new Set<Element>();
    const setup = () => {
      io?.disconnect();
      hits.clear();
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The corner the button sits in, plus a little room around it.
      const zoneW = 104;
      const zoneH = 112;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) hits.add(e.target);
            else hits.delete(e.target);
          }
          setBlocked(hits.size > 0);
        },
        { rootMargin: `-${Math.max(0, h - zoneH)}px 0px 0px -${Math.max(0, w - zoneW)}px` },
      );
      document.querySelectorAll(AVOID).forEach((el) => {
        if (!el.closest(".zb-assist")) io?.observe(el);
      });
    };
    setup();
    window.addEventListener("resize", setup);
    return () => {
      window.removeEventListener("resize", setup);
      io?.disconnect();
    };
  }, []);

  const preload = () => {
    void import("./ai-chat");
  };

  return (
    <div className="zb-assist">
      <button
        ref={button}
        type="button"
        className={`zb-assist-btn${open ? " open" : ""}${blocked && !open ? " aside" : ""}`}
        aria-label={open ? "Close the assistant" : "Ask the assistant"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="zb-assistant"
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => (open ? hide() : show(button.current))}
      >
        {/* Both icons sit on top of each other. Opening turns the chat bubble
            away and turns the X in, so the button becomes the way to close. */}
        <svg
          className="zb-assist-icon zb-assist-icon-chat"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19.5l1.5-4.6A7.5 7.5 0 1 1 20 11.5Z" />
        </svg>
        <svg
          className="zb-assist-icon zb-assist-icon-close"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className={`zb-assist-scrim${open ? " open" : ""}`} aria-hidden="true" onClick={hide} />

      <div
        ref={panel}
        id="zb-assistant"
        className={`zb-assist-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="ZentraBite assistant"
        inert={!open}
      >
        {loaded && <AiChat />}
      </div>
    </div>
  );
}
