"use client";

// Brand spec: 16px border radius for modals, Navy surface, Inter body text

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}

const NAVY  = "#1C2D48";
const GREEN = "#00B67A";
const STEEL = "#6B7C93";
const CLOUD = "#F8FAFB";
const MIST  = "rgba(226,232,240,.09)";

export default function Modal({ open, onClose, title, wide, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.6)",
        backdropFilter: "blur(5px)",
      }} />

      {/* Modal panel — 16px radius, Navy surface */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: wide ? 700 : 480,
          maxHeight: "88vh",
          overflowY: "auto",
          background: `rgba(18,30,50,.97)`,
          border: `1px solid ${MIST}`,
          borderRadius: 16,   // brand spec: 16px for modals
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${MIST}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0,
          background: "rgba(18,30,50,.99)",
          zIndex: 1,
          borderRadius: "16px 16px 0 0",
        }}>
          <h3 style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600, fontSize: 16, color: CLOUD,
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "rgba(226,232,240,.07)",
              border: "none", color: STEEL,
              width: 30, height: 30, borderRadius: 8,
              cursor: "pointer", fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Body — Inter font */}
        <div style={{
          padding: "22px 24px",
          fontFamily: "var(--font-inter)",
          fontSize: 14, color: CLOUD,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
