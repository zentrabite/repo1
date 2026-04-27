"use client";

// Force dynamic rendering — prevents Next.js from trying to statically
// prerender this page at build time, which would fail for auth routes.
export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: replace with your auth provider (Supabase, NextAuth, etc.)
      // const { error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;

      // Placeholder — remove once real auth is wired up
      if (!email || !password) throw new Error("Please fill in all fields.");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-near-black)",
        padding: "1.5rem",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--color-dark-navy)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          padding: "2.5rem",
        }}
      >
        {/* Logo / wordmark */}
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--color-cloud)",
              letterSpacing: "-0.5px",
            }}
          >
            Zentra
            <span style={{ color: "var(--color-green)" }}>Bite</span>
          </span>
          <p
            style={{
              marginTop: "0.35rem",
              fontSize: "0.875rem",
              color: "var(--color-muted)",
            }}
          >
            Merchant Portal
          </p>
        </div>

        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-cloud)",
            marginBottom: "1.5rem",
          }}
        >
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-muted)",
                marginBottom: "0.4rem",
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              required
              style={{
                width: "100%",
                padding: "0.65rem 0.9rem",
                backgroundColor: "var(--color-near-black)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-cloud)",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-green)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-muted)",
                marginBottom: "0.4rem",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "0.65rem 0.9rem",
                backgroundColor: "var(--color-near-black)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-cloud)",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-green)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              style={{
                marginBottom: "1rem",
                padding: "0.65rem 0.9rem",
                backgroundColor: "rgba(255, 107, 53, 0.1)",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                color: "var(--color-orange)",
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: loading ? "var(--color-border)" : "var(--color-green)",
              color: loading ? "var(--color-muted)" : "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.15s, opacity 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--color-muted)",
          }}
        >
          Having trouble?{" "}
          <a
            href="mailto:support@zentrabite.com"
            style={{ color: "var(--color-green)", textDecoration: "none" }}
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
