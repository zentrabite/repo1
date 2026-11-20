"use client";

// ─── Refund box, inside an order on the Orders page ─────────────────────────
// Gives money back on an online card order through /api/orders/[id]/refund.
// Two steps, so a slip of the finger doesn't refund: Refund $X, then
// "Yes, refund $X". The amount starts at everything that's left.

import { useState } from "react";
import type { Order } from "@/lib/database.types";
import { money, refundLeft } from "@/lib/refunds";

const C = { r:"#DC3545", st:"#6B7C93" };

export default function RefundPanel({ order, businessId, onRefunded, onCancel }: {
  order: Order;
  businessId: string;
  onRefunded: (patch: Partial<Order>, message: string) => void;
  onCancel: () => void;
}) {
  const left = refundLeft(order);
  const [amount,    setAmount]    = useState(left.toFixed(2));
  const [confirm,   setConfirm]   = useState(false);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const asked = Number(amount.replace(/[$,\s]/g, ""));
  const valid = Number.isFinite(asked) && asked > 0;

  const check = (): string | null => {
    if (!valid || Math.round(asked * 100) < 1) return "Enter an amount to refund.";
    if (Math.round(asked * 100) > Math.round(left * 100)) return `You can refund up to ${money(left)}.`;
    return null;
  };

  const send = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ business_id: businessId, amount: asked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Couldn't make the refund. Try again."); setConfirm(false); return; }
      onRefunded(
        { refunded_amount: data.refunded_amount, refunded_at: data.refunded_at, status: data.status },
        data.refund_status === "pending"
          ? `Refund of ${data.refunded} started. Stripe sends it once your Stripe balance covers it.`
          : `Refunded ${data.refunded} ✓`,
      );
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setConfirm(false);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ background:"rgba(220,53,69,.06)", border:"1px solid rgba(220,53,69,.25)", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
      <label htmlFor="zb-refund-amount" style={{ display:"block", fontSize:13, fontWeight:600, color:"#fff", marginBottom:8 }}>
        Refund to the customer&apos;s card
      </label>
      <div className="zb-wrap" style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ color:C.st, fontSize:16 }}>$</span>
        <input
          id="zb-refund-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={e => { setAmount(e.target.value); setConfirm(false); setError(null); }}
          disabled={busy}
          style={{ width:120, fontSize:16 }}
          aria-describedby="zb-refund-help"
        />
        <span style={{ fontSize:12, color:C.st }}>up to {money(left)}</span>
      </div>
      <p id="zb-refund-help" style={{ fontSize:12, color:C.st, lineHeight:1.5, margin:"8px 0 0" }}>
        It comes out of your Stripe balance. Stripe keeps its card fee on the original payment. The customer sees the money in about 5 to 10 business days. Their spend and points go down to match.
      </p>
      {error && <p role="alert" style={{ fontSize:12, color:C.r, margin:"8px 0 0" }}>{error}</p>}
      {confirm && !error && (
        <p style={{ fontSize:13, fontWeight:600, color:"#fff", margin:"10px 0 0" }}>
          {`Give ${money(asked)} back to the customer? You can't undo a refund.`}
        </p>
      )}
      <div className="zb-wrap" style={{ display:"flex", gap:8, marginTop:10 }}>
        {!confirm ? (
          <button
            className="bp"
            style={{ background:C.r, boxShadow:"none" }}
            onClick={() => { const err = check(); if (err) setError(err); else setConfirm(true); }}
          >
            Refund{valid ? ` ${money(asked)}` : ""}
          </button>
        ) : (
          <button className="bp" style={{ background:C.r, boxShadow:"none" }} disabled={busy} onClick={send}>
            {busy ? "Refunding…" : `Yes, refund ${money(asked)}`}
          </button>
        )}
        <button className="bg-btn" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
