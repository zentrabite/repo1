import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";

// Shown for any address on zentrabite.com that doesn't exist, and when a page
// calls notFound() (for example /features/<a slug we don't have>).
export const metadata: Metadata = {
  title: "Page not found",
  description: "We couldn't find that page. Head to the home page, see the features, try the demo or get in touch.",
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="page-top not-found">
        <div className="container narrow">
          <span className="label">Error 404</span>
          <h1 className="h-page">We can&apos;t find that page.</h1>
          <p className="lead">
            The link might be old, or there might be a typo in the address. Try one of these instead.
          </p>
          <nav className="btn-row" aria-label="Where to next">
            <Link href="/" className="btn-primary btn-lg">
              Go to the home page
            </Link>
            <Link href="/features" className="btn-secondary btn-lg">
              Features
            </Link>
            <Link href="/demo" className="btn-secondary btn-lg">
              Try the demo
            </Link>
            <Link href="/contact" className="btn-secondary btn-lg">
              Contact us
            </Link>
          </nav>
          <p className="muted not-found-note">
            Still stuck? Email{" "}
            <a href="mailto:hello@zentrabite.com" className="text-link">
              hello@zentrabite.com
            </a>{" "}
            and we&apos;ll point you the right way.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
