"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/components/brand-mark";
import PasswordInput from "@/components/password-input";

const C = { g:"#00B67A", st:"#6B7C93", cl:"#F8FAFB", r:"#FF4757" };

export default function SignupPage() {
  const router = useRouter();

  const [name,     setName]     = useState("");
  const [bizName,  setBizName]  = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");

    // Create the login. The database trigger (handle_new_user, migration 015)
    // creates the business from business_name and links this user as owner.
    // The browser can't create businesses itself: row security blocks it, and
    // with email confirmation on there is no session yet at this point.
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, business_name: bizName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (authError) { setError(authError.message); setLoading(false); return; }

    // With email confirmation on, Supabase returns no session until the link
    // is clicked. If it ever comes back with a session, go straight in.
    if (data.session) {
      router.push("/dashboard");
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:420, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:C.cl, marginBottom:8 }}>Check your email</h2>
        <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, lineHeight:1.6 }}>
          We&apos;ve sent a confirmation link to <strong style={{ color:C.cl }}>{email}</strong>.
          Click the link to activate your account, then come back here to sign in.
        </p>
        <Link href="/login" className="bp" style={{ display:"inline-flex", marginTop:24, textDecoration:"none" }}>
          Go to Sign In →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <BrandMark size={48} style={{ margin: "0 auto 16px" }} />
          <h1 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:26, color:C.cl }}>
            Zentra<span style={{ color:C.g }}>Bite</span>
          </h1>
          <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, marginTop:6 }}>
            Create your merchant account
          </p>
        </div>

        {/* Form */}
        <div className="gc" style={{ padding:32 }}>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom:16 }}>
              <label>Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Liam Potter" required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label>Business name</label>
              <input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Sorrento's Pizza" required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourbusiness.com" required />
            </div>
            <div style={{ marginBottom:24 }}>
              <label>Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" required />
            </div>

            {error && (
              <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(255,71,87,.1)", border:"1px solid rgba(255,71,87,.2)", fontFamily:"var(--font-inter)", fontSize:13, color:C.r }}>
                {error}
              </div>
            )}

            <button type="submit" className="bp" disabled={loading} style={{ width:"100%", justifyContent:"center", opacity:loading?.7:1 }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", marginTop:20, fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color:C.g, textDecoration:"none", fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
