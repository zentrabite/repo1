import { Expandable } from "./expandable";

const CATEGORIES = [
  {
    icon: "🍽️",
    title: "Food & Hospitality",
    tagline: "Orders, kitchen, delivery, loyalty — all in one.",
    types: ["Restaurants", "Cafes", "Takeaway", "Ghost kitchens", "Food trucks", "Bakeries", "Dessert shops"],
    whatChanges: "Menu builder, live orders, kitchen display, delivery routing.",
    whatStays: "CRM, Zentra Rewards, loyalty, AI reports, stock intelligence.",
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
    whatStays: "CRM, churn detection, Zentra Rewards, loyalty, daily AI report.",
    outcome: "Spot at-risk members before they leave. Drive referrals and renewals.",
  },
  {
    icon: "🛍️",
    title: "Retail & E-commerce",
    tagline: "Every SKU, every customer, one dashboard.",
    types: ["Small retail", "Clothing", "Sneakers", "Vape shops", "Convenience stores", "Etsy & Shopify sellers"],
    whatChanges: "Products + SKUs, stock by variant, online store + in-store POS.",
    whatStays: "CRM, segmentation, loyalty, Zentra Rewards, inventory AI, reporting.",
    outcome: "Reorder on AI, clear dead stock, turn one-time buyers into repeat customers.",
  },
  {
    icon: "🔧",
    title: "Service-Based Businesses",
    tagline: "Jobs, quotes, invoices, follow-ups — handled.",
    types: ["Car detailers", "Mechanics", "Auto service", "Cleaners", "Mobile services", "Electricians & plumbers"],
    whatChanges: "Jobs and quotes replace orders. Scheduling, invoicing, job status.",
    whatStays: "CRM, review requests, Zentra Rewards, reporting, automations.",
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
            For any business
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 10 }}>
            Works for restaurants — and everything like them.
          </h2>
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

              <Expandable summary="Show examples & outcome">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
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
                    padding: 12,
                    borderRadius: 10,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-6)",
                    display: "grid",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Row label="Stays the same" value={c.whatStays} />
                  <Row label="Adapts" value={c.whatChanges} />
                </div>
                <div style={{ fontSize: 13, color: "var(--cloud)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, marginRight: 6 }}>→</span>
                  {c.outcome}
                </div>
              </Expandable>
            </div>
          ))}
        </div>
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
