"use client";

// Keyboard behaviour for a dialog (components/modal.tsx, and the drawers on
// the ordering page). While it's open, focus moves into it, Tab and Shift+Tab
// stay inside, Escape closes it, and focus goes back to whatever opened it.
// With two open, only the top one answers Escape.

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

const stack: object[] = [];

/** Put the returned ref on the dialog's panel, which should have tabIndex={-1}. */
export function useDialog<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const me = {};
    stack.push(me);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = ref.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    const stops = () => panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0)
      : [];

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== me || !panel) return;
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab") return;
      const list = stops();
      if (!list.length) { e.preventDefault(); panel.focus(); return; }
      const first = list[0]!, last = list[list.length - 1]!;
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === panel || !panel.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !panel.contains(at))) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return ref;
}

/** Props that let a keyboard reach a clickable table row and open it with Enter or Space. */
export function rowKeys(onOpen: () => void) {
  return {
    tabIndex: 0,
    className: "zb-click",
    onClick: onOpen,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
    },
  };
}
