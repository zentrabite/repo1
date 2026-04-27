import { useState } from "react";

// ─── ZentraBite Brand Tokens ──────────────────────────────────────────────────
const C = {
  nearBlack: "#0A1628",
  darkNavy:  "#0F1F2D",
  green:     "#00B67A",
  orange:    "#FF6B35",
  cloud:     "#E2E8F0",
  muted:     "#7A8FA6",
  border:    "#1E3448",
  cardBg:    "#132236",
};

const font = {
  heading: "'Outfit', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const paths = {
    dashboard:  "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    customers:  "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    orders:     "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z",
    campaigns:  "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    analytics:  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    menu:       "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    settings:   "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    logout:     "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    bell:       "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
    chevron:    "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={paths[name]} />
    </svg>
  );
};

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: "dashboard"  },
  { id: "customers",  label: "Customers",  icon: "customers"  },
  { id: "orders",     label: "Orders",     icon: "orders"     },
  { id: "campaigns",  label: "Campaigns",  icon: "campaigns"  },
  { id: "analytics",  label: "Analytics",  icon: "analytics"  },
  { id: "menu",       label: "Menu",       icon: "menu"       },
  { id: "settings",   label: "Settings",   icon: "settings"   },
];

// ─── Placeholder Pages ────────────────────────────────────────────────────────
const PlaceholderPage = ({ title, description, color = C.green }) => (
  <div style={{ padding: "40px", fontFamily: font.body }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 12, marginBottom: 8
    }}>
      <div style={{
        width: 4, height: 32, background: color, borderRadius: 2, flexShrink: 0
      }} />
      <h1 style={{
        fontFamily: font.heading, fontSize: 28, fontWeight: 700,
        color: C.cloud, margin: 0
      }}>{title}</h1>
    </div>
    <p style={{ color: C.muted, fontSize: 15, marginBottom: 40, marginLeft: 16 }}>
      {description}
    </p>

    <div style={{
      border: `2px dashed ${C.border}`, borderRadius: 16, padding: "60px 40px",
      textAlign: "center", color: C.muted, fontSize: 14, fontFamily: font.body
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: C.darkNavy, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill={C.muted}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </div>
      <p style={{ margin: 0, fontWeight: 500 }}>
        This page is under construction
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13 }}>
        Content for <strong style={{ color: C.cloud }}>{title}</strong> will be built in the next phase.
      </p>
    </div>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const stats = [
    { label: "Today's Orders",   value: "—",    sub: "Real-time via WebSocket", color: C.green  },
    { label: "Today's Revenue",  value: "—",    sub: "Direct + aggregator",     color: C.green  },
    { label: "Active Customers", value: "—",    sub: "Ordered in last 90 days", color: C.orange },
    { label: "Win-Back Revenue", value: "—",    sub: "SMS campaign recovery",   color: C.orange },
  ];

  return (
    <div style={{ padding: "40px", fontFamily: font.body }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 4, height: 32, background: C.green, borderRadius: 2 }} />
        <h1 style={{
          fontFamily: font.heading, fontSize: 28, fontWeight: 700, color: C.cloud, margin: 0
        }}>Dashboard</h1>
      </div>
      <p style={{ color: C.muted, fontSize: 15, marginBottom: 32, marginLeft: 16 }}>
        Your live operating view — orders, revenue, and win-back performance.
      </p>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: C.cardBg, borderRadius: 12, padding: "24px 20px",
            border: `1px solid ${C.border}`, position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: s.color, borderRadius: "12px 12px 0 0"
            }} />
            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {s.label}
            </p>
            <p style={{
              fontFamily: font.mono, fontSize: 32, fontWeight: 700,
              color: C.cloud, margin: "0 0 6px"
            }}>{s.value}</p>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column lower section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Recent Orders placeholder */}
        <div style={{
          background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
              Recent Orders
            </span>
            <span style={{
              background: C.green + "22", color: C.green,
              fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500
            }}>Live</span>
          </div>
          <div style={{ padding: "20px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            Orders will appear here in real time once Supabase Realtime is connected.
          </div>
        </div>

        {/* Win-Back ROI panel */}
        <div style={{
          background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${C.border}`
          }}>
            <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
              Win-Back Engine
            </span>
          </div>
          <div style={{ padding: "20px" }}>
            {[
              { label: "SMS Sent",           value: "—" },
              { label: "Customers Recovered", value: "—" },
              { label: "Revenue Generated",   value: "—" },
              { label: "Conversion Rate",     value: "—" },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < 3 ? `1px solid ${C.border}` : "none"
              }}>
                <span style={{ color: C.muted, fontSize: 13 }}>{r.label}</span>
                <span style={{
                  fontFamily: font.mono, color: C.cloud, fontSize: 13, fontWeight: 600
                }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-day chart placeholder */}
      <div style={{
        marginTop: 16, background: C.cardBg, borderRadius: 12,
        border: `1px solid ${C.border}`, overflow: "hidden"
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontFamily: font.heading, fontWeight: 600, color: C.cloud, fontSize: 15 }}>
            7-Day Revenue
          </span>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <span style={{ color: C.green }}>● Direct</span>
            <span style={{ color: C.orange }}>● Aggregator</span>
          </div>
        </div>
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
          {["M","T","W","T","F","S","S"].map((day, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                background: C.border, borderRadius: 4,
                height: `${30 + Math.random() * 60}px`,
                marginBottom: 6, position: "relative"
              }}>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: C.green + "55", borderRadius: 4,
                  height: `${50 + Math.random() * 50}%`
                }} />
              </div>
              <span style={{ color: C.muted, fontSize: 11 }}>{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Page Router ──────────────────────────────────────────────────────────────
const PageContent = ({ active }) => {
  switch (active) {
    case "dashboard":  return <DashboardPage />;
    case "customers":  return <PlaceholderPage title="Customers" description="Full CRM — search, segment, and view every customer's profile and order history." />;
    case "orders":     return <PlaceholderPage title="Orders" description="Real-time Kanban board (New → Preparing → Ready → Delivered) plus historical list view." color={C.orange} />;
    case "campaigns":  return <PlaceholderPage title="Campaigns" description="Win-Back Engine, birthday SMS, review request automation, and manual blasts." color={C.orange} />;
    case "analytics":  return <PlaceholderPage title="Analytics" description="Revenue trends, customer LTV, channel performance, and win-back ROI over time." />;
    case "menu":       return <PlaceholderPage title="Menu" description="Drag-to-reorder categories, toggle availability, upload images, and manage modifiers." />;
    case "settings":   return <PlaceholderPage title="Settings" description="Business profile, SMS credits, Stripe Connect, team members, and integrations." color={C.muted} />;
    default:           return null;
  }
};

// ─── Main Shell ───────────────────────────────────────────────────────────────
export default function ZentraBiteDashboard() {
  const [active, setActive] = useState("dashboard");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.nearBlack}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.nearBlack}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      <div style={{
        display: "flex", height: "100vh", background: C.nearBlack,
        fontFamily: font.body, color: C.cloud, overflow: "hidden"
      }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0, background: C.darkNavy,
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", height: "100vh"
        }}>

          {/* Logo */}
          <div style={{
            padding: "24px 20px 20px",
            borderBottom: `1px solid ${C.border}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${C.green}, #007A54)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: font.heading, fontWeight: 800, fontSize: 18, color: "#fff"
              }}>Z</div>
              <div>
                <div style={{
                  fontFamily: font.heading, fontWeight: 700, fontSize: 16, color: C.cloud,
                  lineHeight: 1.1
                }}>ZentraBite</div>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Merchant Portal</div>
              </div>
            </div>
          </div>

          {/* Business badge */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{
              background: C.nearBlack, borderRadius: 8, padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer"
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 6,
                background: C.orange + "33",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.orange
              }}>🍔</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.cloud, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Your Restaurant
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>Active · Free trial</div>
              </div>
              <Icon name="chevron" size={14} color={C.muted} />
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 8px", fontWeight: 600 }}>
              Main Menu
            </div>
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: isActive ? C.green + "18" : "transparent",
                    border: isActive ? `1px solid ${C.green}33` : "1px solid transparent",
                    color: isActive ? C.green : C.muted,
                    cursor: "pointer", textAlign: "left",
                    fontSize: 14, fontWeight: isActive ? 600 : 400,
                    marginBottom: 2, transition: "all 0.15s ease",
                    fontFamily: font.body,
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.border + "66"; e.currentTarget.style.color = C.cloud; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
                >
                  <Icon name={item.icon} size={18} color={isActive ? C.green : "currentColor"} />
                  {item.label}
                  {item.id === "orders" && (
                    <span style={{
                      marginLeft: "auto", background: C.orange, color: "#fff",
                      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10
                    }}>3</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div style={{ padding: "12px", borderTop: `1px solid ${C.border}` }}>
            <div style={{
              background: C.green + "15", borderRadius: 8, padding: "12px",
              marginBottom: 8, border: `1px solid ${C.green}33`
            }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 4 }}>
                SMS Credits
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  flex: 1, height: 4, background: C.border, borderRadius: 2, marginRight: 8
                }}>
                  <div style={{ width: "60%", height: "100%", background: C.green, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: font.mono }}>600 left</span>
              </div>
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 12px", borderRadius: 8,
              background: "transparent", border: "none",
              color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: font.body
            }}>
              <Icon name="logout" size={16} color={C.muted} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* Top bar */}
          <header style={{
            height: 60, flexShrink: 0,
            background: C.darkNavy, borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center",
            padding: "0 24px", gap: 16
          }}>
            {/* Breadcrumb */}
            <div style={{ flex: 1 }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Your Restaurant</span>
              <span style={{ color: C.border, margin: "0 8px" }}>/</span>
              <span style={{
                color: C.cloud, fontSize: 13, fontWeight: 600,
                fontFamily: font.heading, textTransform: "capitalize"
              }}>{active}</span>
            </div>

            {/* Right-side controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Notification bell */}
              <button style={{
                position: "relative", background: "transparent", border: "none",
                color: C.muted, cursor: "pointer", padding: 6, borderRadius: 8
              }}>
                <Icon name="bell" size={20} color={C.muted} />
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 8, height: 8, borderRadius: "50%", background: C.orange,
                  border: `2px solid ${C.darkNavy}`
                }} />
              </button>

              {/* Divider */}
              <div style={{ width: 1, height: 24, background: C.border }} />

              {/* User avatar */}
              <div
                style={{ position: "relative", cursor: "pointer" }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 8,
                  background: userMenuOpen ? C.border : "transparent",
                  border: `1px solid ${userMenuOpen ? C.border : "transparent"}`,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.green}, #007A54)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff"
                  }}>L</div>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.cloud }}>Liam</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Owner</div>
                  </div>
                  <Icon name="chevron" size={14} color={C.muted} />
                </div>

                {userMenuOpen && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    background: C.darkNavy, border: `1px solid ${C.border}`,
                    borderRadius: 10, minWidth: 180, zIndex: 100,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                  }}>
                    {["Account Settings", "Billing & Plan", "Help & Docs"].map((item, i) => (
                      <div key={i} style={{
                        padding: "10px 14px", fontSize: 13, color: C.muted, cursor: "pointer",
                        borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
                      }}>{item}</div>
                    ))}
                    <div style={{
                      padding: "10px 14px", fontSize: 13, color: "#FF4757", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8
                    }}>
                      <Icon name="logout" size={14} color="#FF4757" />
                      Sign out
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: "auto" }}>
            <PageContent active={active} />
          </main>
        </div>
      </div>
    </>
  );
}
