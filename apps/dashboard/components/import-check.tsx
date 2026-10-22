// "Check this" note for values the website import filled in. Shown under a
// field so the rep confirms it with the owner before it goes live.

import Badge from "@/components/badge";

export default function ImportCheck({ note, imported }: { note?: string | null; imported?: boolean }) {
  if (!note && !imported) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6, fontFamily: "var(--font-inter)" }}>
      {note ? <Badge type="Check this">Check this</Badge> : <Badge type="Imported">From their site</Badge>}
      {note && <span style={{ fontSize: 12, color: "#FFC14B", lineHeight: 1.45 }}>{note}</span>}
    </div>
  );
}
