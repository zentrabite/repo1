"use client";

// Super Admin's switch for alcohol on a shop's ordering page and website
// (migration 042, lib/alcohol.ts). Off by default. Staff turn it on only
// after seeing a liquor licence that covers online and delivery sales.

import { useState } from "react";
import { alcoholAllowed, alcoholLicence } from "@/lib/alcohol";

const C = { g: "#00AD82", o: "#FF6B35", st: "#8B9DB5", cl: "#F8FAFB" };

type Props = {
  shop: { id: string; name: string; settings?: Record<string, unknown> | null };
  onChange: (settings: Record<string, unknown>) => void;
  toast: (text: string, kind?: "success" | "warn" | "error") => void;
};

export default function AlcoholCard({ shop, onChange, toast }: Props) {
  const [licence, setLicence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const on = alcoholAllowed(shop.settings);
  const setting = (shop.settings?.alcohol ?? null) as { licence?: string; by?: string; at?: string } | null;

  async function save(method: "POST" | "DELETE") {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${shop.id}/alcohol`, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ licence: licence.trim() }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? "Couldn't save. Try again."); return; }
      const next = { ...(shop.settings ?? {}) };
      if (data.alcohol) next.alcohol = data.alcohol; else delete next.alcohol;
      onChange(next);
      setLicence("");
      toast(method === "POST" ? `Alcohol is on for ${shop.name}` : `Alcohol is off for ${shop.name}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const button = (color: string): React.CSSProperties => ({
    padding: "10px 16px", minHeight: 44, borderRadius: 8, background: "transparent", color, border: `1px solid ${color}`,
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-inter)",
  });

  return (
    <div className="gc" style={{ padding: 22 }}>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: C.cl, marginBottom: 6 }}>Alcohol online</div>
      {on ? (
        <>
          <div style={{ color: C.cl, fontSize: 13, lineHeight: 1.55, fontFamily: "var(--font-inter)", marginBottom: 14 }}>
            <b style={{ color: C.g }}>On.</b> Licence {alcoholLicence(shop.settings)}
            {setting?.by ? `, checked by ${setting.by}` : ""}{setting?.at ? ` on ${new Date(setting.at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
            <div style={{ color: C.st, marginTop: 4 }}>Items marked as alcohol show on the ordering page with 18+, and customers tick that they&apos;re 18 or over.</div>
          </div>
          <button onClick={() => save("DELETE")} disabled={busy} style={button(C.o)}>{busy ? "Saving…" : "Turn alcohol off"}</button>
        </>
      ) : (
        <>
          <div style={{ color: C.st, fontSize: 13, lineHeight: 1.55, fontFamily: "var(--font-inter)", marginBottom: 12 }}>
            Off. Items marked as alcohol stay on the POS and are hidden from the ordering page and website. Turn it on only after you&apos;ve seen a liquor licence that covers online and delivery sales.
          </div>
          <label htmlFor={`licence-${shop.id}`}>Liquor licence number</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input id={`licence-${shop.id}`} value={licence} onChange={e => setLicence(e.target.value)} autoComplete="off" style={{ flex: "1 1 180px", fontSize: 16 }} />
            <button onClick={() => save("POST")} disabled={busy || !licence.trim()} style={{ ...button(C.g), opacity: busy || !licence.trim() ? 0.5 : 1 }}>
              {busy ? "Saving…" : "Turn alcohol on"}
            </button>
          </div>
        </>
      )}
      {error && <div role="alert" style={{ fontSize: 12.5, color: C.o, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
