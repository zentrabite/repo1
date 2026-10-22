// ─── Restaurant website ─────────────────────────────────────────────────────
// Public at https://<subdomain>.zentrabite.com (proxy.ts rewrites "/" here)
// and at /site/<subdomain> on the CRM host for previews.
//
// Until the site is published, the public sees a short holding page. The
// owner, their team and super admins see the full site with a preview bar.

/* eslint-disable @next/next/no-img-element -- photos come from Unsplash and Supabase, outside next/image's allow list */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import { loadSite, type SiteData } from "@/lib/site";
import { requireBusiness } from "@/lib/request-business";
import { siteUrl, tenantFromHost } from "@/lib/tenant";
import "./site.css";

export const dynamic = "force-dynamic";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage", display: "swap" });
const fraunces  = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-fraunces", display: "swap" });

type Props = { params: Promise<{ subdomain: string }> };

function initials(name: string): string {
  return name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";
}

const money = (n: number) => `$${n.toFixed(2)}`;

async function canPreview(site: SiteData): Promise<boolean> {
  try {
    const auth = await requireBusiness(site.id);
    return auth.ok;
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  const site = await loadSite(subdomain);
  if (!site) return { title: "Not found" };
  const title = site.kicker ? `${site.name} · ${site.kicker}` : site.name;
  const description = site.tagline ?? site.about?.slice(0, 160) ?? `Order online from ${site.name}.`;
  return {
    title,
    description,
    alternates: { canonical: siteUrl(site.subdomain) },
    robots: site.published ? undefined : { index: false, follow: false },
    icons: site.logoUrl ? { icon: site.logoUrl, apple: site.logoUrl } : undefined,
    openGraph: { title, description, url: siteUrl(site.subdomain), siteName: site.name, images: site.photos[0] ? [{ url: site.photos[0].url }] : undefined, type: "website" },
  };
}

export default async function RestaurantSite({ params }: Props) {
  const { subdomain } = await params;
  const site = await loadSite(subdomain);
  if (!site) notFound();

  const host = (await headers()).get("host");
  const onOwnHost = tenantFromHost(host) === site.subdomain;
  const orderHref = onOwnHost ? "/order" : `/store/${site.subdomain}`;
  const preview = !site.published && await canPreview(site);

  const style = { "--a": site.accent, "--aT": site.accentText } as React.CSSProperties;
  const rootClass = `zsite zs-look-${site.look} ${bricolage.variable} ${fraunces.variable}`;
  const phoneHref = site.phone ? `tel:${site.phone.replace(/[^\d+]/g, "")}` : null;

  const Brand = (
    <a href="#top" className="zs-brand">
      {site.logoUrl
        ? <span className="zs-mono zs-logo"><img src={site.logoUrl} alt="" /></span>
        : <span className="zs-mono">{initials(site.name)}</span>}
      <span>{site.name}</span>
    </a>
  );

  // ── Not published: holding page for the public ───────────────────────────
  if (!site.published && !preview) {
    return (
      <div className={rootClass} style={style}>
        <main className="zs-soon">
          <div>
            {site.logoUrl
              ? <span className="zs-mono zs-logo"><img src={site.logoUrl} alt="" /></span>
              : <span className="zs-mono">{initials(site.name)}</span>}
            <h1 className="zs-disp">{site.name}</h1>
            <p>Our new website is on its way.</p>
            <div className="zs-cta">
              {site.hasMenu && <a className="zs-btn" href={orderHref}>{site.takingOrders ? "Order online" : "See the menu"}</a>}
              {phoneHref && <a className="zs-btn zs-outline" href={phoneHref}>Call {site.phone}</a>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const mainCta = site.hasMenu
    ? <a className="zs-btn" href={orderHref}>{site.takingOrders ? "Order online" : "See the menu"}</a>
    : phoneHref ? <a className="zs-btn" href={phoneHref}>Call us</a> : null;
  const facts = [site.openNow, site.phone].filter(Boolean) as string[];
  const gallery = site.photos.length >= 3 ? site.photos.slice(2, 5) : [];
  if (gallery.length && gallery.length < 3) gallery.push(site.photos[0]!);

  return (
    <div className={rootClass} style={style} id="top">
      {preview && <div className="zs-preview">Preview. This site isn&apos;t public yet. Publish it from onboarding when the owner is happy.</div>}

      <section className="zs-hero">
        <div className="zs-hero-bg">{site.photos[0] && <img src={site.photos[0].url} alt={site.photos[0].alt} fetchPriority="high" />}</div>
        <nav className="zs-in zs-nav" aria-label="Main">
          {Brand}
          <div className="zs-links">
            {site.hasMenu && <a href="#menu">Menu</a>}
            {site.about && <a href="#story">Our story</a>}
            {site.rewards && <a href="#rewards">Rewards</a>}
            <a href="#visit">Visit</a>
          </div>
          {site.hasMenu && <a className="zs-btn" href={orderHref}>{site.takingOrders ? "Order now" : "Menu"}</a>}
        </nav>
        <div className="zs-in zs-hero-body">
          {site.kicker && <p className="zs-kicker">{site.kicker}</p>}
          <h1 className="zs-disp">{site.name}</h1>
          {site.tagline && <p className="zs-tag">{site.tagline}</p>}
          <div className="zs-cta">
            {mainCta}
            {site.hasMenu && <a className="zs-btn zs-glass" href="#menu">View menu</a>}
            {site.bookingUrl && <a className="zs-btn zs-glass" href={site.bookingUrl} rel="noopener" target="_blank">Book a table</a>}
          </div>
          {facts.length > 0 && <ul className="zs-facts">{facts.map(f => <li key={f}>{f}</li>)}</ul>}
        </div>
      </section>

      {site.offerText && <div className="zs-offer"><div className="zs-in">{site.offerText}</div></div>}

      {site.menu.length > 0 && (
        <section className="zs-in zs-sec" id="menu">
          <div className="zs-head"><div><p className="zs-kicker">Menu</p><h2 className="zs-disp">From the menu</h2></div></div>
          <ol className="zs-list">
            {site.menu.map(m => (
              <li key={m.id}>
                <div className="zs-li-top"><h3>{m.name}</h3><span className="zs-dots" /><span className="zs-price">{money(m.price)}</span></div>
                <p>{m.description ?? ""}</p>
                {site.takingOrders && <a className="zs-add" href={`${orderHref}?add=${encodeURIComponent(m.id)}`} aria-label={`Add ${m.name} to your order`}>+</a>}
              </li>
            ))}
          </ol>
          <a className="zs-btn zs-outline" href={orderHref}>See the full menu</a>
        </section>
      )}

      {site.about && (
        <section className="zs-about" id="story">
          <div className="zs-about-img">{site.photos[1] && <img src={site.photos[1].url} alt={site.photos[1].alt} loading="lazy" />}</div>
          <div className="zs-about-copy">
            <p className="zs-kicker">Our story</p>
            <h2 className="zs-disp">About {site.name}</h2>
            <p>{site.about}</p>
          </div>
        </section>
      )}

      {gallery.length === 3 && (
        <div className="zs-in zs-gallery">
          {gallery.map((p, i) => <figure key={`${p.url}-${i}`}><img src={p.url} alt={p.alt} loading="lazy" /></figure>)}
        </div>
      )}

      {site.rewards && (
        <section className="zs-rewards" id="rewards">
          <div className="zs-in">
            <p className="zs-kicker" style={{ color: "inherit", opacity: 0.8 }}>Rewards</p>
            <h2 className="zs-disp">Earn points every time you order here</h2>
            <p>Order with your phone number and points are added automatically. Swap them for rewards from {site.name}.</p>
            <div className="zs-pts"><span>{site.rewards.rate} points per $1</span></div>
            {site.hasMenu && site.takingOrders && <a className="zs-btn zs-inv" href={orderHref}>Start an order</a>}
          </div>
        </section>
      )}

      <section className="zs-in zs-sec zs-visit" id="visit">
        <div>
          <h3>Hours</h3>
          {site.hours.length
            ? <dl className="zs-hours">{site.hours.map(h => <div key={h.label} style={{ display: "contents" }}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}</dl>
            : <p style={{ color: "var(--smuted)" }}>Call us for today&apos;s hours.</p>}
        </div>
        {site.address && (
          <div>
            <h3>Find us</h3>
            <p className="zs-big">{site.address}</p>
            {site.mapsUrl && <a className="zs-link" href={site.mapsUrl} target="_blank" rel="noopener">Get directions</a>}
          </div>
        )}
        {site.phone && (
          <div>
            <h3>Call</h3>
            <p className="zs-big"><a href={phoneHref!}>{site.phone}</a></p>
            {site.hasMenu && <p style={{ color: "var(--smuted)" }}>{site.takingOrders ? "Or order online for pickup." : "Call ahead to order."}</p>}
          </div>
        )}
      </section>

      <footer className="zs-foot">
        <div className="zs-in">
          <span><b>{site.name}</b> · © {new Date().getFullYear()}</span>
          {site.social.length > 0 && <nav aria-label="Social">{site.social.map(s => <a key={s.label} className="zs-link" href={s.url} target="_blank" rel="noopener">{s.label}</a>)}</nav>}
          <span>Online ordering by ZentraBite</span>
        </div>
      </footer>

      {(site.hasMenu || phoneHref) && (
        <div className="zs-sticky">
          {site.hasMenu && site.takingOrders
            ? <a className="zs-btn" href={orderHref}>Order online</a>
            : phoneHref ? <a className="zs-btn" href={phoneHref}>Call to order</a> : <a className="zs-btn" href={orderHref}>See the menu</a>}
        </div>
      )}
    </div>
  );
}
