"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, PackageCheck, Monitor, UtensilsCrossed,
  Package, Bot, Truck, UserCog, Star, Users, Gift, RotateCcw, Zap, BarChart3,
  DollarSign, Calendar, Settings, type LucideIcon,
} from "lucide-react";
import { business } from "./data";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/demo/live",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/demo/live/orders",      label: "Orders",      icon: ShoppingBag },
  { href: "/demo/live/fulfillment", label: "Fulfillment", icon: PackageCheck },
  { href: "/demo/live/pos",         label: "POS",         icon: Monitor },
  { href: "/demo/live/menu",        label: "Menu",        icon: UtensilsCrossed },
  { href: "/demo/live/stock",       label: "Stock",       icon: Package },
  { href: "/demo/live/ai-calls",    label: "AI calls",    icon: Bot },
  { href: "/demo/live/delivery",    label: "Delivery",    icon: Truck },
  { href: "/demo/live/drivers",     label: "Drivers",     icon: UserCog },
  { href: "/demo/live/reviews",     label: "Reviews",     icon: Star },
  { href: "/demo/live/customers",   label: "Customers",   icon: Users },
  { href: "/demo/live/rewards",     label: "Rewards",     icon: Gift },
  { href: "/demo/live/winback",     label: "Winback",     icon: RotateCcw },
  { href: "/demo/live/automations", label: "Automations", icon: Zap },
  { href: "/demo/live/analytics",   label: "Analytics",   icon: BarChart3 },
  { href: "/demo/live/financials",  label: "Financials",  icon: DollarSign },
  { href: "/demo/live/rostering",   label: "Rostering",   icon: Calendar },
  { href: "/demo/live/settings",    label: "Settings",    icon: Settings },
];

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          DEMO MODE — All data is fake. Click around, nothing you do here is saved or sent.
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
          ← Back to site
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
        className="demo-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--mist-9)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--green)",
                color: "var(--navy)",
                fontFamily: "var(--font-outfit)",
                fontWeight: 800,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ZB
            </div>
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
                <Icon size={18} strokeWidth={1.75} color={color} style={{ flexShrink: 0, display: "block" }} />
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
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {business.today}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 19, color: "var(--cloud)", marginTop: 2 }}>
              Service is live · Store open until 10:30 pm
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
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
        <div style={{ padding: "28px" }}>{children}</div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @media (max-width: 820px) {
          .demo-sidebar { transform: translateX(-100%); transition: transform .25s; }
          .demo-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
