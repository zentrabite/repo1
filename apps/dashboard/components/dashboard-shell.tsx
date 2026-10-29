"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";
import ImpersonationBanner from "./impersonation-banner";

const AUTH_ROUTES = ["/login", "/signup", "/auth"];

// Customer-facing pages: a restaurant's website and ordering page, and the
// unsubscribe page from marketing emails. Checked by route segment, not by
// URL, because on name.zentrabite.com the browser shows "/" or "/order" while
// the route is /site/... or /store/...
// "/_not-found" is Next's segment for the 404 page (app/not-found.tsx). It
// picks its own look and must never show the CRM menu on a restaurant address.
const PUBLIC_SEGMENTS = new Set(["site", "store", "unsubscribe", "/_not-found"]);

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const segment    = useSelectedLayoutSegment();
  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r));

  // Phone menu (under 820px wide the sidebar slides in from the left). It is
  // open for the page it was opened on, so going to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef    = useRef<HTMLElement>(null);
  const wasOpen       = useRef(false);

  const closeMenu = () => setOpenOn(null);

  useEffect(() => {
    if (menuOpen) {
      wasOpen.current = true;
      // Focus goes into the menu, on its close button
      sidebarRef.current?.querySelector<HTMLElement>("[data-menu-close]")?.focus();
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenOn(null); };
      window.addEventListener("keydown", onKey);
      // The page doesn't scroll behind the open menu
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    }
    if (wasOpen.current) {
      // Focus comes back out to the button that opened the menu
      wasOpen.current = false;
      const active = document.activeElement;
      if (!active || active === document.body || sidebarRef.current?.contains(active)) {
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    }
  }, [menuOpen]);

  // Widening the window past the phone layout closes the menu, so the page
  // can't be left inert behind a sidebar that no longer slides.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 821px)");
    const onChange = () => { if (wide.matches) setOpenOn(null); };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  // Auth pages and customer pages — no sidebar/topbar
  if (isAuthPage || (segment && PUBLIC_SEGMENTS.has(segment))) return <>{children}</>;

  return (
    <>
      <DashboardSidebar ref={sidebarRef} open={menuOpen} onClose={closeMenu} />
      {/* Tap outside the phone menu to close it */}
      <div className={`zb-backdrop${menuOpen ? " open" : ""}`} onClick={closeMenu} aria-hidden />
      <div className="zb-main" inert={menuOpen} style={{ marginLeft:240, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <ImpersonationBanner />
        <DashboardTopbar
          menuOpen={menuOpen}
          onMenu={() => setOpenOn(menuOpen ? null : pathname)}
          menuButtonRef={menuButtonRef}
        />
        <main className="zb-content" style={{ flex:1, padding:"32px 40px" }}>
          <div style={{ maxWidth:1480, width:"100%" }} className="fd">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
