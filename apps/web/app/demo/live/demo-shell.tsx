"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconComponent, type IconComponent } from "../../components/zb-icon";
import { business } from "./data";

const NAV: { href: string; label: string; icon: IconComponent }[] = [
  { href: "/demo/live",             label: "Dashboard",   icon: iconComponent("dashboard") },
  { href: "/demo/live/orders",      label: "Orders",      icon: iconComponent("orders") },
  { href: "/demo/live/fulfillment", label: "Fulfillment", icon: iconComponent("fulfillment") },
  { href: "/demo/live/pos",         label: "POS",         icon: iconComponent("pos") },
  { href: "/demo/live/menu",        label: "Menu",        icon: iconComponent("menu") },
  { href: "/demo/live/stock",       label: "Stock",       icon: iconComponent("stock") },
  { href: "/demo/live/ai-calls",    label: "AI calls",    icon: iconComponent("ai-calls") },
  { href: "/demo/live/delivery",    label: "Delivery",    icon: iconComponent("delivery") },
  { href: "/demo/live/drivers",     label: "Drivers",     icon: iconComponent("drivers") },
  { href: "/demo/live/reviews",     label: "Reviews",     icon: iconComponent("reviews") },
  { href: "/demo/live/customers",   label: "Customers",   icon: iconComponent("customers") },
  { href: "/demo/live/rewards",     label: "Rewards",     icon: iconComponent("rewards") },
  { href: "/demo/live/winback",        label: "Win-Back",      icon: iconComponent("return") },
  { href: "/demo/live/automations", label: "Automations", icon: iconComponent("automations") },
  { href: "/demo/live/analytics",   label: "Analytics",   icon: iconComponent("analytics") },
  { href: "/demo/live/financials",  label: "Financials",  icon: iconComponent("financials") },
  { href: "/demo/live/rostering",   label: "Rostering",   icon: iconComponent("rostering") },
  { href: "/demo/live/settings",    label: "Settings",    icon: iconComponent("settings") },
];

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Phone menu. The sidebar slides in from the left under 820px wide.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [menuOpen]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--near-black)" }}>
      {/* Demo mode banner */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "linear-gradient(90deg, rgba(255,107,53,0.94), rgba(255,150,75,0.94))",
          color: "white",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-inter)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "white",
              animation: "pulse 1.4s ease-in-out infinite",
            }}
            aria-hidden
          />
          <span className="demo-banner-long">Demo mode. All data is made up. Click around, nothing you do here is saved or sent.</span>
          <span className="demo-banner-short">Demo. Nothing here is saved.</span>
        </div>
        <Link
          href="/"
          style={{
            color: "white",
            fontWeight: 600,
            fontSize: 12.5,
            padding: "4px 12px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.18)",
            textDecoration: "none",
          }}
        >
          ← <span className="demo-banner-long">Back to site</span><span className="demo-banner-short">Site</span>
        </Link>
      </div>

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 40,
          bottom: 0,
          left: 0,
          width: 232,
          background: "rgba(15,25,42,0.94)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid var(--mist-9)",
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
        }}
        className={`demo-sidebar${menuOpen ? " open" : ""}`}
        id="demo-sidebar"
        aria-label="CRM menu"
      >
        {/* Logo */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--mist-9)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/zentrabite-icon.svg" alt="" width={36} height={36} style={{ display: "block", flexShrink: 0 }} />
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15 }}>
              <span style={{ color: "var(--cloud)" }}>Zentra</span>
              <span style={{ color: "var(--green)" }}>Bite</span>
            </div>
          </div>
        </div>

        {/* Business block */}
        <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--mist-9)" }}>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 14, color: "var(--cloud)" }}>
            {business.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>{business.type}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/demo/live" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const color = active ? "var(--green)" : "var(--steel)";
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  marginBottom: 2,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color,
                  background: active ? "rgba(0,182,122,0.11)" : "transparent",
                  borderLeft: `2px solid ${active ? "var(--green)" : "transparent"}`,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={18} strokeWidth={1.75} style={{ color, flexShrink: 0, display: "block" }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer CTA */}
        <div style={{ padding: 14, borderTop: "1px solid var(--mist-9)" }}>
          <Link
            href="/#features"
            style={{
              display: "block",
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(0,182,122,0.10)",
              border: "1px solid rgba(0,182,122,0.28)",
              color: "var(--green)",
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Start your 1-month free trial →
          </Link>
        </div>
      </aside>

      {/* Tap outside the phone menu to close it */}
      {menuOpen && <div className="demo-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />}

      {/* Main content */}
      <main
        style={{
          marginLeft: 232,
          paddingTop: 40,
          minHeight: "100vh",
        }}
        className="demo-main"
      >
        {/* Topbar */}
        <div
          style={{
            position: "sticky",
            top: 40,
            zIndex: 30,
            background: "rgba(15,25,42,0.78)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid var(--mist-9)",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
          className="demo-topbar"
        >
          <button
            type="button"
            className="demo-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="demo-sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {business.today}
            </div>
            <div className="demo-topbar-title" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 19, color: "var(--cloud)", marginTop: 2 }}>
              Service is live · Store open until 10:30 pm
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="demo-live-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(0,182,122,0.12)",
                border: "1px solid rgba(0,182,122,0.3)",
                color: "var(--green)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                style={{ width: 7, height: 7, borderRadius: 999, background: "var(--green)", boxShadow: "0 0 8px var(--green)" }}
                aria-hidden
              />
              7 live orders
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "var(--navy-40)",
                border: "1px solid var(--mist-9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--cloud)",
              }}
              aria-label="You"
            >
              LP
            </div>
          </div>
        </div>

        {/* Routed content */}
        <div style={{ padding: "28px" }} className="demo-content">{children}</div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .demo-banner-short, .demo-menu-btn { display: none; }
        .demo-menu-btn {
          align-items: center; justify-content: center; flex-shrink: 0;
          width: 40px; height: 40px; border-radius: 10px;
          border: 1px solid var(--mist-12); background: var(--navy-40); color: var(--cloud); cursor: pointer;
        }
        .demo-backdrop { display: none; }

        /* Phones and small tablets. Desktop is untouched. */
        @media (max-width: 820px) {
          .demo-banner-long { display: none; }
          .demo-banner-short { display: inline; }
          .demo-menu-btn { display: inline-flex; }
          .demo-sidebar {
            transform: translateX(-100%);
            transition: transform .25s ease;
            z-index: 70 !important;
            width: min(280px, 82vw) !important;
            background: rgba(15,25,42,0.98) !important;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.06);
          }
          .demo-sidebar.open { transform: none; }
          .demo-backdrop {
            display: block; position: fixed; inset: 40px 0 0 0; z-index: 65;
            background: rgba(4,10,18,0.6);
          }
          .demo-main { margin-left: 0 !important; }
          .demo-topbar { padding: 10px 16px !important; top: 40px; }
          .demo-topbar-title { font-size: 15px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .demo-live-pill { display: none !important; }
          .demo-content { padding: 16px !important; }

          /* Let grid cells shrink instead of pushing the page wider */
          .demo-content [style*="display:grid"] > * { min-width: 0; }

          /* Rows of stat cards: two across */
          .demo-content [style*="grid-template-columns:repeat(3"],
          .demo-content [style*="grid-template-columns:repeat(4"],
          .demo-content [style*="grid-template-columns:repeat(5"],
          .demo-content [style*="grid-template-columns:repeat(6"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          /* Side by side panels: one on top of the other */
          .demo-content [style*="grid-template-columns:1fr 1fr;"],
          .demo-content [style$="grid-template-columns:1fr 1fr"],
          .demo-content [style*="grid-template-columns:1.2fr 1fr;"],
          .demo-content [style$="grid-template-columns:1.2fr 1fr"],
          .demo-content [style*="grid-template-columns:1.3fr 1fr;"],
          .demo-content [style*="grid-template-columns:1.45fr 1fr;"],
          .demo-content [style*="grid-template-columns:1.5fr 1fr;"],
          .demo-content [style$="grid-template-columns:1.5fr 1fr"],
          .demo-content [style*="grid-template-columns:1.5fr 1fr 1fr"],
          .demo-content [style*="grid-template-columns:minmax(0, 1fr) 380px"],
          .demo-content [style*="grid-template-columns:minmax(0, 360px) minmax(0, 1fr)"],
          .demo-content [style*="grid-template-columns:minmax(0, 1.1fr) 1fr"],
          .demo-content [style*="grid-template-columns:minmax(0, 1.1fr) minmax(0, 2.2fr) auto"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          /* Wide table rows keep their columns and the list scrolls sideways */
          .demo-content :has(> [style*="110px 110px"]),
          .demo-content :has(> [style*="120px 100px"]),
          .demo-content :has(> [style*="100px 90px 90px"]) {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .demo-content [style*="110px 110px"] { min-width: 780px; }
          .demo-content [style*="1.5fr 1fr 90px 110px"] { min-width: 840px; }
          .demo-content [style*="90px 1.3fr 1.4fr"] { min-width: 880px; }
          .demo-content [style*="1.4fr 1.6fr 80px"] { min-width: 1000px; }
          .demo-content [style*="1fr 110px 110px 90px"] { min-width: 520px; }
          .demo-content [style*="120px 100px"] { min-width: 680px; }
          .demo-content [style*="100px 90px 90px"] { min-width: 540px; }

          /* Short list rows (orders, calls, rewards): drop the middle column */
          .demo-content [style*="60px 1fr 90px 110px"],
          .demo-content [style*="60px 1fr 100px 110px"],
          .demo-content [style*="32px 1fr 90px 100px"] {
            grid-template-columns: auto minmax(0, 1fr) auto !important;
          }
          .demo-content [style*="60px 1fr 90px 110px"] > :nth-child(3),
          .demo-content [style*="60px 1fr 100px 110px"] > :nth-child(3),
          .demo-content [style*="32px 1fr 90px 100px"] > :nth-child(3) {
            display: none;
          }

          /* Automation rule cards: icon and text on top, the rest underneath */
          .demo-content [style*="auto 1fr 180px 130px 100px"] {
            grid-template-columns: 40px minmax(0, 1fr) !important;
            row-gap: 10px !important;
          }
          .demo-content [style*="auto 1fr 180px 130px 100px"] > :nth-child(n+3) {
            grid-column: 2;
            justify-self: start;
          }
        }
      `}</style>
    </div>
  );
}
