import Link from "next/link";
import { Logo } from "./logo";
import { LOGIN_URL } from "../../lib/config";

export function Footer() {
  const cols = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Demo", href: "/demo" },
        { label: "Storefronts", href: "#showcase" },
        { label: "Winback engine", href: "/features/winback" },
        { label: "Delivery routing", href: "#features" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Contact", href: "mailto:hello@zentrabite.com.au" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Log in", href: LOGIN_URL },
        { label: "Start 1-month free trial", href: "/contact" },
        { label: "Book a demo", href: "mailto:hello@zentrabite.com.au?subject=Demo" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Acceptable use", href: "/acceptable-use" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: "1px solid var(--mist-9)", paddingTop: 56, paddingBottom: 32 }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr repeat(4, 1fr)",
            gap: 48,
          }}
          className="footer-grid"
        >
          <div>
            <Logo />
            <p style={{ color: "var(--steel)", fontSize: 14, lineHeight: 1.6, marginTop: 16, maxWidth: 280 }}>
              The all-in-one restaurant platform. Own your customers. Own your margins.
            </p>
            <div style={{ color: "var(--steel)", fontSize: 13, marginTop: 16 }}>
              Built in Adelaide · Used around Australia
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--cloud)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </div>
              <ul style={{ listStyle: "none", display: "grid", gap: 10 }}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      style={{ color: "var(--steel)", fontSize: 14, transition: "color 0.15s" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--mist-9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 13,
            color: "var(--steel)",
          }}
        >
          <div>© {new Date().getFullYear()} ZentraBite. All rights reserved.</div>
          <div>ABN coming soon · GST registered · Made with ❤️ for restaurants</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}


