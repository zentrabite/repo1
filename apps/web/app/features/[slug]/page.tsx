import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Nav } from "../../components/nav";
import { Footer } from "../../components/footer";
import { Closing } from "../../components/home/closing";
import { features, getFeature, getRelated } from "../data";
import { DEMO_PATH, VISUALS, previewOf } from "../media";
import { FeatureScreen } from "../feature-screen";

// One page per feature (12 Nov, in the homepage's style). Top to bottom:
// 1. the name, one sentence, Book a call, and "Try the live demo", which
//    opens the demo on this part's screen
// 2. the real app, held on the left on a computer while the overview and
//    "How it works" pass on the right
// 3. what you get and who it's for, on a grey band
// 4. three parts that work well with it, each with its screen, and a link
//    back to every feature
// 5. the navy close and footer, the same as the homepage

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
  // Same as app/not-found.tsx, which is what the page shows next.
  if (!f) return { title: "Page not found", description: "We couldn't find that page. Head to the home page, see the features, try the demo or get in touch." };
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
  const visual = VISUALS[f.slug];

  return (
    <>
      <Nav />
      <main>
        <section className="fp-top" aria-labelledby="fp-title">
          <div className="wrap fp-top-in">
            <h1 id="fp-title" className="fp-h1">
              {f.title}
            </h1>
            <p className="fp-lead">{f.tagline}</p>
            <div className="hm-actions fp-actions">
              <Link href="/contact" className="btn-primary btn-lg">
                Book a call
              </Link>
              <Link href={DEMO_PATH[f.slug] ?? "/demo/live"} className="hm-link">
                Try the live demo
              </Link>
            </div>
          </div>
        </section>

        <section className="fp-how" aria-labelledby="fp-how-title">
          <div className="wrap fp-how-grid">
            {visual && (
              <div className="fp-how-pic">
                <div className="fp-sticky fp-enter">
                  <FeatureScreen visual={visual} priority />
                </div>
              </div>
            )}
            <div className="fp-how-text">
              <div className="fp-overview">
                {f.overview.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <h2 id="fp-how-title" className="hm-h2 fp-h2">
                How it works
              </h2>
              <div className="fp-steps">
                {f.howItWorks.map((s) => (
                  <div key={s.title} className="fp-step">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="fp-get" aria-labelledby="fp-get-title">
          <div className="wrap fp-get-grid">
            <div>
              <h2 id="fp-get-title" className="hm-h2">
                What you get
              </h2>
              <ul className="fp-ticks" data-reveal>
                {f.bullets.map((b, i) => (
                  <li key={b}>
                    <svg data-r style={{ "--i": i } as CSSProperties} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="fp-who">
              <h2 className="fp-h3">Who it&apos;s for</h2>
              <p>{f.whoItsFor}</p>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="fp-rel" aria-labelledby="fp-rel-title">
            <div className="wrap">
              <h2 id="fp-rel-title" className="hm-h2">
                Works well with
              </h2>
              <ul className="fp-rel-list" data-reveal>
                {related.map((r, i) => {
                  const pic = previewOf(r.slug);
                  return (
                    <li key={r.slug}>
                      <Link href={`/features/${r.slug}`} className="fp-rel-row">
                        <span
                          className={`fp-rel-pic${pic?.variant === "phone" ? " phone" : ""}`}
                          data-ui
                          data-r
                          style={{ "--i": i } as CSSProperties}
                          aria-hidden="true"
                        >
                          {pic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={pic.src} alt="" width={560} height={350} loading="lazy" decoding="async" />
                          ) : (
                            <span className="fp-rel-chat">Who hasn&apos;t been in for a month?</span>
                          )}
                        </span>
                        <span className="fp-rel-name">{r.title}</span>
                        <span className="fp-rel-line">{r.tagline}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="fp-all">
                <Link href="/features" className="hm-link">
                  See every feature
                </Link>
              </p>
            </div>
          </section>
        )}

        <Closing />
      </main>
      <Footer />
    </>
  );
}
