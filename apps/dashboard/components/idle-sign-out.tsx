"use client";

// A POS login signs out after 15 minutes with no taps (Deon, 25 Nov 2026), so
// a till left open can't be used by whoever walks past. Only the POS role:
// owners, managers and staff stay signed in. A minute before, a note says so,
// and any tap keeps it signed in. Signs out this device only (/auth/logout
// with ?idle=1), so another till on the same login carries on.
//
// Every tab of the CRM on the device shares the last tap, so a second tab
// left in the background doesn't sign out a till that's being used. Time is
// checked against the clock, so a tablet that slept past 15 minutes signs out
// as soon as it wakes.

import { useEffect, useState } from "react";

export const IDLE_MS = 15 * 60 * 1000;
export const WARN_MS = 60 * 1000;
const KEY = "zb-last-tap";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** Pure: what to do now, given the last tap. */
export function idleState(now: number, lastTap: number): "ok" | "warn" | "out" {
  const idle = now - lastTap;
  if (idle >= IDLE_MS) return "out";
  if (idle >= IDLE_MS - WARN_MS) return "warn";
  return "ok";
}

function sharedLastTap(): number {
  try { return Number(window.localStorage.getItem(KEY)) || 0; } catch { return 0; }
}

export default function IdleSignOut() {
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    let last = Date.now();
    let saved = 0;
    let leaving = false;

    const save = (at: number) => {
      saved = at;
      try { window.localStorage.setItem(KEY, String(at)); } catch { /* this tab's own clock still works */ }
    };
    save(last);

    const check = () => {
      if (leaving) return;
      const state = idleState(Date.now(), Math.max(last, sharedLastTap()));
      if (state === "out") {
        leaving = true;
        window.location.href = "/auth/logout?idle=1";
        return;
      }
      setWarn(state === "warn");
    };
    const onTap = () => {
      last = Date.now();
      // Written at most every 10 seconds, not on every tap.
      if (last - saved > 10_000) save(last);
      setWarn(false);
    };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };

    for (const e of EVENTS) window.addEventListener(e, onTap, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 5_000);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, onTap, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!warn) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", zIndex: 200,
        left: "50%", transform: "translateX(-50%)",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        width: "min(440px, calc(100vw - 32px))", boxSizing: "border-box",
        padding: "14px 18px", borderRadius: 12,
        background: "#FFC14B", color: "#0F1F2D",
        fontFamily: "var(--font-inter)", fontSize: 15, fontWeight: 600, lineHeight: 1.4,
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)", textAlign: "center",
      }}
    >
      No taps for 14 minutes. This till signs out in a minute. Tap anywhere to stay signed in.
    </div>
  );
}
