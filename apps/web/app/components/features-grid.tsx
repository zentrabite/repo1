import Link from "next/link";
import { features } from "../features/data";

export function FeaturesGrid() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Everything you need, nothing you don't
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            One platform. Every part of service.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            Stop stitching together five tools for one restaurant. ZentraBite gives
            you the POS, the ordering page, the loyalty app, the SMS tool, and the
            delivery dispatcher — and we'll even build your custom website and mobile
            app on top.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className="glass feature-tile"
              style={{
                padding: 28,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              {f.tag && (
                <span
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--orange)",
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "rgba(255,107,53,0.12)",
                    border: "1px solid rgba(255,107,53,0.35)",
                  }}
                >
                  {f.tag}
                </span>
              )}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--green-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  marginBottom: 18,
                }}
                aria-hidden
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 10, color: "var(--cloud)" }}>
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  color: "var(--steel)",
                  lineHeight: 1.6,
                  marginBottom: 16,
                  flex: 1,
                }}
              >
                {f.summary}
              </p>
              <span
                className="feature-tile-cta"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--green)",
                  fontWeight: 600,
                  fontSize: 14,
                  marginTop: "auto",
                  transition: "gap 0.18s",
                }}
              >
                Learn more <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
