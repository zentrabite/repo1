import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "../../components/nav";
import { Footer } from "../../components/footer";
import { CTABanner } from "../../components/cta-banner";
import { features, getFeature, getRelated } from "../data";
import { Icon } from "../../components/zb-icon";

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
  if (!f) return { title: "Feature not found" };
  return {
    title: f.title,
    description: f.tagline,
    alternates: { canonical: `/features/${slug}` },
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
        <section className="page-top">
          <div className="container narrow">
            <Link href="/#features" className="back-link">
              <span aria-hidden>←</span> Everything that&apos;s inside
            </Link>
            <span className="label">{f.eyebrow}</span>
            <div className="feature-hero">
              <div className="feature-icon" aria-hidden>
                <Icon name={f.icon} size={34} />
              </div>
              <h1 className="h-page">{f.title}</h1>
            </div>
            <p className="lead">{f.tagline}</p>
            <div className="prose" style={{ marginTop: 32 }}>
              {f.overview.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container cols-2">
            <h2 className="h-section">How it works</h2>
            <ol className="steps">
              {f.howItWorks.map((s) => (
                <li key={s.title}>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section alt">
          <div className="container cols-2">
            <div>
              <h2 className="h-section" style={{ marginBottom: 24 }}>
                What you get
              </h2>
              <ul className="tick-list" style={{ fontSize: 17 }}>
                {f.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="aside-box" style={{ alignSelf: "start" }}>
              <h3>Who it&apos;s for</h3>
              <p>{f.whoItsFor}</p>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="section">
            <div className="container">
              <h2 className="h-section" style={{ marginBottom: 28 }}>
                Works well with
              </h2>
              <div className="cols-3" style={{ gap: 16 }}>
                {related.map((r) => (
                  <Link key={r.slug} href={`/features/${r.slug}`} className="link-card">
                    <Icon name={r.icon} size={24} />
                    <div className="h-card" style={{ marginTop: 14 }}>
                      {r.title}
                    </div>
                    <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
                      {r.tagline}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
