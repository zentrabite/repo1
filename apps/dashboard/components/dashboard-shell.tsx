"use client";

import { usePathname } from "next/navigation";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";
import ImpersonationBanner from "./impersonation-banner";

const AUTH_ROUTES = ["/login", "/signup", "/auth"];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r));

  // Auth pages — no sidebar/topbar
  if (isAuthPage) return <>{children}</>;

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
