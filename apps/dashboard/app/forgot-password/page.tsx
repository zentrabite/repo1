"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const C = { g: "#00B67A", st: "#6B7C93", cl: "#F8FAFB", r: "#FF4757" };

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:C.g, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:20, color:"#1C2D48", margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(0,182,122,.35)" }}>ZB</div>
          <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:26, color:C.cl }}>
            Reset Password
          </h1>
          <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, marginTop:6 }}>
            {sent ? "Check your inbox" : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="gc" style={{ padding:32, textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📧</div>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:16, color:C.cl, marginBottom:8 }}>
              Reset link sent
            </div>
            <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, marginBottom:24 }}>
              We sent a password reset link to <strong style={{ color:C.cl }}>{email}</strong>. Check your spam folder if you don't see it.
            </div>
            <Link href="/login" style={{ color:C.g, textDecoration:"none", fontSize:13, fontFamily:"var(--font-inter)" }}>
              ← Back to login
            </Link>
          </div>
        ) : (
          <div className="gc" style={{ padding:32 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:24 }}>
                <label>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@yourbusiness.com" required autoFocus />
              </div>

              {error && (
                <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(255,71,87,.1)", border:"1px solid rgba(255,71,87,.2)", fontFamily:"var(--font-inter)", fontSize:13, color:C.r }}>
                  {error}
                </div>
              )}

              <button type="submit" className="bp" disabled={loading} style={{ width:"100%", justifyContent:"center", opacity:loading ? .7 : 1 }}>
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
            </form>

            <p style={{ textAlign:"center", marginTop:20, fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>
              <Link href="/login" style={{ color:C.g, textDecoration:"none" }}>← Back to login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
