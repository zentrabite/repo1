// Sign-ups aren't open. ZentraBite's team sets up each shop with its owner
// (the onboarding wizard and the sale handover form), and the owner gets a
// login link from us. Self-signup was switched off in Supabase on 25 Nov, in
// the second security run: with email confirmation off, anyone could make a
// login with a shop's email before we set that shop up. When sign-ups open
// at launch, turn on "Confirm email" first (it needs the Resend domain).

import Link from "next/link";
import BrandMark from "@/components/brand-mark";

export const metadata = { title: "Sign up | ZentraBite" };

const C = { g: "#00AD82", st: "#8B9DB5", cl: "#F8FAFB" };

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0F1F2D", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <BrandMark size={48} style={{ margin: "0 auto 16px" }} />
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 26, color: C.cl }}>
            Zentra<span style={{ color: C.g }}>Bite</span>
          </h1>
        </div>

        <div className="gc" style={{ padding: 32, fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6, color: C.cl }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 18, marginBottom: 10 }}>{"Sign-ups aren't open yet"}</h2>
          <p style={{ color: C.st, marginBottom: 20 }}>
            {"We set up each shop with its owner, then send the owner a link to log in. If you'd like ZentraBite for your business, book a call."}
          </p>
          <a href="https://zentrabite.com/contact" className="bp" style={{ display: "flex", boxSizing: "border-box", width: "100%", justifyContent: "center", textDecoration: "none" }}>
            Book a call
          </a>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-inter)", fontSize: 13, color: C.st }}>
          {"Already have a login? "}
          <Link href="/login" style={{ color: C.g, textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
