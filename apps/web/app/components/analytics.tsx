"use client";

// Counts page views and the site's two actions ("Book a call" and the live
// demo) through lib/analytics.ts. Renders nothing. Off unless switched on
// in the environment, see lib/analytics.ts.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsOn, track } from "../../lib/analytics";

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (analyticsOn()) track("$pageview");
  }, [pathname]);

  useEffect(() => {
    if (!analyticsOn()) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (/^\/contact(\?|$)/.test(href)) track("book_a_call_clicked", { from: location.pathname });
      else if (/^\/demo(\/|$)/.test(href)) track("demo_opened", { from: location.pathname, demo: href.split("?")[0]! });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
