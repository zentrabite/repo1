const CATEGORIES = [
  {
    icon: "🍽️",
    title: "Food & Hospitality",
    tagline: "Orders, kitchen, delivery, loyalty — all in one.",
    types: ["Restaurants", "Cafes", "Takeaway", "Ghost kitchens", "Food trucks", "Bakeries", "Dessert shops"],
    whatChanges: "Menu builder, live orders, kitchen display, delivery routing.",
    whatStays: "CRM, winback, loyalty, AI reports, stock intelligence.",
    outcome: "Cut aggregator commissions, win back lapsed regulars, slash food waste.",
  },
  {
    icon: "✂️",
    title: "Personal Services",
    tagline: "Chairs, rooms, and regulars — fully booked.",
    types: ["Barbers", "Hair salons", "Beauty salons", "Nail techs", "Massage therapists", "Personal trainers"],
    whatChanges: "Orders become bookings, products become services and packages.",
    whatStays: "CRM, rebooking automations, loyalty, reviews, AI reports.",
    outcome: "Fill empty slots, rebook lapsed clients, sell packages on autopilot.",
  },
  {
    icon: "💪",
    title: "Fitness & Health",
    tagline: "Memberships, classes, and retention — on rails.",
    types: ["Gyms", "Fitness studios", "Yoga studios", "Pilates", "Sports coaching"],
    whatChanges: "Bookings for classes, memberships, session packs, attendance tracking.",
    whatStays: "CRM, churn detection, winback, loyalty, daily AI report.",
    outcome: "Spot at-risk members before they leave. Drive referrals and renewals.",
  },
  {
    icon: "🛍️",
    title: "Retail & E-commerce",
    tagline: "Every SKU, every customer, one dashboard.",
    types: ["Small retail", "Clothing", "Sneakers", "Vape shops", "Convenience stores", "Etsy & Shopify sellers"],
    whatChanges: "Products + SKUs, stock by variant, online store + in-store POS.",
    whatStays: "CRM, segmentation, loyalty, winback, inventory AI, reporting.",
    outcome: "Reorder on AI, clear dead stock, turn one-time buyers into repeat customers.",
  },
  {
    icon: "🔧",
    title: "Service-Based Businesses",
    tagline: "Jobs, quotes, invoices, follow-ups — handled.",
    types: ["Car detailers", "Mechanics", "Auto service", "Cleaners", "Mobile services", "Electricians & plumbers"],
    whatChanges: "Jobs and quotes replace orders. Scheduling, invoicing, job status.",
    whatStays: "CRM, review requests, winback, reporting, automations.",
    outcome: "More repeat jobs, faster invoices, no customer forgotten.",
  },
  {
    icon: "📅",
    title: "Appointment-Based",
    tagline: "Calendars, reminders, and lifetime value.",
    types: ["Consultants", "Photographers", "Tutors", "Coaches", "Therapists", "Real estate agents"],
    whatChanges: "Calendar-first booking, packages, follow-ups, deposits.",
    whatStays: "CRM, lifetime value tracking, re-engagement, AI insights.",
    outcome: "Fewer no-shows, more referrals, predictable monthly revenue.",
  },
];

export function Industries() {
  return (
    <section id="industries" className="section" style={{ paddingTop: 112 }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Not a restaurant? We've got you covered.
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 18 }}>
            One operating system. Any small business.
          </h2>
          <p style={{ fontSize: 17, color: "var(--steel)", lineHeight: 1.6 }}>
            ZentraBite was built for the messy reality of small operators — whether
            you sell plates, cuts, classes, or consultations. The CRM, automations,
            AI reports, and revenue engine stay the same. What changes is the shape
            of your "order" — a booking, a session, a job, or a product.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="glass"
              style={{
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "var(--green-15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {c.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, margin: 0, color: "var(--cloud)" }}>{c.title}</h3>
                  <div style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>{c.tagline}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {c.types.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--navy-40)",
                      border: "1px solid var(--mist-9)",
                      color: "var(--cloud)",
                      fontWeight: 500,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div
                style={{
                  marginTop: 6,
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--navy-40)",
                  border: "1px solid var(--mist-6)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <Row label="What stays the same" value={c.whatStays} />
                <Row label="What adapts" value={c.whatChanges} />
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--cloud)",
                  lineHeight: 1.55,
                  paddingTop: 4,
                  borderTop: "1px dashed var(--mist-9)",
                }}
              >
                <span style={{ color: "var(--green)", fontWeight: 700, marginRight: 6 }}>→</span>
                {c.outcome}
              </div>
            </div>
          ))}
        </div>

        {/* Personal Trainer spotlight */}
        <div
          className="glass"
          style={{
            marginTop: 36,
            padding: 32,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 14, color: "var(--orange)" }}>
              Spotlight · Personal Trainer
            </div>
            <h3 style={{ fontSize: 24, margin: "0 0 14px", color: "var(--cloud)" }}>
              How a solo PT runs their whole business on ZentraBite
            </h3>
            <p style={{ fontSize: 15, color: "var(--steel)", lineHeight: 1.65, marginBottom: 18 }}>
              Sessions, recurring clients, memberships, and packages — all in one
              place. ZentraBite books clients in, sends reminders, tracks their
              progress, and tells you exactly who to re-engage before they churn.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {[
                "Session bookings & package tracking",
                "Recurring clients & memberships",
                "Automated reminders (SMS + email)",
                "Re-engagement flows for inactive clients",
                "Lifetime value tracked per client",
              ].map((b) => (
                <li key={b} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "var(--cloud)" }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: "var(--green-15)",
                      color: "var(--green)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              background: "var(--navy-40)",
              border: "1px solid var(--mist-6)",
              borderRadius: 16,
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              AI insights this week
            </div>
            {[
              { icon: "⚠️", color: "var(--orange)", title: "Client hasn't trained in 14 days", body: "Sarah T. — LTV $1,840. Auto-send re-engagement?" },
              { icon: "📉", color: "var(--orange)", title: "You're losing high-value clients", body: "3 of your top 10 clients haven't rebooked. Review the list." },
              { icon: "💪", color: "var(--green)", title: "6 clients finished their 10-pack", body: "Offer the 20-pack upgrade. Projected +$3,200 this month." },
              { icon: "🎯", color: "var(--green)", title: "Best time to post on Instagram", body: "Tuesday 6:45am — your audience is most active." },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(15,25,42,0.55)",
                  border: "1px solid var(--mist-9)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: 18 }} aria-hidden>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: card.color, marginBottom: 3 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--steel)", lineHeight: 1.5 }}>{card.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            #industries .glass[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "baseline" }}>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--steel)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--cloud)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
