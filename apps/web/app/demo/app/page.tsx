"use client";

/**
 * /demo/app
 *
 * Mobile-framed customer app for Harbour Lane Pizza Co.
 * Reuses the same brand, menu, deals and loyalty data as /demo/merchant
 * so the merchant website, the app, and the Super Admin all share one
 * source of truth — this is the "one platform" story in a single artefact.
 *
 * Desktop: renders a 390×844 phone frame centered on a soft backdrop.
 * Mobile: collapses to fill the viewport.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  brand,
  menu,
  menuByCategory,
  categories,
  featuredDeals,
  loyalty,
  formatAUD,
  type MenuItem,
} from "../merchant/data";

// ---- tiny design tokens (inline, deterministic)
const INK = brand.ink;
const CREAM = brand.cream;
const ORANGE = brand.primary;
const ORANGE_DARK = brand.primaryDark;
const FOREST = brand.accent;
const MUTED = "#6B645A";
const LINE = "#EADFC9";
const TILE = "#FFFFFF";
const RADIUS = 18;
const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Inter, sans-serif";

// ---- types local to this file
type Tab = "home" | "menu" | "cart" | "rewards" | "orders" | "profile";
type CartLine = { id: string; qty: number };
type Tier = typeof loyalty.tiers[number];

// ---- fake customer
const CUSTOMER = {
  name: "Liam",
  points: 742,
  tier: "Silver" as const,
  memberSince: "Aug 2024",
  savedCards: [
    { brand: "Visa", last4: "4821", default: true },
    { brand: "Amex", last4: "3112", default: false },
  ],
  addresses: [
    { label: "Home", line: "12 Windmill St, Millers Point NSW", default: true },
    { label: "Work", line: "Level 4, 88 George St, Sydney NSW", default: false },
  ],
};

const PAST_ORDERS = [
  { id: "o-9912", date: "12 Apr", total: 54.0, items: "Margherita · Carbonara · Tiramisu", status: "Delivered" },
  { id: "o-9883", date: "04 Apr", total: 28.0, items: "Prosciutto & Rocket", status: "Delivered" },
  { id: "o-9841", date: "27 Mar", total: 46.0, items: "Pizza + Pasta + Drink deal", status: "Delivered" },
];

// ---- helpers (non-null guaranteed because loyalty.tiers is non-empty)
function currentTier(points: number): Tier {
  let current: Tier = loyalty.tiers[0] as Tier;
  for (const t of loyalty.tiers) if (points >= t.min) current = t;
  return current;
}
function nextTier(points: number): Tier {
  for (const t of loyalty.tiers) {
    if (points < t.min) return t;
  }
  return loyalty.tiers[loyalty.tiers.length - 1] as Tier;
}

// =====================================================================

export default function CustomerApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [cart, setCart] = useState<CartLine[]>([
    { id: "m01", qty: 1 },
    { id: "m13", qty: 1 },
  ]);
  const [category, setCategory] = useState<string>(categories[0] ?? "Pizza");
  const [activeOrderStage, setActiveOrderStage] = useState<number>(0); // 0..3
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // auto-advance fake active order every 5s (0→1→2→3)
  useEffect(() => {
    if (activeOrderStage >= 3) return;
    const t = setTimeout(() => setActiveOrderStage((s) => Math.min(3, s + 1)), 5000);
    return () => clearTimeout(t);
  }, [activeOrderStage]);

  function addToCart(id: string, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { id, qty }];
    });
    const item = menu.find((m) => m.id === id);
    if (item) showToast(`${item.name} added to cart`);
  }
  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  }
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const cartItems = useMemo(
    () =>
      cart
        .map((l) => {
          const item = menu.find((m) => m.id === l.id);
          return item ? { item, qty: l.qty } : null;
        })
        .filter(Boolean) as { item: MenuItem; qty: number }[],
    [cart]
  );
  const subtotal = cartItems.reduce((s, l) => s + l.item.price * l.qty, 0);
  const delivery = subtotal > 40 ? 0 : 5.9;
  const total = subtotal + delivery;
  const pointsToEarn = Math.floor(total);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div style={pageShell}>
      {/* Desktop backdrop */}
      <div style={desktopInfo}>
        <div style={desktopInfoBadge}>📱 Customer app preview</div>
        <h1 style={desktopTitle}>The {brand.name} app</h1>
        <p style={desktopSub}>
          The same brand, menu, deals and loyalty as the storefront — in your
          customers&apos; pocket. Tap around: this is a working prototype.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/demo/merchant" style={ghostBtn}>← Back to storefront</Link>
          <Link href="/demo/live" style={ghostBtn}>Open merchant CRM →</Link>
          <Link href="/contact" style={primaryBtn}>Get this for my business</Link>
        </div>
      </div>

      {/* Phone frame */}
      <div style={phoneFrame}>
        <div style={phoneNotch} />
        <div style={phoneScreen}>
          <StatusBar />
          <div style={appBody}>
            {tab === "home" && (
              <HomeTab
                points={CUSTOMER.points}
                onBrowse={() => setTab("menu")}
                onOpenItem={(it) => setDetailItem(it)}
                onAddDeal={() => {
                  addToCart("m01", 1);
                  addToCart("m07", 1);
                  addToCart("m16", 1);
                  setTab("cart");
                }}
                activeOrderStage={activeOrderStage}
                onOpenOrder={() => setTab("orders")}
              />
            )}
            {tab === "menu" && (
              <MenuTab
                category={category}
                setCategory={setCategory}
                onOpenItem={(it) => setDetailItem(it)}
                onAdd={(id) => addToCart(id)}
              />
            )}
            {tab === "cart" && (
              <CartTab
                lines={cartItems}
                subtotal={subtotal}
                delivery={delivery}
                total={total}
                pointsToEarn={pointsToEarn}
                updateQty={updateQty}
                onCheckout={() => {
                  setActiveOrderStage(0);
                  setCart([]);
                  setTab("orders");
                  showToast("Order placed · you earned " + pointsToEarn + " pts");
                }}
              />
            )}
            {tab === "rewards" && <RewardsTab points={CUSTOMER.points} />}
            {tab === "orders" && (
              <OrdersTab activeStage={activeOrderStage} onReorder={(ids) => ids.forEach((id) => addToCart(id))} />
            )}
            {tab === "profile" && <ProfileTab />}
          </div>

          <TabBar tab={tab} setTab={setTab} cartCount={cartCount} />

          {/* Item detail sheet */}
          {detailItem && (
            <ItemSheet
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onAdd={(qty) => {
                addToCart(detailItem.id, qty);
                setDetailItem(null);
              }}
            />
          )}
          {toast && <Toast msg={toast} />}
        </div>
      </div>

      <div style={attribution}>
        Powered by{" "}
        <Link href="/" style={{ color: ORANGE, fontWeight: 600 }}>
          ZentraBite
        </Link>
      </div>
    </div>
  );
}

