import { Expandable } from "./expandable";

const showcases = [
  {
    eyebrow: "Storefronts",
    title: "A branded ordering page that actually feels yours.",
    body:
      "Drop in your menu, upload photos, set your delivery radius, and publish a storefront at zentrabite.com/store/your-name — or point your own domain at it. Customers order, pay with card or Apple Pay, and the ticket lands on your screen seconds later.",
    bullets: [
      "Menu builder with photo upload, categories, modifiers",
      "Mobile-first checkout with Apple Pay & Google Pay",
      "Delivery radius auto-calculated from postcode",
      "Custom subdomain or your own zentrabite.com.au URL",
    ],
    side: "storefront",
  },
  {
    eyebrow: "Operations",
    title: "Live orders. Smart routing. Real control.",
    body:
      "New orders beep the moment they arrive and auto-move through New → Cooking → Ready → Out for delivery. Delivery jobs auto-route to your cheapest option right now — your own driver, a freelance courier, Uber Direct, or DoorDash Drive.",
    bullets: [
      "Realtime order board — POS and dashboard stay in sync",
      "Auto-dispatch to cheapest available delivery partner",
      "Owner gets SMS + email the moment a ticket hits",
      "Refunds and disputes resolved in one click",
    ],
    side: "ops",
    reverse: true,
  },
  {
    eyebrow: "Growth",
    title: "Turn one visit into ten with built-in CRM.",
    body:
      "Every buyer auto-saves as a customer. The Winback engine awards points on every order, tiers customers by spend, and sends birthday deals automatically. It fires winback SMS the moment someone goes quiet.",
    bullets: [
      "Winback engine tiers: Bronze, Silver, Gold, VIP",
      "Points redeem at checkout — no extra app required",
      "Abandoned-cart and win-back automations out of the box",
      "Segment by lifetime value, channel, or last-order date",
    ],
    side: "growth",
  },
];

function SideVisual({ kind }: { kind: string }) {
  if (kind === "storefront") {
    return (
      <div
        className="glass"
        style={{ padding: 22, aspectRatio: "4 / 5", maxWidth: 420, width: "100%" }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0,182,122,0.22), rgba(255,107,53,0.12))",
            borderRadius: 14,
            padding: 24,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--cloud)", fontFamily: "var(--font-mono)", opacity: 0.8 }}>
            zentrabite.com/store/rossi-kitchen
          </div>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 28, color: "var(--cloud)" }}>
            Rossi's Kitchen
          </div>
          <div style={{ color: "var(--steel)", fontSize: 13 }}>Wood-fired pizza · Order in 15 min</div>
          <div style={{ height: 1, background: "var(--mist-9)" }} />
          {[
            { name: "Margherita", price: "$19" },
            { name: "Pepperoni", price: "$22" },
            { name: "Funghi", price: "$21" },
            { name: "Quattro Formaggi", price: "$24" },
          ].map((i) => (
            <div
              key={i.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "rgba(15,25,42,0.5)",
                border: "1px solid var(--mist-6)",
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--cloud)" }}>{i.name}</span>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>{i.price}</span>
            </div>
          ))}
          <button className="btn-primary" style={{ marginTop: "auto", justifyContent: "center" }}>
            View cart · $62
          </button>
        </div>
      </div>
    );
  }

  if (kind === "ops") {
    return (
      <div className="glass" style={{ padding: 20, maxWidth: 420, width: "100%" }}>
        {[
          { t: "#1291", name: "Sarah L.", status: "New", statusColor: "var(--green)", route: "Own driver · 2.1km" },
          { t: "#1290", name: "Marco D.", status: "Cooking", statusColor: "var(--orange)", route: "Uber Direct · $6.40" },
          { t: "#1289", name: "Aisha R.", status: "Out for delivery", statusColor: "var(--steel)", route: "Own driver · ETA 8m" },
          { t: "#1288", name: "Tom P.", status: "Delivered", statusColor: "var(--steel)", route: "DoorDash · $5.80" },
        ].map((o) => (
          <div
            key={o.t}
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--navy-40)",
              border: "1px solid var(--mist-6)",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--steel)" }}>{o.t}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: o.statusColor,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--mist-12)",
                }}
              >
                {o.status}
              </div>
            </div>
            <div style={{ color: "var(--cloud)", fontWeight: 600, fontSize: 14 }}>{o.name}</div>
            <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 4 }}>{o.route}</div>
          </div>
        ))}
      </div>
    );
  }

  // growth
  return (
    <div className="glass" style={{ padding: 28, maxWidth: 420, width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "var(--green-15)",
            border: "1px solid rgba(0,182,122,0.3)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--green)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          ★ Gold tier
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 44, textAlign: "center", color: "var(--cloud)" }}>
        1,240
      </div>
      <div style={{ textAlign: "center", color: "var(--steel)", fontSize: 13, marginBottom: 22 }}>
        points · $12.40 off next order
      </div>
      <div style={{ height: 1, background: "var(--mist-9)", marginBottom: 18 }} />
      {[
        { icon: "🎂", label: "Birthday reward sent", sub: "to Olivia M. · +250 pts bonus" },
        { icon: "📩", label: "Win-back SMS triggered", sub: "23 customers · avg $34 recovered" },
        { icon: "🏆", label: "Tier upgrade", sub: "James K. → Gold tier" },
      ].map((e) => (
        <div key={e.label} style={{ display: "flex", gap: 12, padding: "10px 0", alignItems: "flex-start" }}>
          <div style={{ fontSize: 20 }}>{e.icon}</div>
          <div>
            <div style={{ color: "var(--cloud)", fontSize: 13, fontWeight: 600 }}>{e.label}</div>
            <div style={{ color: "var(--steel)", fontSize: 12, marginTop: 2 }}>{e.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Showcase() {
  return (
    <section id="showcase" className="section" style={{ background: "rgba(28,45,72,0.18)" }}>
      <div className="container" style={{ display: "grid", gap: 96 }}>
        {showcases.map((s) => (
          <div
            key={s.title}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 56,
              alignItems: "center",
            }}
            className={`showcase-row ${s.reverse ? "reverse" : ""}`}
          >
            <div style={{ order: s.reverse ? 2 : 1 }}>
              <div className="eyebrow" style={{ marginBottom: 18 }}>{s.eyebrow}</div>
              <h3
                style={{
                  fontSize: "clamp(26px, 3.2vw, 36px)",
                  marginBottom: 16,
                  color: "var(--cloud)",
                }}
              >
                {s.title}
              </h3>
              <Expandable summary="Show the checklist">
                <p style={{ color: "var(--steel)", fontSize: 15, lineHeight: 1.65, marginBottom: 16, marginTop: 0 }}>
                  {s.body}
                </p>
                <ul style={{ display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 }}>
                  {s.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14.5, color: "var(--cloud)" }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: "var(--green-15)",
                          color: "var(--green)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Expandable>
            </div>
            <div style={{ order: s.reverse ? 1 : 2, display: "flex", justifyContent: "center" }}>
              <SideVisual kind={s.side} />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 820px) {
          .showcase-row { grid-template-columns: 1fr !important; gap: 32px !important; }
          .showcase-row > div { order: unset !important; }
        }
      `}</style>
    </section>
  );
}
