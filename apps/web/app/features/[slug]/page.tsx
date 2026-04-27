import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "../../components/nav";
import { Footer } from "../../components/footer";
import { CTABanner } from "../../components/cta-banner";
import { Expandable } from "../../components/expandable";
import { features, getFeature, getRelated } from "../data";

export async function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = getFeature(slug);
  if (!f) return { title: "Feature not found — ZentraBite" };
  return {
    title: `${f.title} — ZentraBite`,
    description: f.tagline,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFeature(slug);
  if (!f) notFound();

  const related = getRelated(f.relatedSlugs);

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section
          className="grid-bg"
          style={{ paddingTop: 140, paddingBottom: 72, position: "relative" }}
        >
          <div className="container" style={{ maxWidth: 860 }}>
            <Link
              href="/#features"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--steel)",
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              <span aria-hidden>←</span> All features
            </Link>

            <div className="eyebrow" style={{ marginBottom: 22 }}>
              {f.eyebrow}
            </div>

            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: "var(--green-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {f.icon}
              </div>
              <h1
                style={{
                  fontSize: "clamp(32px, 4.8vw, 52px)",
                  margin: 0,
                  color: "var(--cloud)",
                }}
              >
                {f.title}
              </h1>
            </div>

            <p
              style={{
                fontSize: "clamp(17px, 1.6vw, 20px)",
                color: "var(--steel)",
                lineHeight: 1.55,
                maxWidth: 720,
              }}
            >
              {f.tagline}
            </p>
          </div>
        </section>

        {/* Overview — first paragraph only; rest collapsed */}
        <section className="section" style={{ paddingTop: 48 }}>
          <div className="container" style={{ maxWidth: 860 }}>
            {f.overview[0] && (
              <p
                style={{
                  fontSize: 17,
                  color: "var(--cloud)",
                  lineHeight: 1.75,
                  marginBottom: 14,
                  opacity: 0.9,
                }}
              >
                {f.overview[0]}
              </p>
            )}
            {f.overview.length > 1 && (
              <Expandable summary="Keep reading">
                {f.overview.slice(1).map((p, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 16,
                      color: "var(--cloud)",
                      lineHeight: 1.75,
                      marginTop: 0,
                      marginBottom: 16,
                      opacity: 0.9,
                    }}
                  >
                    {p}
                  </p>
                ))}
              </Expandable>
            )}
          </div>
        </section>

        {/* How it works */}
        <section
          className="section"
          style={{ background: "rgba(28,45,72,0.18)", paddingTop: 72, paddingBottom: 72 }}
        >
          <div className="container" style={{ maxWidth: 960 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              How it works
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 3.4vw, 36px)",
                marginBottom: 36,
                color: "var(--cloud)",
              }}
            >
              {`Four steps — that's the whole thing.`}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 18,
              }}
            >
              {f.howItWorks.map((s, i) => (
                <div key={s.title} className="glass" style={{ padding: 24 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--green)",
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    0{i + 1}
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      color: "var(--cloud)",
                      marginBottom: 10,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14.5,
                      color: "var(--steel)",
                      lineHeight: 1.6,
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's included + Who it's for */}
        <section className="section">
          <div
            className="container feature-included-grid"
            style={{
              maxWidth: 960,
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 48,
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                {`What's included`}
              </div>
              <h2
                style={{
                  fontSize: "clamp(24px, 3vw, 32px)",
                  marginBottom: 24,
                  color: "var(--cloud)",
                }}
              >
                Every detail, covered.
              </h2>
              <ul style={{ listStyle: "none", display: "grid", gap: 14 }}>
                {f.bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      fontSize: 15.5,
                      color: "var(--cloud)",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: "var(--green-15)",
                        color: "var(--green)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div
                className="glass"
                style={{
                  padding: 28,
                  background:
                    "linear-gradient(135deg, rgba(0,182,122,0.12), rgba(28,45,72,0.55))",
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 14 }}>
                  {`Who it's for`}
                </div>
                <p
                  style={{
                    fontSize: 15.5,
                    color: "var(--cloud)",
                    lineHeight: 1.7,
                  }}
                >
                  {f.whoItsFor}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="section" style={{ paddingTop: 32 }}>
            <div className="container" style={{ maxWidth: 1100 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                Related features
              </div>
              <h2
                style={{
                  fontSize: "clamp(22px, 2.8vw, 28px)",
                  marginBottom: 28,
                  color: "var(--cloud)",
                }}
              >
                Works even better together.
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 18,
                }}
              >
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/features/${r.slug}`}
                    className="glass"
                    style={{
                      padding: 22,
                      display: "block",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: "var(--green-15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 21,
                        marginBottom: 14,
                      }}
                      aria-hidden
                    >
                      {r.icon}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-outfit)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--cloud)",
                        marginBottom: 6,
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--steel)",
                        lineHeight: 1.5,
                      }}
                    >
                      {r.tagline}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <CTABanner />
      </main>
      <Footer />

      <style>{`
        @media (max-width: 780px) {
          .feature-included-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </>
  );
}
