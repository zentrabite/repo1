// ─── Auth error messages for the login, signup and password pages ────────────
//
// Supabase's raw error text can tell a stranger whether an email has an
// account ("User already registered", "User is banned" and so on). These
// helpers turn every error into a short message that never reveals that.
// The raw error is logged with console.error so it can still be debugged.
//
// Only three kinds of error get their own wording, because they say nothing
// about whether an account exists:
//   • too many attempts from this browser (rate limited)
//   • the network is down or Supabase can't be reached
//   • a weak or too-short password (signup and reset only)
//
// Safe to import from "use client" pages. Keep it free of server code.

type AuthErrorLike = {
  name?:    string;
  message?: string;
  status?:  number;
  code?:    string;
};

const asAuthError = (err: unknown): AuthErrorLike =>
  err && typeof err === "object" ? (err as AuthErrorLike) : { message: String(err) };

export const MSG = {
  login:        "That email and password don't match. Try again or reset your password.",
  signup:       "We couldn't create an account with those details. If you already have an account, sign in or reset your password.",
  resetSent:    "If there's an account for that email, we've sent a reset link.",
  resetLink:    "This reset link has expired or has already been used. Ask for a new one.",
  resetFailed:  "We couldn't update your password. Ask for a new reset link and try again.",
  rateLimited:  "Too many attempts. Wait a few minutes and try again.",
  network:      "We can't reach the server. Check your internet connection and try again.",
  server:       "Something went wrong on our side. Try again in a minute.",
  weakPassword: "Pick a stronger password. Use at least 8 characters with a mix of letters, numbers and symbols.",
  samePassword: "Your new password must be different from your old one.",
} as const;

/** Network failure: fetch threw, or Supabase couldn't be reached at all. */
export function isNetworkError(err: unknown): boolean {
  const e = asAuthError(err);
  if (e.name === "AuthRetryableFetchError") return true;
  if (e.name === "TypeError" && /fetch|network|load failed/i.test(e.message ?? "")) return true;
  return e.status === 0;
}

/**
 * Rate limited by request volume from this browser or IP. Not
 * over_email_send_rate_limit: Supabase only returns that when it was about
 * to email a real account, so it gives the account away.
 */
export function isRequestRateLimit(err: unknown): boolean {
  const e = asAuthError(err);
  return e.code === "over_request_rate_limit" || (e.status === 429 && e.code !== "over_email_send_rate_limit");
}

function isWeakPassword(err: unknown): boolean {
  const e = asAuthError(err);
  return e.name === "AuthWeakPasswordError" || e.code === "weak_password";
}

function isServerError(err: unknown): boolean {
  const e = asAuthError(err);
  return typeof e.status === "number" && e.status >= 500;
}

function log(where: string, err: unknown): void {
  const e = asAuthError(err);
  console.error(`[auth/${where}]`, { name: e.name, status: e.status, code: e.code, message: e.message });
}

/** Login. Unknown email, wrong password, banned user and the rest all read the same. */
export function loginErrorMessage(err: unknown): string {
  log("login", err);
  if (isNetworkError(err))     return MSG.network;
  if (isRequestRateLimit(err)) return MSG.rateLimited;
  // Supabase checks the password before it says this, so it only reaches
  // someone who already knows the password. With email confirmation off it
  // never happens.
  if (asAuthError(err).code === "email_not_confirmed") {
    return "Confirm your email first. Open the link we emailed you, then sign in.";
  }
  // A server fault isn't an account fact, and calling it a wrong password
  // would send people round in circles.
  if (isServerError(err))      return MSG.server;
  return MSG.login;
}

/**
 * Signup. Never says an email is taken. With email confirmation off,
 * Supabase answers an existing email with "User already registered"
 * (code user_already_exists, status 422). That lands on the generic message.
 */
export function signupErrorMessage(err: unknown): string {
  log("signup", err);
  if (isNetworkError(err))     return MSG.network;
  if (isRequestRateLimit(err)) return MSG.rateLimited;
  if (isWeakPassword(err))     return MSG.weakPassword;
  const code = asAuthError(err).code;
  if (code === "email_address_invalid") return "Check the email address and try again.";
  if (code === "signup_disabled")       return "New sign-ups are closed at the moment.";
  return MSG.signup;
}

/**
 * Forgot password. Returns null when the page should show the normal
 * "if there's an account" message. That covers success and every error
 * that could hint at an account, including Supabase's "you can only request
 * this after 60 seconds", which it only sends for real accounts.
 */
export function forgotPasswordErrorMessage(err: unknown): string | null {
  log("forgot-password", err);
  if (isNetworkError(err))     return MSG.network;
  if (isRequestRateLimit(err)) return MSG.rateLimited;
  return null;
}

/** Reset password: opening the link (setSession, or an error in the URL). */
export function resetLinkErrorMessage(err: unknown): string {
  log("reset-link", err);
  if (isNetworkError(err)) return MSG.network;
  return MSG.resetLink;
}

/** Reset password: saving the new password (updateUser). */
export function resetUpdateErrorMessage(err: unknown): string {
  log("reset-update", err);
  if (isNetworkError(err))     return MSG.network;
  if (isRequestRateLimit(err)) return MSG.rateLimited;
  if (isWeakPassword(err))     return MSG.weakPassword;
  const code = asAuthError(err).code;
  if (code === "same_password") return MSG.samePassword;
  if (code === "session_not_found" || code === "session_expired" || asAuthError(err).name === "AuthSessionMissingError") {
    return MSG.resetLink;
  }
  return MSG.resetFailed;
}
