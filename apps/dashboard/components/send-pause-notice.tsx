"use client";

// ─── Send pause notice ──────────────────────────────────────────────────────
// Tells an owner their marketing texts or emails are paused by a stop rule
// (lib/stop-rules.ts), why, and that order messages still go. Shows nothing
// when nothing is paused. Reads /api/sending.

import { useEffect, useState } from "react";

type Pause = { channel: "sms" | "email"; label: string; everyShop: boolean; allTexts?: boolean; reason: string; since: string };

export default function SendPauseNotice() {
  const [pauses, setPauses] = useState<Pause[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sending")
      .then(r => (r.ok ? r.json() : { pauses: [] }))
      .then(body => { if (!cancelled) setPauses(Array.isArray(body.pauses) ? body.pauses : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!pauses.length) return null;

  return (
    <div role="status" style={{ background: "rgba(255,193,75,.08)", border: "1px solid rgba(255,193,75,.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      {pauses.map(p => (
        <div key={`${p.channel}-${p.since}`} style={{ fontSize: 13, lineHeight: 1.55, color: "#F8FAFB" }}>
          <b style={{ color: "#FFC14B" }}>{p.label} are paused.</b> {p.reason}
        </div>
      ))}
      <div style={{ fontSize: 12, color: "#6B7C93", lineHeight: 1.55 }}>
        {pauses.some(p => p.allTexts)
          ? "Nothing is sent until the ZentraBite team turns them back on. That includes texts about orders, so call customers if you need to. Receipt emails still go."
          : "Nothing is sent until the ZentraBite team has looked at it and turned them back on. Receipts and texts about orders still go."}
      </div>
    </div>
  );
}
