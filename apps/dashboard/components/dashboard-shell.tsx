"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import BrandMark from "./brand-mark";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";
import ImpersonationBanner from "./impersonation-banner";
import EmptyState from "./empty-state";
import { iconComponent } from "./zb-icon";
import { blockedPage, firstAllowedPage } from "@/lib/permissions";
import { navigation } from "@/lib/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password"];

// Customer-facing pages: a restaurant's website and ordering page, and the
// unsubscribe page from marketing emails. Checked by route segment, not by
// URL, because on name.zentrabite.com the browser shows "/" or "/order" while
// the route is /site/... or /store/...
// "/_not-found" is Next's segment for the 404 page (app/not-found.tsx). It
// picks its own look and must never show the CRM menu on a restaurant address.
const PUBLIC_SEGMENTS = new Set(["site", "store", "unsubscribe", "stripe-setup", "/_not-found"]);
// Logged-in pages shown without the CRM menu, like the print-ready counter QR page.
const BARE_SEGMENTS = new Set(["print"]);

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const segment    = useSelectedLayoutSegment();
  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const router     = useRouter();

  // A seller with no shop of their own only has the sales pages (/sell).
  // Anywhere else in the CRM, send them there.
  const { loading, isSeller, isSuperAdmin, businessId, role, business } = useBusiness();
  const sellerOnly = !loading && isSeller && !isSuperAdmin && !businessId;
  const isPublic   = isAuthPage || Boolean(segment && PUBLIC_SEGMENTS.has(segment));
  const sendToSell = sellerOnly && !isPublic && segment !== "sell";
  useEffect(() => { if (sendToSell) router.replace("/sell"); }, [sendToSell, router]);

  // A team member's role decides which pages they open, not just which ones
  // the sidebar shows. Typing the address of a hidden page shows a notice.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overrides = ((business?.settings as any)?.role_permissions ?? null) as Record<string, string[]> | null;
  const blocked = !loading && Boolean(businessId) && blockedPage(pathname, role, overrides, isSuperAdmin) !== null;
  const homeHref = blocked ? firstAllowedPage(role, overrides, isSuperAdmin) : null;
  const homePage = homeHref ? navigation.find(n => n.href === homeHref) ?? null : null;

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
  if (isPublic) return <>{children}</>;
  if (sendToSell) return null;
  if (segment && BARE_SEGMENTS.has(segment)) return <>{children}</>;

  // The sales pages: a plain header, no CRM menu.
  if (segment === "sell") {
    return (
      <div style={{ minHeight:"100vh" }}>
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"14px max(16px, env(safe-area-inset-right)) 14px max(16px, env(safe-area-inset-left))", borderBottom:"1px solid rgba(226,232,240,.08)" }}>
          <a href="/sell" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", color:"#F8FAFB", fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:16 }}>
            <BrandMark size={32} />ZentraBite sales
          </a>
          <div style={{ display:"flex", gap:8 }}>
            {(isSuperAdmin || businessId) && <a href="/dashboard" className="bg-btn" style={{ textDecoration:"none" }}>CRM</a>}
            <a href="/auth/logout" className="bg-btn" style={{ textDecoration:"none" }}>Log out</a>
          </div>
        </header>
        <main style={{ maxWidth:760, margin:"0 auto", padding:"24px 16px 64px" }}>{children}</main>
      </div>
    );
  }

  return (
    <>
      {/* First Tab on any page. Jumps past the 20 menu links. */}
      <a href="#zb-content" className="zb-skip">Skip to content</a>
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
        <main id="zb-content" tabIndex={-1} className="zb-content" style={{ flex:1, padding:"32px 40px" }}>
          <div style={{ maxWidth:1480, width:"100%" }} className="fd">
            {blocked ? (
              <div style={{ maxWidth:520, margin:"48px auto 0" }}>
                <EmptyState icon={iconComponent("settings")} title="Your role can't open this page" description={`You're on the team as ${role ?? "Staff"}. Ask the shop's owner if you need it.`} />
                {homePage && (
                  <div style={{ textAlign:"center", marginTop:16 }}>
                    <a href={homePage.href} className="bg-btn" style={{ textDecoration:"none", display:"inline-flex", minHeight:44, alignItems:"center" }}>Go to {homePage.label}</a>
                  </div>
                )}
              </div>
            ) : children}
          </div>
        </main>
      </div>
    </>
  );
}
