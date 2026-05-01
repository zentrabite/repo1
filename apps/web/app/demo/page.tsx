import Link from "next/link";
import { Logo } from "../components/logo";

type DemoCard = {
  href: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  badge?: string;
  primary?: boolean;
};

const DEMOS: DemoCard[] = [
  {
    href: "/demo/live",
    emoji: "🧠",
    title: "Run the merchant CRM sandbox",
    description:
      "The full merchant operating system, pre-loaded with a working pizzeria. Click through orders, AI calls, smart delivery routing, stock, rewards, automations and more — every page is real and interactive.",
    cta: "Open the CRM →",
    badge: "Most popular",
    primary: true,
  },
  {
    href: "/demo/merchant",
    emoji: "🛒",
    title: "See the customer storefront",
    description:
      "What your customers see when they order from you — branded site, menu, cart and checkout. Your storefront sits on your own domain, no aggregator commissions.",
    cta: "Open the storefront →",
  },
  {
    href: "/demo/super-admin",
    emoji: "🔐",
    title: "See the platform super admin",
    description:
      "How ZentraBite operates the platform — multi-tenant control plane, module flags, impersonation, billing health, and rollout gates across every business.",
    cta: "Open super admin →",
  },
  {
    href: "/contact",
    emoji: "✨",
    title: "Start your 1-month free trial",
    description:
      "Spin up your own ZentraBite tenant in under five minutes. Card details only required at the end of the trial — no commitment, cancel any time.",
    cta: "Talk to us →",
  },
];

const STATS = [
  { value: "5+", label: "tools replaced", sub: "POS, CRM, marketing, delivery, analytics" },
  { value: "30 sec", label: "to a working tenant", sub: "Sign up, pick modules, go live" },
  { value: "0%", label: "aggregator fees on direct orders", sub: "Storefront + app are yours" },
  { value: "24/7", label: "AI phone agent", sub: "Books, takes orders, answers questions" },
];

export default function DemoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--near-black)", color: "var(--cloud)" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(15,25,42,0.85)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--mist-9)",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}
        >
          <Link href="/" aria-label="ZentraBite home">
            <Logo size={32} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/contact" className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              Book a call
            </Link>
            <Link href="/" className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              Exit
            </Link>
          </div>
        </div>
      </header>

      <main className="grid-bg" style={{ padding: "56px 24px 80px" }}>
        <div className="container" style={{ maxWidth: 1080 }}>
          {/* Hero */}
          <section style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              ZentraBite · Live demo
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 4.5vw, 52px)",
                lineHeight: 1.08,
                margin: "0 auto 18px",
                color: "var(--cloud)",
                maxWidth: 820,
              }}
            >
              See ZentraBite from every angle.
            </h1>
            <p
              style={{
                fontSize: 17,
                color: "var(--steel)",
                lineHeight: 1.65,
                maxWidth: 680,
                margin: "0 auto",
              }}
            >
              Three interactive demos, no signup, nothing saved. Explore the merchant CRM, the
              customer-facing storefront, and the platform super admin — exactly as a real operator,
              customer, or our team would use them.
            </p>
          </section>

          {/* Impact stats */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 64,
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  background: "var(--navy-40)",
                  border: "1px solid var(--mist-6)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-outfit)",
                    fontWeight: 800,
                    fontSize: 28,
                    color: "var(--green)",
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--cloud)", marginTop: 6, fontWeight: 600 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4, lineHeight: 1.45 }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </section>

          {/* Four ways to dig in */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div className="eyebrow">Four ways to dig in</div>
              <div style={{ fontSize: 13, color: "var(--steel)" }}>
                Pick any — they each open in this tab. Use the back button to return.
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {DEMOS.map((d) => (
                <DemoCardLink key={d.href} demo={d} />
              ))}
            </div>
          </section>

          {/* Footer note */}
          <section style={{ marginTop: 56, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--steel)", margin: 0 }}>
              Want a guided tour?{" "}
              <Link href="/contact" style={{ color: "var(--green)", fontWeight: 600 }}>
                Book a 15-minute call →
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function DemoCardLink({ demo }: { demo: DemoCard }) {
  const isPrimary = !!demo.primary;
  return (
    <Link
      href={demo.href}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "22px 22px 20px",
        borderRadius: 16,
        background: isPrimary
          ? "linear-gradient(160deg, rgba(0,182,122,0.18), rgba(0,182,122,0.04))"
          : "var(--navy-40)",
        border: `1px solid ${isPrimary ? "rgba(0,182,122,0.45)" : "var(--mist-6)"}`,
        textDecoration: "none",
        color: "var(--cloud)",
        transition: "transform 0.18s ease, border-color 0.18s ease, background 0.18s ease",
      }}
      className="demo-card"
    >
      {demo.badge && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--green)",
            background: "rgba(0,182,122,0.16)",
            border: "1px solid rgba(0,182,122,0.35)",
            padding: "3px 8px",
            borderRadius: 999,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {demo.badge}
        </div>
      )}
      <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
        {demo.emoji}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 19, color: "var(--cloud)" }}>
        {demo.title}
      </div>
      <p
        style={{
          fontSize: 13.5,
          color: "var(--steel)",
          lineHeight: 1.6,
          margin: "0 0 6px",
          flex: 1,
        }}
      >
        {demo.description}
      </p>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: isPrimary ? "var(--green)" : "var(--cloud)",
          marginTop: 6,
        }}
      >
        {demo.cta}
      </div>
    </Link>
  );
}
