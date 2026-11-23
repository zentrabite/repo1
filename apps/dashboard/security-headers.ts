// Security headers on every response from the CRM, each shop's website and
// its ordering page (next.config.ts). Vercel already sends
// Strict-Transport-Security. Added 23 Nov 2026, the plan's "Security headers".
//
//   X-Content-Type-Options  browsers don't guess a file's type
//   Referrer-Policy         other sites see only our address, never the page
//                           (order and unsubscribe links carry codes)
//   X-Frame-Options and     no other site can show our pages in a frame, so
//   frame-ancestors         nobody can trick a click on a hidden CRM button.
//                           Our own frames still work (the docket prints from
//                           one)
//   base-uri, object-src    no <base> tag from elsewhere and no plugins
//   Permissions-Policy      no camera, microphone or location (nothing uses
//                           them, and a file picker's camera is unaffected),
//                           and no ad-interest topics
//
// The CSP is only these three rules, not a script allow list, because Next's
// own inline scripts would need a nonce on every page.

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];
