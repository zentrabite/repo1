"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const C = { g: "#00B67A", st: "#6B7C93", cl: "#F8FAFB", r: "#FF4757" };

// ── Parse Supabase recovery tokens out of the URL hash ──────────────────────
// The email link lands here as /reset-password#access_token=…&refresh_token=…
// &type=recovery. We extract both tokens so we can call setSession() directly
// instead of relying on supabase-js's auto-detection, which occasionally
// races with the form submit and causes updateUser() to hang indefinitely.
function parseHash(hash: string): { access?: string; refresh?: string; type?: string; error?: string } {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  return {
    access:  params.get("access_token")  ?? undefined,
    refresh: params.get("refresh_token") ?? undefined,
    type:    params.get("type")          ?? undefined,
    error:   params.get("error_description") ?? undefined,
  };
}

function ResetForm() {
  const router = useRouter();
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null); // null = still checking

  // On mount: pull tokens out of the hash, set the session explicitly.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { access, refresh, type, error: hashError } = parseHash(window.location.hash || "");

      // Supabase surfaces expiry / invalid-link errors in the hash too.
      if (hashError) {
        if (!cancelled) { setError(hashError); setHasSession(false); }
        return;
      }

      if (access && refresh && type === "recovery") {
        try {
          const { error: setErr } = await supabase.auth.setSession({
            access_token:  access,
            refresh_token: refresh,
          });
          if (cancelled) return;
          if (setErr) {
            setError(setErr.message);
            setHasSession(false);
            return;
          }
          // Clear the hash from the URL so refreshes don't re-trigger this.
          window.history.replaceState(null, "", window.location.pathname);
          setHasSession(true);
          return;
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Could not start recovery session");
            setHasSession(false);
          }
          return;
        }
      }

      // No recovery tokens in the hash — maybe the user navigated here directly
      // while already authenticated. Check for an existing session.
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setHasSession(!!session);
    })();

    return () => { cancelled = true; };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");

    // Guard: if updateUser hangs on a gotrue lock (same bug as sign-out),
    // surface an error rather than sitting on "Updating…" forever.
    const timeout = new Promise<{ error: { message: string } }>(resolve =>
      setTimeout(() => resolve({ error: { message: "Request timed out. Please try again." } }), 15000),
    );
    const update = supabase.auth.updateUser({ password });

    const { error } = await Promise.race([update, timeout]);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    }
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

        {/* Logo + title — matches /login */}
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
            {done ? "Password updated successfully" : "Set a new password for your account"}
          </p>
        </div>

        {/* Loading state while we set the session */}
        {hasSession === null ? (
          <div className="gc" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: C.st }}>
              Verifying reset link…
            </div>
          </div>
        ) : done ? (
          <div className="gc" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{
              fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 16,
              color: C.cl, marginBottom: 8,
            }}>
              Password updated
            </div>
            <div style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: C.st }}>
              Redirecting to your dashboard…
            </div>
          </div>
        ) : !hasSession ? (
          <div className="gc" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 16,
              color: C.cl, marginBottom: 8,
            }}>
              Link invalid or expired
            </div>
            <div style={{
              fontFamily: "var(--font-inter)", fontSize: 13,
              color: C.st, marginBottom: 20, lineHeight: 1.5,
            }}>
              {error || "This reset link is no longer valid. Password reset links expire after one hour."}
            </div>
            <Link href="/forgot-password" style={{
              color: C.g, textDecoration: "none", fontSize: 13,
              fontFamily: "var(--font-inter)", fontWeight: 500,
            }}>
              Request a new link →
            </Link>
          </div>
        ) : (
          <div className="gc" style={{ padding: 32 }}>
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 16 }}>
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
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
                {loading ? "Updating…" : "Update Password →"}
              </button>
            </form>
          </div>
        )}

        {hasSession && !done && (
          <p style={{
            textAlign: "center", marginTop: 20,
            fontFamily: "var(--font-inter)", fontSize: 13, color: C.st,
          }}>
            <Link href="/login" style={{ color: C.g, textDecoration: "none", fontWeight: 500 }}>
              ← Back to sign in
            </Link>
          </p>
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
