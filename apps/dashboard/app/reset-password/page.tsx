"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const C = { g: "#00B67A", st: "#6B7C93", cl: "#F8FAFB", r: "#FF4757" };

function ResetForm() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Supabase sends the user here after they click the email link.
  // The URL contains a code that supabase.auth automatically exchanges for a session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    // Listen for the AUTH_CODE exchange that happens when the link is followed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:C.g, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:20, color:"#1C2D48", margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(0,182,122,.35)" }}>ZB</div>
          <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:26, color:C.cl }}>Set New Password</h1>
          <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, marginTop:6 }}>Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="gc" style={{ padding:32, textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:16, color:C.cl, marginBottom:8 }}>Password updated</div>
            <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>Redirecting to your dashboard…</div>
          </div>
        ) : !hasSession ? (
          <div className="gc" style={{ padding:32, textAlign:"center" }}>
            <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>
              Invalid or expired reset link. <a href="/forgot-password" style={{ color:C.g }}>Request a new one →</a>
            </div>
          </div>
        ) : (
          <div className="gc" style={{ padding:32 }}>
            <form onSubmit={handleReset}>
              <div style={{ marginBottom:16 }}>
                <label>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required autoFocus />
              </div>
              <div style={{ marginBottom:24 }}>
                <label>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required />
              </div>

              {error && (
                <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(255,71,87,.1)", border:"1px solid rgba(255,71,87,.2)", fontFamily:"var(--font-inter)", fontSize:13, color:C.r }}>
                  {error}
                </div>
              )}

              <button type="submit" className="bp" disabled={loading} style={{ width:"100%", justifyContent:"center", opacity:loading ? .7 : 1 }}>
                {loading ? "Updating…" : "Update Password →"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
