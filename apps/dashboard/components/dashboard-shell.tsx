"use client";

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

  // Auth pages and customer pages — no sidebar/topbar
  if (isAuthPage || (segment && PUBLIC_SEGMENTS.has(segment))) return <>{children}</>;

  return (
    <>
      <DashboardSidebar />
      <div style={{ marginLeft:240, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <ImpersonationBanner />
        <DashboardTopbar />
        <main style={{ flex:1, padding:"32px 40px" }}>
          <div style={{ maxWidth:1480, width:"100%" }} className="fd">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
