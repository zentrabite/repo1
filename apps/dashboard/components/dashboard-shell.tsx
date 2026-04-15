"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";
import { supabase } from "@/lib/supabase";

const AUTH_ROUTES = ["/login", "/signup", "/auth"];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r));

  const [checking, setChecking] = useState(!isAuthPage);

  useEffect(() => {
    if (isAuthPage) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace(`/login?redirect=${pathname}`);
      } else {
        setChecking(false);
      }
    });
  }, [pathname, isAuthPage, router]);

  // Auth pages — no sidebar/topbar
  if (isAuthPage) return <>{children}</>;

  // Still checking session — show nothing to avoid flash
  if (checking) return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(0,182,122,.2)", borderTopColor:"#00B67A", animation:"spin .8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <DashboardSidebar />
      <div style={{ marginLeft:240, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
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