// =====================================================================
// Status bar + tab bar

function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: 600,
        color: INK,
        background: CREAM,
      }}
    >
      <span>9:41</span>
      <span style={{ letterSpacing: 2 }}>•••</span>
      <span>🔋 87%</span>
    </div>
  );
}

function TabBar({
  tab,
  setTab,
  cartCount,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  cartCount: number;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "menu", icon: "🍕", label: "Menu" },
    { id: "cart", icon: "🛒", label: "Cart" },
    { id: "rewards", icon: "⭐", label: "Rewards" },
    { id: "orders", icon: "📦", label: "Orders" },
    { id: "profile", icon: "👤", label: "You" },
  ];
  return (
    <div
      style={{
        borderTop: `1px solid ${LINE}`,
        background: "#FFFFFF",
        padding: "6px 4px 18px",
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
      }}
    >
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            style={{
              background: "transparent",
              border: 0,
              padding: "6px 0",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              position: "relative",
              color: active ? ORANGE : MUTED,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, position: "relative" }}>
              {it.icon}
              {it.id === "cart" && cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    background: ORANGE,
                    color: "#fff",
                    fontSize: 10,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    padding: "0 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {cartCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// =====================================================================
// HOME

function HomeTab({
  points,
  onBrowse,
  onOpenItem,
  onAddDeal,
  activeOrderStage,
  onOpenOrder,
}: {
  points: number;
  onBrowse: () => void;
  onOpenItem: (it: MenuItem) => void;
  onAddDeal: () => void;
  activeOrderStage: number;
  onOpenOrder: () => void;
}) {
  const tier = currentTier(points);
  const next = nextTier(points);
  const progress =
    next.min <= tier.min ? 1 : Math.min(1, (points - tier.min) / (next.min - tier.min));
  const popular = menu.filter((m) => m.popular).slice(0, 4);
  const deal = featuredDeals[0]!;

  return (
    <div style={{ padding: "12px 16px 20px" }}>
      {/* Header: greeting + logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>G&apos;day, {CUSTOMER.name} 👋</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: INK }}>What are we having?</div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: ORANGE,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {brand.logoEmoji}
        </div>
      </div>

      {/* Active order (if any) */}
      {activeOrderStage < 3 && (
        <button
          onClick={onOpenOrder}
          style={{
            width: "100%",
            textAlign: "left",
            border: 0,
            cursor: "pointer",
            background: "linear-gradient(135deg, #FFF4E6, #FFE4C9)",
            borderRadius: RADIUS,
            padding: 14,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28 }}>🛵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE_DARK }}>
              {["Order received", "In the oven", "Out for delivery", "Delivered"][activeOrderStage]}
            </div>
            <div style={{ fontSize: 13, color: INK, fontWeight: 600 }}>Tap to track live →</div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: s <= activeOrderStage ? ORANGE : "#EFD8B8",
                }}
              />
            ))}
          </div>
        </button>
      )}

      {/* Loyalty card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${FOREST}, #1A352B)`,
          borderRadius: RADIUS,
          padding: 16,
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700, letterSpacing: 1 }}>
            {loyalty.name.toUpperCase()} · {tier.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>⭐ {points} pts</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: ORANGE,
                borderRadius: 3,
              }}
            />
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>
            {next.min > tier.min
              ? `${next.min - points} pts to ${next.name}`
              : "You're at the top tier — nice."}
          </div>
        </div>
      </div>

      {/* Featured deal */}
      <SectionHeader title="This week's deal" />
      <div
        style={{
          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
          borderRadius: RADIUS,
          padding: 16,
          color: "#fff",
          marginBottom: 18,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: 1 }}>
          SAVE {formatAUD(deal.saves)}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{deal.title}</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{deal.subtitle}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatAUD(deal.price)}</div>
          <button
            onClick={onAddDeal}
            style={{
              background: "#fff",
              color: ORANGE_DARK,
              border: 0,
              borderRadius: 999,
              padding: "9px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add to cart
          </button>
        </div>
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.15 }}>
          {deal.emoji}
        </div>
      </div>

      {/* Quick reorder */}
      <SectionHeader title="Order it again" cta="See all" onCta={onBrowse} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {popular.map((it) => (
          <button
            key={it.id}
            onClick={() => onOpenItem(it)}
            style={{
              background: TILE,
              border: `1px solid ${LINE}`,
              borderRadius: RADIUS,
              padding: 10,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 36,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: CREAM,
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              {it.emoji}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 2 }}>
              {it.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ORANGE }}>{formatAUD(it.price)}</div>
          </button>
        ))}
      </div>

      {/* Browse menu CTA */}
      <button onClick={onBrowse} style={ctaOutline}>
        🍕 Browse full menu
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  cta,
  onCta,
}: {
  title: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 800, color: INK, margin: 0 }}>{title}</h2>
      {cta && (
        <button
          onClick={onCta}
          style={{
            border: 0,
            background: "transparent",
            color: ORANGE,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {cta} →
        </button>
      )}
    </div>
  );
}

