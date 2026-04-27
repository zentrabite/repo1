"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { C, font } from "@/lib/brand";
import Icon from "./Icon";

function getPageLabel(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export default function TopBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      height: 60,
      flexShrink: 0,
      background: C.darkNavy,
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 16,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, fontSize: 13, fontFamily: font.body }}>
        <span style={{ color: C.muted }}>Your Restaurant</span>
        <span style={{ color: C.border, margin: "0 8px" }}>/</span>
        <span style={{ color: C.cloud, fontWeight: 600, fontFamily: font.heading }}>
          {getPageLabel(pathname)}
        </span>
      </div>

      {/* Notification bell */}
      <button style={{
        position: "relative",
        background: "transparent",
        border: "none",
        color: C.muted,
        cursor: "pointer",
        padding: 6,
        borderRadius: 8,
      }}>
        <Icon name="bell" size={20} color={C.muted} />
        <span style={{
          position: "absolute", top: 4, right: 4,
          width: 8, height: 8, borderRadius: "50%",
          background: C.orange,
          border: `2px solid ${C.darkNavy}`,
        }} />
      </button>

      <div style={{ width: 1, height: 24, background: C.border }} />

      {/* User menu */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 8,
            background: menuOpen ? C.border : "transparent",
            border: `1px solid ${menuOpen ? C.border : "transparent"}`,
            cursor: "pointer",
            fontFamily: font.body,
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.green}, #007A54)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>L</div>
          <div style={{ textAlign: "left", lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.cloud }}>Liam</div>
            <div style={{ fontSize: 11, color: C.muted }}>Owner</div>
          </div>
          <Icon name="chevron" size={14} color={C.muted} />
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            background: C.darkNavy,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            minWidth: 180,
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            fontFamily: font.body,
          }}>
            {["Account Settings", "Billing & Plan", "Help & Docs"].map((item, i) => (
              <div
                key={item}
                style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: C.muted,
                  cursor: "pointer",
                  borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
                }}
              >
                {item}
              </div>
            ))}
            <div style={{
              padding: "10px 14px", fontSize: 13, color: "#FF4757",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="logout" size={14} color="#FF4757" />
              Sign out
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
