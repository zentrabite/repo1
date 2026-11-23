"use client";

// ─── Text cost ──────────────────────────────────────────────────────────────
// Under a text box, how many characters and texts a message takes once it's
// written the way it goes out (lib/sms-text.ts). Says when an emoji or other
// character makes it a unicode text, which fits 70 a part instead of 160.

import { costLine, smsCost } from "@/lib/sms-text";

export default function TextCost({ text }: { text: string }) {
  const c = smsCost(text);
  if (!c.length) return null;
  const many = c.parts > 1;
  return (
    <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
      <div style={{ color: many ? "#FFC14B" : "#8B9DB5" }}>{costLine(c)}</div>
      {c.encoding === "unicode" && (
        <div style={{ color: "#FF6B35", marginTop: 2 }}>
          {`${c.unicode.map(ch => `"${ch}"`).join(" ")} ${c.unicode.length === 1 ? "isn't a plain character" : "aren't plain characters"}, so each text fits 70 characters instead of 160. Take ${c.unicode.length === 1 ? "it" : "them"} out to send it as plain text.`}
        </div>
      )}
    </div>
  );
}