// =====================================================================
// MENU

function MenuTab({
  category,
  setCategory,
  onOpenItem,
  onAdd,
}: {
  category: string;
  setCategory: (c: string) => void;
  onOpenItem: (it: MenuItem) => void;
  onAdd: (id: string) => void;
}) {
  const items = menuByCategory[category] ?? [];
  return (
    <div>
      <div style={{ padding: "12px 16px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 10 }}>Menu</div>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search pizzas, sides, drinks…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 34px",
              borderRadius: 999,
              border: `1px solid ${LINE}`,
              background: CREAM,
              fontSize: 13,
              color: INK,
              outline: "none",
              fontFamily: FONT,
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: 12, top: 10, fontSize: 14 }}>🔍</span>
        </div>
      </div>

      {/* category pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "4px 16px 12px",
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        {categories.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                whiteSpace: "nowrap",
                padding: "7px 14px",
                borderRadius: 999,
                border: active ? `1px solid ${ORANGE}` : `1px solid ${LINE}`,
                background: active ? ORANGE : "#fff",
                color: active ? "#fff" : INK,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "8px 16px 20px" }}>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 0",
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <button
              onClick={() => onOpenItem(it)}
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{it.name}</span>
                {it.vegetarian && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: "#E0F5EC",
                      color: FOREST,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    VEG
                  </span>
                )}
                {it.popular && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: "#FFE4C9",
                      color: ORANGE_DARK,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    POPULAR
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4, lineHeight: 1.4 }}>
                {it.description}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{formatAUD(it.price)}</div>
            </button>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  width: 62,
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: CREAM,
                  borderRadius: 12,
                }}
              >
                {it.emoji}
              </div>
              <button
                onClick={() => onAdd(it.id)}
                style={{
                  border: 0,
                  background: ORANGE,
                  color: "#fff",
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                aria-label={`Add ${it.name}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// CART

function CartTab({
  lines,
  subtotal,
  delivery,
  total,
  pointsToEarn,
  updateQty,
  onCheckout,
}: {
  lines: { item: MenuItem; qty: number }[];
  subtotal: number;
  delivery: number;
  total: number;
  pointsToEarn: number;
  updateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
}) {
  const firstAddress = CUSTOMER.addresses[0]!;
  const firstCard = CUSTOMER.savedCards[0]!;
  if (lines.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 54, marginBottom: 10 }}>🛒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 6 }}>
          Your cart&apos;s empty
        </div>
        <div style={{ fontSize: 13, color: MUTED }}>
          Start with a fan favourite — the Margherita&apos;s calling.
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: "12px 16px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 12 }}>Your cart</div>

      <div style={{ marginBottom: 14 }}>
        {lines.map(({ item, qty }) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 0",
              borderBottom: `1px solid ${LINE}`,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 30,
                width: 50,
                height: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: CREAM,
                borderRadius: 10,
              }}
            >
              {item.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{item.name}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{formatAUD(item.price)} each</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: CREAM,
                borderRadius: 999,
                padding: "4px 8px",
              }}
            >
              <button onClick={() => updateQty(item.id, -1)} style={qtyBtn} aria-label="Decrease">
                −
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: "center" }}>
                {qty}
              </span>
              <button onClick={() => updateQty(item.id, 1)} style={qtyBtn} aria-label="Increase">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reward teaser */}
      <div
        style={{
          background: "#E0F5EC",
          color: FOREST,
          padding: "10px 14px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>⭐</span>
        This order earns you{" "}
        <strong style={{ color: FOREST }}>{pointsToEarn} Dough Club points</strong>
      </div>

      {/* Delivery address */}
      <div
        style={{
          background: TILE,
          border: `1px solid ${LINE}`,
          borderRadius: 14,
          padding: 12,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 20 }}>📍</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>Deliver to</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{firstAddress.line}</div>
        </div>
        <span style={{ fontSize: 12, color: ORANGE, fontWeight: 700 }}>Change</span>
      </div>

      {/* Payment */}
      <div
        style={{
          background: TILE,
          border: `1px solid ${LINE}`,
          borderRadius: 14,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 20 }}>💳</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>Paying with</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
            {firstCard.brand} · •••• {firstCard.last4}
          </div>
        </div>
        <span style={{ fontSize: 12, color: ORANGE, fontWeight: 700 }}>Change</span>
      </div>

      {/* Totals */}
      <div
        style={{
          background: CREAM,
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 14,
        }}
      >
        <Row label="Subtotal" value={formatAUD(subtotal)} />
        <Row label="Delivery" value={delivery === 0 ? "Free 🎉" : formatAUD(delivery)} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            marginTop: 8,
            borderTop: `1px solid ${LINE}`,
            fontSize: 14,
            fontWeight: 800,
            color: INK,
          }}
        >
          <span>Total</span>
          <span>{formatAUD(total)}</span>
        </div>
      </div>

      <button onClick={onCheckout} style={ctaSolid}>
        Place order · {formatAUD(total)}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        color: MUTED,
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ color: INK, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// =====================================================================
// REWARDS

function RewardsTab({ points }: { points: number }) {
  const tier = currentTier(points);
  const next = nextTier(points);
  const progress =
    next.min <= tier.min ? 1 : Math.min(1, (points - tier.min) / (next.min - tier.min));
  return (
    <div style={{ padding: "12px 16px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 12 }}>Rewards</div>

      {/* balance */}
      <div
        style={{
          background: `linear-gradient(135deg, ${FOREST}, #1A352B)`,
          borderRadius: RADIUS,
          padding: 18,
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700, letterSpacing: 1 }}>
          {loyalty.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4, lineHeight: 1 }}>
          {points} pts
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
          {tier.name} member · since {CUSTOMER.memberSince}
        </div>
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: ORANGE,
              }}
            />
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>
            {next.min > tier.min
              ? `${next.min - points} pts to reach ${next.name}`
              : "Top tier — keep the streak going."}
          </div>
        </div>
      </div>

      {/* Available unlocks */}
      <SectionHeader title="Unlock with points" />
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {loyalty.unlocks.map((u) => {
          const canRedeem = points >= u.cost;
          return (
            <div
              key={u.name}
              style={{
                background: TILE,
                border: `1px solid ${LINE}`,
                borderRadius: 14,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  width: 40,
                  height: 40,
                  background: canRedeem ? "#FFE4C9" : CREAM,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🎁
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{u.name}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  {u.cost} pts
                  {!canRedeem && ` · ${u.cost - points} to go`}
                </div>
              </div>
              <button
                disabled={!canRedeem}
                style={{
                  border: 0,
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: canRedeem ? "pointer" : "not-allowed",
                  background: canRedeem ? ORANGE : "#EFE7D6",
                  color: canRedeem ? "#fff" : MUTED,
                }}
              >
                {canRedeem ? "Redeem" : "Locked"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tier ladder */}
      <SectionHeader title="Tier perks" />
      <div style={{ display: "grid", gap: 8 }}>
        {loyalty.tiers.map((t) => {
          const reached = points >= t.min;
          const isCurrent = t.name === tier.name;
          return (
            <div
              key={t.name}
              style={{
                background: isCurrent ? "#FFF4E6" : TILE,
                border: `1px solid ${isCurrent ? ORANGE : LINE}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: reached ? INK : MUTED }}>
                  {t.name}
                  {isCurrent && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: ORANGE, fontWeight: 700 }}>
                      · YOU
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>From {t.min} pts</div>
              </div>
              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{t.perks.join(" · ")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// ORDERS

function OrdersTab({
  activeStage,
  onReorder,
}: {
  activeStage: number;
  onReorder: (ids: string[]) => void;
}) {
  const stages = [
    { label: "Received", sub: "Order confirmed" },
    { label: "Preparing", sub: "In the wood-fired oven" },
    { label: "On the way", sub: "Driver heading to you" },
    { label: "Delivered", sub: "Enjoy!" },
  ];
  const stageIcons = ["📝", "🔥", "🛵", "✅"];
  const currentStage = stages[Math.min(activeStage, stages.length - 1)]!;
  return (
    <div style={{ padding: "12px 16px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 12 }}>Orders</div>

      {activeStage < 3 && (
        <div
          style={{
            background: TILE,
            border: `1px solid ${LINE}`,
            borderRadius: RADIUS,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, letterSpacing: 1 }}>
                LIVE · ORDER #9921
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>
                {currentStage.label}
              </div>
              <div style={{ fontSize: 12, color: MUTED }}>{currentStage.sub}</div>
            </div>
            <div style={{ fontSize: 40 }}>{stageIcons[activeStage]}</div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {stages.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= activeStage ? ORANGE : "#EFD8B8",
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: CREAM,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 24 }}>🧑‍🍳</div>
            <div style={{ flex: 1, fontSize: 12, color: INK }}>
              <strong>Marco</strong> is prepping your order
            </div>
            <button
              style={{
                border: `1px solid ${LINE}`,
                background: "#fff",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                color: INK,
              }}
            >
              Call store
            </button>
          </div>
        </div>
      )}

      <SectionHeader title="Past orders" />
      <div style={{ display: "grid", gap: 10 }}>
        {PAST_ORDERS.map((o) => (
          <div
            key={o.id}
            style={{
              background: TILE,
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>
                  {o.date} · {formatAUD(o.total)}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>
                  {o.items}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "#E0F5EC",
                  color: FOREST,
                  padding: "2px 7px",
                  borderRadius: 4,
                }}
              >
                {o.status.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => onReorder(["m01"])}
              style={{
                marginTop: 8,
                background: "transparent",
                border: `1px solid ${ORANGE}`,
                color: ORANGE,
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reorder
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// PROFILE

function ProfileTab() {
  return (
    <div style={{ padding: "12px 16px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 12 }}>You</div>

      {/* identity */}
      <div
        style={{
          background: TILE,
          border: `1px solid ${LINE}`,
          borderRadius: RADIUS,
          padding: 14,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {CUSTOMER.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>{CUSTOMER.name} Potter</div>
          <div style={{ fontSize: 12, color: MUTED }}>
            {CUSTOMER.tier} · ⭐ {CUSTOMER.points} pts
          </div>
        </div>
      </div>

      <SectionHeader title="Saved addresses" />
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {CUSTOMER.addresses.map((a) => (
          <div
            key={a.label}
            style={{
              background: TILE,
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 18 }}>📍</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>
                {a.label}
                {a.default && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      background: "#FFE4C9",
                      color: ORANGE_DARK,
                      padding: "1px 5px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    DEFAULT
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED }}>{a.line}</div>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader title="Payment methods" />
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {CUSTOMER.savedCards.map((c) => (
          <div
            key={c.last4}
            style={{
              background: TILE,
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 18 }}>💳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>
                {c.brand} ending {c.last4}
                {c.default && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      background: "#FFE4C9",
                      color: ORANGE_DARK,
                      padding: "1px 5px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    DEFAULT
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader title="Preferences" />
      <div
        style={{
          background: TILE,
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <PrefRow label="Push notifications" value="On" />
        <PrefRow label="SMS offers" value="On" />
        <PrefRow label="Email receipts" value="On" />
        <PrefRow label="Dietary flags" value="Vegetarian-friendly first" last />
      </div>

      <button
        style={{
          background: "transparent",
          border: `1px solid ${LINE}`,
          color: MUTED,
          padding: "10px 14px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 700,
          width: "100%",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
}

function PrefRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 12px",
        borderBottom: last ? "none" : `1px solid ${LINE}`,
        fontSize: 12.5,
      }}
    >
      <span style={{ color: INK, fontWeight: 600 }}>{label}</span>
      <span style={{ color: MUTED }}>{value}</span>
    </div>
  );
}

// =====================================================================
// Item detail sheet

function ItemSheet({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 10,
        borderRadius: 36,
        overflow: "hidden",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#fff",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: 18,
          maxHeight: "78%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "#E5DFD0",
            margin: "0 auto 12px",
          }}
        />
        <div
          style={{
            fontSize: 72,
            textAlign: "center",
            background: CREAM,
            borderRadius: 14,
            padding: "20px 0",
            marginBottom: 12,
          }}
        >
          {item.emoji}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 4 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
          {item.description}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: CREAM,
              borderRadius: 999,
              padding: "6px 12px",
            }}
          >
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={qtyBtn}>
              −
            </button>
            <span style={{ fontWeight: 700, minWidth: 18, textAlign: "center" }}>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} style={qtyBtn}>
              +
            </button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: INK }}>
            {formatAUD(item.price * qty)}
          </div>
        </div>
        <button onClick={() => onAdd(qty)} style={ctaSolid}>
          Add {qty} to cart · {formatAUD(item.price * qty)}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Toast

function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 20,
        right: 20,
        background: INK,
        color: "#fff",
        padding: "10px 14px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        zIndex: 11,
      }}
    >
      {msg}
    </div>
  );
}

// =====================================================================
// Styles

const pageShell: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #F5EEDC 0%, #E9DFC5 100%)",
  padding: "48px 20px 64px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 28,
  fontFamily: FONT,
  color: INK,
};

const desktopInfo: React.CSSProperties = {
  maxWidth: 520,
  textAlign: "center",
};

const desktopInfoBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 999,
  background: "#fff",
  color: ORANGE_DARK,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  border: `1px solid ${LINE}`,
  marginBottom: 10,
};

const desktopTitle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  color: INK,
  margin: 0,
  letterSpacing: -0.5,
};

const desktopSub: React.CSSProperties = {
  fontSize: 14,
  color: MUTED,
  margin: "8px auto 0",
  maxWidth: 440,
  lineHeight: 1.5,
};

const phoneFrame: React.CSSProperties = {
  width: 390,
  height: 844,
  borderRadius: 42,
  background: "#111",
  padding: 6,
  boxShadow: "0 40px 90px -20px rgba(20, 15, 5, 0.35), 0 10px 30px rgba(0,0,0,0.15)",
  position: "relative",
  flexShrink: 0,
};

const phoneScreen: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: CREAM,
  borderRadius: 36,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

const phoneNotch: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  width: 110,
  height: 26,
  background: "#000",
  borderRadius: 14,
  zIndex: 5,
};

const appBody: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
};

const attribution: React.CSSProperties = {
  fontSize: 12,
  color: MUTED,
};

const qtyBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 11,
  border: 0,
  background: "#fff",
  color: INK,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};

const ctaSolid: React.CSSProperties = {
  width: "100%",
  background: ORANGE,
  color: "#fff",
  border: 0,
  padding: "14px 16px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 24px -10px rgba(232,100,31,0.6)",
};

const ctaOutline: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  color: INK,
  border: `1px solid ${LINE}`,
  padding: "12px 16px",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 999,
  background: "#fff",
  color: INK,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  border: `1px solid ${LINE}`,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 999,
  background: ORANGE,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
};
