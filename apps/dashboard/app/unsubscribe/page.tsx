// ─── /unsubscribe ─────────────────────────────────────────────────────────────
// Where the unsubscribe link in a marketing email lands. Public (proxy.ts).
// Opening the page changes nothing, because link scanners open links too.
// The button posts to /api/unsubscribe, which saves the opt-out and sends the
// person back here with ?status=done.

import type { Metadata } from "next";
import BrandMark from "@/components/brand-mark";
import { createAdminClient } from "@/lib/supabase-server";
import { businessName, readUnsubscribeToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

const C = { st: "#6B7C93", cl: "#F8FAFB" };

type View =
  | { kind: "ask" | "done" | "already"; name: string | null }
  | { kind: "error"; name: string | null; saveFailed: boolean }
  | { kind: "invalid" };

async function loadView(token: string, status: string | undefined): Promise<View> {
  const customerId = readUnsubscribeToken(token);
  if (!customerId || status === "invalid") return { kind: "invalid" };

  try {
    const db = createAdminClient();
    // supabase-js returns errors rather than throwing, so check both.
    const { data: customer, error } = await db
      .from("customers")
      .select("business_id, opted_out, marketing_opt_in")
      .eq("id", customerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const name = customer ? await businessName(db, customer.business_id as string) : null;

    if (status === "done")  return { kind: "done", name };
    if (status === "error") return { kind: "error", name, saveFailed: true };
    if (!customer || (customer.opted_out && !customer.marketing_opt_in)) return { kind: "already", name };
    return { kind: "ask", name };
  } catch (err) {
    console.error("[unsubscribe page]", err instanceof Error ? err.message : err);
    if (status === "done") return { kind: "done", name: null };
    return { kind: "error", name: null, saveFailed: status === "error" };
  }
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token  = typeof params.t === "string" ? params.t : "";
  const status = typeof params.status === "string" ? params.status : undefined;
  const view   = await loadView(token, status);

  let title: string;
  let body: string;
  if (view.kind === "invalid") {
    title = "This link doesn't work";
    body  = "It may have been cut short when it was copied. Open it again from the email, or reply to the email and ask to be taken off the list.";
  } else if (view.kind === "error") {
    title = "Something went wrong";
    body  = view.saveFailed
      ? "We couldn't save that. Try the button again in a minute."
      : "We couldn't check your details just now. You can still press the button to unsubscribe.";
  } else if (view.kind === "done" || view.kind === "already") {
    title = view.kind === "done" ? "You're unsubscribed" : "You're already unsubscribed";
    body  = `${view.name ?? "The business"} won't send you any more offers by email or text. Receipts for orders you place will still arrive.`;
  } else {
    title = `Stop offers from ${view.name ?? "this business"}?`;
    body  = `You won't get any more offers from ${view.name ?? "this business"} by email or text. Receipts for orders you place will still arrive.`;
  }

  const showButton = view.kind === "ask" || view.kind === "error";

  return (
    <div style={{ minHeight: "100vh", background: "#0F1F2D", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <BrandMark size={40} style={{ margin: "0 auto" }} />
        </div>

        <div className="gc" style={{ padding: 32, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 20, color: C.cl, marginBottom: 10 }}>
            {title}
          </h1>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: C.st, lineHeight: 1.6, margin: 0 }}>
            {body}
          </p>

          {showButton && (
            <form method="post" action="/api/unsubscribe" style={{ marginTop: 24 }}>
              <input type="hidden" name="t" value={token} />
              <input type="hidden" name="from" value="page" />
              <button type="submit" className="bp" style={{ width: "100%", justifyContent: "center" }}>
                Unsubscribe
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-inter)", fontSize: 12, color: C.st }}>
          Sent by ZentraBite for the businesses that use it.
        </p>
      </div>
    </div>
  );
}
