"use client";

// Super Admin's Suspend and Delete for one shop (migration 041,
// lib/shop-status.ts). Suspend can be undone. Delete is for empty test shops
// only, and the server checks the same rules again.

import { useState } from "react";
import Modal from "@/components/modal";
import { subscriptionState } from "@/lib/subscription";

const C = { g: "#00AD82", o: "#FF6B35", r: "#FF6B6B", st: "#8B9DB5", cl: "#F8FAFB" };
const REASON_MAX = 300;

export type DangerShop = {
  id: string;
  name: string;
  suspended_at: string | null;
  suspended_reason: string | null;
  orderCount: number;
  customerCount: number;
  settings?: Record<string, unknown> | null;
};

type Props = {
  shop: DangerShop;
  /** Called with the shop's new state, or "deleted". */
  onChange: (next: Pick<DangerShop, "suspended_at" | "suspended_reason"> | "deleted") => void;
  toast: (text: string, kind?: "success" | "warn" | "error") => void;
};

/** Why Delete can't be used yet, or null when it can. Pure, for the page. */
export function deleteBlocker(shop: DangerShop): string | null {
  if (!shop.suspended_at) return "Suspend the shop first.";
  if (shop.orderCount > 0 || shop.customerCount > 0) return "It has orders or customers, so it stays. Leave it suspended.";
  const sub = subscriptionState(shop.settings?.subscription_status);
  if (sub !== "none" && sub !== "cancelled") return "It has a ZentraBite subscription. Cancel it in Stripe first.";
  return null;
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

async function call(url: string, method: "POST" | "DELETE", body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data?.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
}

export default function DangerZone({ shop, onChange, toast }: Props) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [reason, setReason]           = useState("");
  const [typed, setTyped]             = useState("");
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState("");

  const blocker = deleteBlocker(shop);
  const nameMatches = typed.trim() === shop.name.trim();

  function close() {
    setSuspendOpen(false); setDeleteOpen(false);
    setReason(""); setTyped(""); setError("");
  }

  async function suspend() {
    setBusy(true); setError("");
    const out = await call(`/api/admin/businesses/${shop.id}/suspend`, "POST", { reason: reason.trim() });
    setBusy(false);
    if (!out.ok) { setError(out.error ?? ""); return; }
    onChange({ suspended_at: new Date().toISOString(), suspended_reason: reason.trim() });
    toast(`${shop.name} is suspended`, "warn");
    close();
  }

  async function resume() {
    setBusy(true);
    const out = await call(`/api/admin/businesses/${shop.id}/suspend`, "DELETE");
    setBusy(false);
    if (!out.ok) { toast(out.error ?? "Couldn't undo it", "error"); return; }
    onChange({ suspended_at: null, suspended_reason: null });
    toast(`${shop.name} is back on`);
  }

  async function remove() {
    setBusy(true); setError("");
    const out = await call(`/api/admin/businesses/${shop.id}`, "DELETE", { name: typed.trim() });
    setBusy(false);
    if (!out.ok) { setError(out.error ?? ""); return; }
    toast(`${shop.name} is deleted`);
    close();
    onChange("deleted");
  }

  const outline = (color: string): React.CSSProperties => ({
    padding: "10px 16px", minHeight: 44, borderRadius: 8, background: "transparent", color, border: `1px solid ${color}`,
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-inter)",
  });

  // The dialogs sit outside the card: a glass card's blur would hold them
  // inside it instead of over the page.
  return (
    <>
      <div className="gc" style={{ padding: 22, border: "1px solid rgba(255,107,53,0.3)", background: "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(28,45,72,0.55))" }}>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: C.o, marginBottom: 6 }}>
          Danger zone
        </div>

        {shop.suspended_at ? (
          <div style={{ color: C.cl, fontSize: 13, marginBottom: 14, fontFamily: "var(--font-inter)", lineHeight: 1.55 }}>
            <b style={{ color: C.o }}>Suspended</b> since {when(shop.suspended_at)}.
            {shop.suspended_reason && <> Reason: <span className="zb-break">{shop.suspended_reason}</span></>}
            <div style={{ color: C.st, marginTop: 4 }}>
              Its logins see a paused screen, its ordering page and website are off, and it sends no texts. You can still open its CRM.
            </div>
          </div>
        ) : (
          <div style={{ color: C.st, fontSize: 13, marginBottom: 14, fontFamily: "var(--font-inter)", lineHeight: 1.55 }}>
            Suspend turns off the shop&apos;s logins, ordering page, website and texts. Nothing is deleted, and you can undo it.
            Delete is for empty test shops only. It can&apos;t be undone.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {shop.suspended_at ? (
            <button onClick={resume} disabled={busy} style={outline(C.g)}>{busy ? "Working…" : "Undo suspension"}</button>
          ) : (
            <button onClick={() => setSuspendOpen(true)} style={outline(C.o)}>Suspend shop</button>
          )}
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={Boolean(blocker)}
            aria-describedby={blocker ? `del-why-${shop.id}` : undefined}
            style={{ ...outline(C.r), opacity: blocker ? 0.45 : 1, cursor: blocker ? "not-allowed" : "pointer" }}
          >
            Delete shop
          </button>
        </div>
        {blocker && (
          <div id={`del-why-${shop.id}`} style={{ color: C.st, fontSize: 12, marginTop: 8, fontFamily: "var(--font-inter)" }}>
            Delete: {blocker}
          </div>
        )}
      </div>

        <Modal open={suspendOpen} onClose={close} title={`Suspend ${shop.name}`}>
          <div style={{ fontSize: 13, color: C.st, marginBottom: 12, lineHeight: 1.55 }}>
            Its logins will see a paused screen that says to email hello@zentrabite.com. The ordering page and website go offline, and texts stop. Payments already made still come through. You can undo this.
          </div>
          <label htmlFor="suspend-reason">Reason, for the team</label>
          <textarea
            id="suspend-reason"
            value={reason}
            onChange={e => setReason(e.target.value.slice(0, REASON_MAX))}
            rows={3}
            placeholder="For example, test shop, or unpaid since 1 Dec"
            style={{ width: "100%", fontSize: 16 }}
          />
          <div style={{ fontSize: 11, color: C.st, marginTop: 4 }}>The shop doesn&apos;t see this.</div>
          {error && <div role="alert" style={{ fontSize: 12.5, color: C.o, marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
            <button className="bg-btn" onClick={close} style={{ minHeight: 44 }}>Cancel</button>
            <button onClick={suspend} disabled={busy || !reason.trim()} style={{ ...outline(C.o), background: "rgba(255,107,53,0.12)", opacity: busy || !reason.trim() ? 0.5 : 1 }}>
              {busy ? "Suspending…" : "Suspend shop"}
            </button>
          </div>
        </Modal>

        <Modal open={deleteOpen} onClose={close} title={`Delete ${shop.name}`}>
          <div style={{ fontSize: 13, color: C.st, marginBottom: 12, lineHeight: 1.55 }}>
            This deletes the shop, its menu, settings, team list, campaigns and pictures for good. The owner&apos;s login stays, with no shop. Its Stripe account, if it has one, stays in Stripe.
          </div>
          <label htmlFor="delete-name">Type <b style={{ color: C.cl }}>{shop.name}</b> to delete it</label>
          <input
            id="delete-name"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoComplete="off"
            style={{ width: "100%", fontSize: 16 }}
          />
          {error && <div role="alert" style={{ fontSize: 12.5, color: C.o, marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
            <button className="bg-btn" onClick={close} style={{ minHeight: 44 }}>Cancel</button>
            <button onClick={remove} disabled={busy || !nameMatches} style={{ ...outline(C.r), background: "rgba(255,107,107,0.12)", opacity: busy || !nameMatches ? 0.5 : 1 }}>
              {busy ? "Deleting…" : "Delete for good"}
            </button>
          </div>
        </Modal>
    </>
  );
}
