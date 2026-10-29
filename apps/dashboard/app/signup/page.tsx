"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/components/brand-mark";
import PasswordInput from "@/components/password-input";
import { Icon } from "@/components/zb-icon";
import { signupErrorMessage } from "@/lib/auth-errors";

const C = { g:"#00B67A", st:"#6B7C93", cl:"#F8FAFB", r:"#FF4757" };

// The deal, shown before the button. Keep it in step with the code:
//   • signup itself creates the account and business, no card, no charge
//   • the trial starts from Settings → Subscription, which opens Stripe
//     Checkout (app/api/stripe/checkout). Stripe takes a card there.
//   • trial_period_days is 30 (TRIAL_DAYS in that route). Stripe takes the
//     first monthly payment when the trial ends, then every month.
//   • $500 a month AUD is the standard price (STRIPE_PRICE_MERCHANT_MONTHLY),
//     worded the same as the Settings subscription card.
const DEAL = [
  "Signing up is free. You don't need a card today.",
  "Start your free trial from Settings when you're ready. You add a card then.",
  "The trial lasts 30 days. Your first $500 payment is taken the day it ends, then once a month.",
  "300 texts a month are included. Extra texts are $0.12 each.",
];

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
    if (password.length < 8) { setError("Your password needs at least 8 characters."); return; }
    setLoading(true);
    setError("");

    // Create the login. The database trigger (handle_new_user, migration 015)
    // creates the business from business_name and links this user as owner.
    // The browser can't create businesses itself: row security blocks it, and
    // with email confirmation on there is no session yet at this point.
    //
    // Errors never say an email is taken. With email confirmation off,
    // Supabase answers an existing email with "User already registered";
    // signupErrorMessage turns that into a generic message.
    let data: { session: unknown } | null = null;
    let authError: unknown = null;
    try {
      ({ data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, business_name: bizName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      }));
    } catch (err) {
      authError = err;
    }

    if (authError || !data) { setError(signupErrorMessage(authError)); setLoading(false); return; }

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
        <div style={{ fontSize:48, marginBottom:16 }}><Icon name="done" size={48} /></div>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:C.cl, marginBottom:8 }}>Check your email</h2>
        <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, lineHeight:1.6 }}>
          If <strong style={{ color:C.cl }}>{email}</strong> can be used, we&apos;ve sent it a link to finish
          setting up. Open the link, then come back here to sign in. If you already have an account, sign in or
          reset your password.
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

            {/* The deal, before the button */}
            <div style={{ padding:16, background:"rgba(28,45,72,.5)", borderRadius:12, marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
                <span style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:C.cl }}>$500</span>
                <span style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st }}>/month AUD after a 30-day free trial</span>
              </div>
              <ul style={{ margin:0, padding:0, listStyle:"none", display:"grid", gap:6 }}>
                {DEAL.map(line => (
                  <li key={line} style={{ display:"flex", gap:8, fontFamily:"var(--font-inter)", fontSize:12, lineHeight:1.5, color:C.st }}>
                    <span aria-hidden="true" style={{ color:C.g, flexShrink:0 }}>•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div role="alert" style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(255,71,87,.1)", border:"1px solid rgba(255,71,87,.2)", fontFamily:"var(--font-inter)", fontSize:13, color:C.r }}>
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
