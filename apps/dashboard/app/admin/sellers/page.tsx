"use client";

// ─── Super Admin → Sellers ──────────────────────────────────────────────────
// The people who sell ZentraBite. A seller can fill in the sale handover form
// (/sell/new) and see the shops they sold, nothing else. Invite one here, or
// take access away. Uses /api/admin/sellers (super admin only).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import { Icon } from "@/components/zb-icon";

type Seller = { id: string; name: string | null; email: string | null; phone: string | null; shops: number; last_sale: string | null };

const C = { g:"#00AD82", st:"#6B7C93", cl:"#F8FAFB", r:"#FF4757", o:"#FF6B35" };

export default function SellersPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useBusiness();
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; inviteLink: string | null; existing: boolean } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sellers");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Couldn't load sellers"); return; }
    setSellers(data.sellers ?? []);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    void load();
  }, [loading, isSuperAdmin, router, load]);

  async function invite() {
    setFormError(null); setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error ?? "Couldn't add the seller"); return; }
      setResult({ name: data.seller?.name ?? name, inviteLink: data.inviteLink ?? null, existing: Boolean(data.existing) });
      setName(""); setEmail(""); setPhone("");
      await load();
    } catch { setFormError("Couldn't reach the server"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/sellers/${id}`, { method: "DELETE" });
    setConfirmRemove(null);
    if (!res.ok) { setError("Couldn't remove access. Try again."); return; }
    await load();
  }

  if (loading || !isSuperAdmin) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 820 }}>
      <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: "8px 0" }}>
        ← Back to Super Admin
      </button>
      <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: "0 0 4px" }}>Sellers</h2>
      <p style={{ color: C.st, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        A seller fills in the sale handover form with the owner and sees the shops they sold. They can&apos;t open a shop&apos;s CRM, its customers or its orders, and they never get the owner&apos;s login.
      </p>

      <div className="gc" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: C.cl, marginBottom: 12 }}>Add a seller</div>
        <div className="zb-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.st }}>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Sam Lee" /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.st }}>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sam@example.com" /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.st }}>Mobile<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="04xx xxx xxx" /></label>
          <button className="bp" onClick={invite} disabled={busy}><Icon name="user-plus" size={16} />{busy ? "Adding…" : "Add"}</button>
        </div>
        {formError && <p role="alert" style={{ color: C.r, fontSize: 13, margin: "10px 0 0" }}>{formError}</p>}
        {result && (
          <div role="status" style={{ marginTop: 12, background: "rgba(0,173,130,.08)", border: "1px solid rgba(0,173,130,.25)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.cl, lineHeight: 1.6 }}>
            {result.existing
              ? `${result.name} already had a login, so they can sign in as normal and go to /sell.`
              : <>
                  {`${result.name} is a seller now. Emails don't send yet, so send them this link yourself. It logs them in to set a password.`}
                  {result.inviteLink && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input readOnly value={result.inviteLink} onFocus={e => e.currentTarget.select()} style={{ fontSize: 12 }} aria-label="Invite link" />
                      <button className="bg-btn" onClick={() => { void navigator.clipboard?.writeText(result.inviteLink!); }}>Copy</button>
                    </div>
                  )}
                </>}
          </div>
        )}
      </div>

      {error && <p role="alert" style={{ color: C.r, fontSize: 13 }}>{error}</p>}
      <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
        {sellers === null ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Loading…</p>
        ) : sellers.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>No sellers yet.</p>
        ) : sellers.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderTop: i ? "1px solid rgba(226,232,240,.06)" : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.cl, fontWeight: 600, fontSize: 14 }}>{s.name ?? s.email}</div>
              <div style={{ color: C.st, fontSize: 12, marginTop: 2, overflowWrap: "anywhere" }}>
                {[s.email, s.phone].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: C.st, fontSize: 12 }}>
                {s.shops === 1 ? "1 shop" : `${s.shops} shops`}
                {s.last_sale ? `, last ${new Date(s.last_sale).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
              </span>
              {confirmRemove === s.id ? (
                <>
                  <button className="bp" style={{ background: C.r, boxShadow: "none" }} onClick={() => remove(s.id)}>Yes, remove access</button>
                  <button className="bg-btn" onClick={() => setConfirmRemove(null)}>Cancel</button>
                </>
              ) : (
                <button className="bg-btn" onClick={() => setConfirmRemove(s.id)}>Remove access</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
