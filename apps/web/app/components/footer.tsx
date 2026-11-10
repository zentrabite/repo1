import Link from "next/link";
import { ThemeChoicePicker } from "./theme-toggle";
import { Assistant } from "./assistant";
import { LOGIN_URL } from "../../lib/config";

// The footer on every marketing page. A navy close in both themes: a few
// links, where we are and how to reach us, then the name at full width.
// It also brings the floating website assistant, which comes last in the
// tab order.

const LINKS = [
  { label: "Tour", href: "/#tour" },
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Book a call", href: "/contact" },
];

export function Footer() {
  return (
    <>
      <footer className="site-footer on-navy" data-nav-tone="navy">
        <div className="wrap">
          <div className="ft-top">
            <nav aria-label="Footer">
              <ul className="ft-links">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
                <li>
                  <a href={LOGIN_URL}>Log in</a>
                </li>
              </ul>
            </nav>
            <div className="ft-contact">
              <p>Built in Adelaide</p>
              <p>
                <a href="mailto:hello@zentrabite.com">hello@zentrabite.com</a>
              </p>
            </div>
          </div>

          <div className="ft-mark" data-reveal aria-hidden="true">
            <span className="ft-mark-line" data-r>
              <span className="logo-zentra">Zentra</span>
              <span className="logo-bite">Bite</span>
            </span>
          </div>

          <div className="ft-base">
            <p>© {new Date().getFullYear()} ZentraBite</p>
            <ThemeChoicePicker />
          </div>
        </div>
      </footer>
      <Assistant />
    </>
  );
}
