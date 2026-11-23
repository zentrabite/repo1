"use client";

// ─── Super Admin → Sending ───────────────────────────────────────────────────
// The connection lights (lib/health.ts), the kill switches, marketing sends
// paused by the stop rules (lib/stop-rules.ts) with why and a Resume button,
// and who gets told when something breaks (lib/alerts.ts).
// Uses /api/admin/sending. Only the "every text" switch stops order texts.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";

type Item = { id: string; shop: string; everyShop: boolean; channel: "sms" | "email"; label: string; why: string; pausedAt: string; pausedBy: string; resumedAt: string | null };
type Light = { key: string; name: string; status: "ok" | "warn" | "down" | "off"; detail: string };
type Data = {
  open: Item[]; resumed: Item[]; lights: Light[]; alertsTo: string | null;
  switches: { marketingTexts: string | null; everyText: string | null; marketingEmails: string | null };
};

const C = { g: "#00AD82", st: "#8B9DB5", cl: "#F8FAFB", r: "#FF4757", y: "#FFC14B", mist: "rgba(226,232,240,.06)" };

const LIGHT: Record<Light["status"], { color: string; word: string }> = {
  ok:   { color: C.g,       word: "Working" },
  warn: { color: C.y,       word: "Limited" },
  down: { color: C.r,       word: "Down" },
  off:  { color: "#8B9DB5", word: "Not set up" },
};

