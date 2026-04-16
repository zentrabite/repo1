"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const C = { g:"#00B67A", st:"#6B7C93", cl:"#F8FAFB", r:"#FF4757" };

export default function LoginPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirect    = searchParams.get("redirect") ?? "/dashboard";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Hard redirect — ensures the session cookie is picked up properly
    window.location.href = redirect;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F1F2D",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: C.g,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20,
            color: "#1C2D48",
            margin: "0 auto 16px",
            boxShadow: "0 4px 20px rgba(0,182,122,.35)",
          }}>ZB</div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 26, color: C.cl }}>
            Zentra<span style={{ color: C.g }}>Bite</span>
          </h1>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: C.st, marginTop: 6 }}>
            Sign in to your merchant dashboard
          </p>
        </div>

        {/* Form */}
        <div className="gc" style={{ padding: 32 }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@yourbusiness.com"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                background: "rgba(255,71,87,.1)", border: "1px solid rgba(255,71,87,.2)",
                fontFamily: "var(--font-inter)", fontSize: 13, color: C.r,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="bp"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", opacity: loading ? .7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: "center", marginTop: 20,
          fontFamily: "var(--font-inter)", fontSize: 13, color: C.st,
        }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: C.g, textDecoration: "none", fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
