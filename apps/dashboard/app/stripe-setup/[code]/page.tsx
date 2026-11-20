// ─── /stripe-setup/[code] ───────────────────────────────────────────────────
// The page the owner's Stripe link opens (lib/stripe-setup-link.ts). No login.
// It says what Stripe will ask for, and its Start button posts to
// /api/stripe-setup/[code], which sends them to Stripe. Stripe sends them back
// here with ?done=1, or ?again=1 if its own page timed out.

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-server";
import { findSetupLink, SETUP_LINK_DAYS } from "@/lib/stripe-setup-link";
import BrandMark from "@/components/brand-mark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set up payments | ZentraBite", robots: { index: false, follow: false } };

const C = { g: "#00AD82", st: "#94A3B8", cl: "#F8FAFB", card: "#16243A", line: "rgba(226,232,240,.1)", r: "#FF6B35" };

export default async function StripeSetupPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ done?: string; again?: string; error?: string }>;
}) {
  const { code } = await params;
  const q = await searchParams;
  const found = await findSetupLink(createAdminClient(), code);

  let title: string, body: React.ReactNode, start: string | null = null;
  if (!found.ok) {
    title = "This link has run out";
    body = <p>{`Links work for ${SETUP_LINK_DAYS} days, and a new one stops the last one working. Ask the ZentraBite team for a new link.`}</p>;
  } else if (found.shop.stripe_charges_enabled) {
    title = `Payments are on for ${found.shop.name}`;
    body = <p>Nothing more to do here. Orders paid online go straight to your Stripe account. Stripe pays them into your bank.</p>;
  } else if (q.done) {
    title = "Thanks, Stripe is checking your details";
    body = <p>This usually takes a few minutes, sometimes a day or two. Stripe will email you if it needs anything else. You can come back to this link to carry on.</p>;
    start = "Carry on with Stripe";
  } else {
    title = `Set up payments for ${found.shop.name}`;
    body = (
      <>
        <p>Your online orders are paid straight into your own Stripe account. Stripe needs a few details before the money can reach you. It takes about 10 minutes.</p>
        <p style={{ margin: "14px 0 6px", color: C.cl, fontWeight: 600 }}>Have these ready</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>your ABN</li>
          <li>photo ID for the person who runs the business</li>
          <li>the bank account you&apos;d like paid into</li>
        </ul>
        {q.again && <p style={{ color: C.cl }}>Stripe&apos;s page timed out. Start again and it picks up where you left off.</p>}
      </>
    );
    start = "Start with Stripe";
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px max(16px, env(safe-area-inset-left))" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, color: C.cl, fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16 }}>
          <BrandMark size={32} />ZentraBite
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, color: C.st, fontSize: 15, lineHeight: 1.6 }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 22, lineHeight: 1.3, color: C.cl, margin: "0 0 12px" }}>{title}</h1>
          {body}
          {q.error && found.ok && <p role="alert" style={{ color: C.r }}>Stripe didn&apos;t open. Try again in a minute.</p>}
          {start && (
            <form method="post" action={`/api/stripe-setup/${encodeURIComponent(code)}`} style={{ marginTop: 20 }}>
              <button type="submit" className="bp" style={{ width: "100%", justifyContent: "center", minHeight: 48, fontSize: 16 }}>{start}</button>
            </form>
          )}
        </div>
        <p style={{ color: C.st, fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>
          Stripe handles the payments and checks your details. ZentraBite never sees your bank details or ID.
        </p>
      </div>
    </main>
  );
}