const SWITCHES: { key: keyof Data["switches"]; channel: "sms" | "email"; scope: "marketing" | "all"; name: string; does: string }[] = [
  { key: "marketingTexts",  channel: "sms",   scope: "marketing", name: "Marketing texts",  does: "Stops every shop's win-back and offer texts. Order texts still go." },
  { key: "everyText",       channel: "sms",   scope: "all",       name: "Every text",       does: "Stops every text from every shop, order texts and the owners' order alerts too. For when the Twilio account itself is in trouble." },
  { key: "marketingEmails", channel: "email", scope: "marketing", name: "Marketing emails", does: "Stops every shop's win-back and offer emails. Receipts and login emails still go." },
];

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Adelaide", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function SendingPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useBusiness();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // A switch waiting for its second tap, so one tap can't stop every shop by accident.
  const [arming, setArming] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    let cancelled = false;
    fetch("/api/admin/sending")
      .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setError(body.error ?? "Couldn't load the pauses"); return; }
        setError(null);
        setData(body);
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the server"); });
    return () => { cancelled = true; };
  }, [loading, isSuperAdmin, router, tick]);

  async function post(key: string, payload: object) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/sending", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      setError(res.ok ? null : body.error ?? "That didn't work. Try again.");
      setTick(t => t + 1);
    } finally {
      setBusy(null);
      setArming(null);
    }
  }
  const resume = (item: Item) => post(item.id, { action: "resume", id: item.id });

  if (loading || !isSuperAdmin) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading…</div>;

  const open = data?.open ?? [];
  const resumed = data?.resumed ?? [];
  const lights = data?.lights ?? [];

  return (
    <div style={{ maxWidth: 980 }}>
      <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: "8px 0", minHeight: 44 }}>
        ← Back to Super Admin
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: "0 0 4px" }}>Sending</h2>
          <p style={{ color: C.st, fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
            {`A shop's marketing texts or emails pause on their own when, over the last 30 days, more than 2% didn't arrive, more than 0.1% of emails were marked as spam, or more than 1% of texts got a STOP reply. Every shop shares one Twilio and one Resend account, so this protects them all. Receipts and order messages still go. The kill switches stop sends for every shop at once.`}
          </p>
        </div>
        <button className="bg-btn" onClick={() => setTick(t => t + 1)}>Refresh</button>
      </div>

      {error && <p role="alert" style={{ color: C.r, fontSize: 13 }}>{error}</p>}

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Connections</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
        {data === null && !error ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Checking…</p>
        ) : lights.map((l, i) => (
          <div key={l.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 5, background: LIGHT[l.status].color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.cl, fontSize: 13, fontWeight: 600 }}>{l.name} <span style={{ color: LIGHT[l.status].color, fontWeight: 600 }}>{LIGHT[l.status].word}</span></div>
              <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{l.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Kill switches</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
        {SWITCHES.map((s, i) => {
          const onId = data?.switches?.[s.key] ?? null;
          // "Marketing texts" also reads as on while "every text" is on, since that stops them too.
          const coveredBy = s.key === "marketingTexts" && !onId && data?.switches?.everyText ? data.switches.everyText : null;
          const on = Boolean(onId || coveredBy);
          return (
            <div key={s.key} style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "14px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                <div style={{ color: C.cl, fontWeight: 600, fontSize: 14 }}>{s.name} <span style={{ color: on ? C.r : C.g, fontSize: 12 }}>{on ? "Stopped for every shop" : "Going"}</span></div>
                <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{s.does}</div>
              </div>
              {onId ? (
                <button className="bg-btn" onClick={() => post(s.key, { action: "resume", id: onId })} disabled={busy === s.key} style={{ minHeight: 44 }}>
                  {busy === s.key ? "Turning off…" : "Turn off"}
                </button>
              ) : coveredBy ? (
                <span style={{ color: C.st, fontSize: 12 }}>{"Stopped by \"Every text\""}</span>
              ) : arming === s.key ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="bg-btn" onClick={() => setArming(null)} style={{ minHeight: 44 }}>Cancel</button>
                  <button className="bg-btn" onClick={() => post(s.key, { action: "stop", channel: s.channel, scope: s.scope })} disabled={busy === s.key} style={{ minHeight: 44, color: C.r, borderColor: "rgba(255,71,87,.4)" }}>
                    {busy === s.key ? "Stopping…" : `Yes, stop ${s.name.toLowerCase()}`}
                  </button>
                </div>
              ) : (
                <button className="bg-btn" onClick={() => setArming(s.key)} style={{ minHeight: 44 }}>Stop for every shop</button>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Paused now</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
        {data === null && !error ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Loading…</p>
        ) : open.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Nothing is paused. Every shop can send.</p>
        ) : open.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "14px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ color: C.cl, fontWeight: 600, fontSize: 14 }}>{p.shop}</div>
              <div style={{ color: C.y, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{`${p.label} paused`}</div>
              <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{`${p.why} Since ${when(p.pausedAt)}, by ${p.pausedBy}.`}</div>
            </div>
            <button className="bg-btn" onClick={() => resume(p)} disabled={busy === p.id} style={{ minHeight: 44 }}>
              {busy === p.id ? "Resuming…" : p.everyShop ? "Turn off" : "Resume"}
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Resumed lately</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
        {resumed.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>None yet.</p>
        ) : resumed.map((p, i) => (
          <div key={p.id} style={{ padding: "12px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <div style={{ color: C.cl, fontSize: 13, fontWeight: 600 }}>{`${p.shop}, ${p.label.toLowerCase()}`}</div>
            <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{`${p.why} Paused ${when(p.pausedAt)}, resumed ${p.resumedAt ? when(p.resumedAt) : ""}.`}</div>
          </div>
        ))}
      </div>
      <p style={{ color: C.st, fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        {`Before resuming, check the shop's list or wording with them. After a resume only new sends count, so the shop won't pause again on the old ones.`}
      </p>

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "22px 0 10px" }}>Who gets told</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
        {[
          ["A stop rule pauses a shop", "The team by email, and the owner on their Win-Back page."],
          ["A kill switch goes on or off", "The team by email."],
          ["A connection is down", "The team by email, from the daily run (5:30pm Adelaide time in summer, 4:30pm in winter)."],
          ["A refund fails", "The owner, on the order (Refund failed, with a note)."],
        ].map(([what, who], i) => (
          <div key={what} style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "12px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <div style={{ flex: "1 1 220px", color: C.cl, fontSize: 13 }}>{what}</div>
            <div style={{ flex: "2 1 280px", color: C.st, fontSize: 12, lineHeight: 1.5 }}>{who}</div>
          </div>
        ))}
      </div>
      <p style={{ color: data?.alertsTo ? C.st : C.y, fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        {data?.alertsTo
          ? `Team emails go to ${data.alertsTo} (ALERT_EMAIL), once Resend's domain is verified.`
          : "Nobody gets team emails yet. Set ALERT_EMAIL in Vercel, and they start once Resend's domain is verified. Until then, check this page."}
      </p>
    </div>
  );
}
