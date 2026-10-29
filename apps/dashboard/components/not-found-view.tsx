"use client";

// Picks which 404 to show. See app/not-found.tsx.

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/brand-mark";
import PublicNotFound, { PUBLIC_NOT_FOUND_BG, publicLinkStyle } from "@/components/public-not-found";

/** "/site/<name>" or "/store/<name>" for a path under a public restaurant page. */
function publicHome(pathname: string): string | null {
  const m = /^\/(site|store)\/([a-z0-9-]{1,63})(?:\/|$)/.exec(pathname);
  return m ? `/${m[1]}/${m[2]}` : null;
}

export default function NotFoundView({ onRestaurantHost }: { onRestaurantHost: boolean }) {
  const pathname = usePathname() ?? "";

  // name.zentrabite.com: "/" is the restaurant's own home page.
  // The CRM host's /site/<name> and /store/<name> pages are public too.
  const home = onRestaurantHost ? "/" : publicHome(pathname);

  // The server only knows the host, so it gives the CRM's browser bar colour
  // to public paths on the CRM host. Match the light page instead.
  useEffect(() => {
    if (!home || onRestaurantHost) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", PUBLIC_NOT_FOUND_BG));
  }, [home, onRestaurantHost]);

  if (home) {
    return (
      <PublicNotFound title="Page not found">
        This page doesn&apos;t exist. Check the link, or go to the{" "}
        <a href={home} style={publicLinkStyle}>{home.startsWith("/store/") ? "ordering page" : "home page"}</a>.
      </PublicNotFound>
    );
  }

  // Same frame as the login page: a width-limited wrapper around a glass card.
  return (
    <main className="zb-404" style={{ minHeight: "100vh", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0F1F2D" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="gc" style={{ padding: "40px 28px", textAlign: "center" }}>
          <BrandMark size={48} style={{ margin: "0 auto 22px" }} />
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 12, color: "#00B67A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
            Error 404
          </div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 28, color: "#F8FAFB", margin: "0 0 10px", letterSpacing: "-.01em" }}>
            Page not found
          </h1>
          <p style={{ fontSize: 15, color: "#8B9DB5", lineHeight: 1.6, margin: "0 auto 28px", maxWidth: 360 }}>
            This page doesn&apos;t exist or has moved. Check the address, or head back to your dashboard.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="bp" style={{ textDecoration: "none" }}>Go to the dashboard</Link>
            <Link href="/login" className="bg-btn" style={{ padding: "11px 20px", fontSize: 14, color: "#C3CDD9", textDecoration: "none" }}>Log in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
