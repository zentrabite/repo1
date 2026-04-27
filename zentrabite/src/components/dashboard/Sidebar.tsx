"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C, font } from "@/lib/brand";
import Icon from "./Icon";

const NAV = [
  { href: "/dashboard",           label: "Dashboard",  icon: "dashboard"  as const },
  { href: "/dashboard/customers", label: "Customers",  icon: "customers"  as const },
  { href: "/dashboard/orders",    label: "Orders",     icon: "orders"     as const, badge: 3 },
  { href: "/dashboard/campaigns", label: "Campaigns",  icon: "campaigns"  as const },
  { href: "/dashboard/analytics", label: "Analytics",  icon: "analytics"  as const },
  { href: "/dashboard/menu",      label: "Menu",       icon: "menu"       as const },
  { href: "/dashboard/settings",  label: "Settings",   icon: "settings"   as const },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: C.darkNavy,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.green}, #007A54)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font.heading, fontWeight: 800, fontSize: 18, color: "#fff",
          }}>Z</div>
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 16, color: C.cloud, lineHeight: 1.1 }}>
              ZentraBite
            </div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Merchant Portal</div>
          </div>
        </div>
      </div>

      {/* Business badge */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          background: C.nearBlack, borderRadius: 8, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: C.orange + "33",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🍔</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.cloud, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Your Restaurant
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>Active · Free trial</div>
          </div>
          <Icon name="chevron" size={14} color={C.muted} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 8px", fontWeight: 600 }}>
          Main Menu
        </div>
        {NAV.map((item) => {
          // Active if exact match for /dashboard, or pathname starts with item.href for sub-routes
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? C.green + "18" : "transparent",
                border: `1px solid ${isActive ? C.green + "33" : "transparent"}`,
                color: isActive ? C.green : C.muted,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                fontFamily: font.body,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name={item.icon} size={18} color={isActive ? C.green : C.muted} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: C.orange, color: "#fff",
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* SMS Credits + sign out */}
      <div style={{ padding: "12px", borderTop: `1px solid ${C.border}` }}>
        <div style={{
          background: C.green + "15", borderRadius: 8, padding: "12px",
          marginBottom: 8, border: `1px solid ${C.green + "33"}`,
        }}>
          <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 6 }}>
            SMS Credits
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2 }}>
              <div style={{ width: "60%", height: "100%", background: C.green, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: font.mono }}>600 left</span>
          </div>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "9px 12px", borderRadius: 8,
          background: "transparent", border: "none",
          color: C.muted, cursor: "pointer", fontSize: 13,
          fontFamily: font.body,
        }}>
          <Icon name="logout" size={16} color={C.muted} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
