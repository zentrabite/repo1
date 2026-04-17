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

  const [checking, setChecking] = useState(() => {
    if (isAuthPage) return false;
    if (typeof window === "undefined") return true;
    const hasToken = Object.keys(window.localStorage).some(
      k => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    return !hasToken;
  });

  useEffect(() => {
    if (isAuthPage) return;
    const hasToken = Object.keys(window.localStorage).some(
      k => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (hasToken) {
      setChecking(false);
    } else {
      router.replace(`/login?redirect=${pathname}`);
    }
  }, [isAuthPage, pathname, router]);

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
