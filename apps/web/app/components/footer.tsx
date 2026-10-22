import Link from "next/link";
import { Logo } from "./logo";
import { ThemeChoicePicker } from "./theme-toggle";
import { LOGIN_URL } from "../../lib/config";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "What's inside", href: "/#features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Email us", href: "mailto:hello@zentrabite.com" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: LOGIN_URL },
      { label: "Start 1-month free trial", href: "/contact" },
      { label: "Book a demo", href: "mailto:hello@zentrabite.com?subject=Demo" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="muted" style={{ fontSize: 15, marginTop: 16, maxWidth: 300 }}>
              Website, online ordering, customer list and rewards for small businesses.
            </p>
            <p className="small" style={{ marginTop: 12 }}>Built in Adelaide</p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h2 className="footer-title">{col.title}</h2>
              <ul className="footer-links">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-base">
          <div>© {new Date().getFullYear()} ZentraBite</div>
          <ThemeChoicePicker />
        </div>
      </div>
    </footer>
  );
}
