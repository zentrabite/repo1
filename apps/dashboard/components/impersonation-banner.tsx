"use client";

import { useBusiness, stopImpersonating } from "@/hooks/use-business";

export default function ImpersonationBanner() {
  const { impersonatingBusinessId, business, loading } = useBusiness();
  if (loading || !impersonatingBusinessId) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "10px 24px",
        background: "linear-gradient(90deg, rgba(255,107,53,0.95), rgba(255,71,87,0.95))",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        fontFamily: "var(--font-inter)",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    >
      <div>
        👁️ Viewing CRM as <b>{business?.name ?? "business"}</b>
        <span style={{ opacity: 0.85, marginLeft: 8, fontWeight: 500 }}>
          — all actions write to this tenant's data
        </span>
      </div>
      <button
        onClick={stopImpersonating}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "#fff",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Stop impersonating
      </button>
    </div>
  );
}
