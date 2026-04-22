import Link from "next/link";
import { features } from "../features/data";

export function FeaturesGrid() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            What's inside
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 10 }}>
            Everything you need, in one place.
          </h2>
          <p style={{ fontSize: 15, color: "var(--steel)" }}>
            Tap any tile to learn more.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {features.map((f) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className="glass feature-tile"
              style={{
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
                textDecoration: "none",
                minHeight: 140,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--green-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: 15.5,
                  color: "var(--cloud)",
                  margin: 0,
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              >
                {f.title}
              </h3>
              <span
                className="feature-tile-cta"
                style={{
                  marginTop: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "var(--green)",
                  fontWeight: 600,
                  fontSize: 13,
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


