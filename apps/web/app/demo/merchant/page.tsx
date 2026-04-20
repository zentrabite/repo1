"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  brand,
  categories,
  featuredDeals,
  formatAUD,
  loyalty,
  menu,
  menuByCategory,
  type MenuItem,
} from "./data";

type CartItem = { item: MenuItem; qty: number };
type View = "home" | "menu" | "cart" | "tracking" | "rewards" | "account";

const TRACKING_STAGES = ["Received", "Preparing", "Out for delivery", "Delivered"] as const;

export default function MerchantStorefront() {
  const [view, setView] = useState<View>("home");
  const [activeCat, setActiveCat] = useState<string>(categories[0]!);
  const [cart, setCart] = useState<CartItem[]>([
    { item: menu.find((m) => m.id === "m02")!, qty: 1 },
    { item: menu.find((m) => m.id === "m12")!, qty: 1 },
  ]);
  const [trackStage, setTrackStage] = useState(1);

  // Auto-advance tracker for the demo
  useEffect(() => {
    if (view !== "tracking") return;
    const t = setInterval(() => {
      setTrackStage((s) => (s < TRACKING_STAGES.length - 1 ? s + 1 : s));
    }, 4500);
    return () => clearInterval(t);
  }, [view]);

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.item.price * c.qty, 0), [cart]);
  const deliveryFee = subtotal >= 50 ? 0 : 6;
  const total = subtotal + deliveryFee;

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const found = prev.find((c) => c.item.id === item.id);
      if (found) return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { item, qty: 1 }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0)
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: brand.cream,
        color: brand.ink,
        fontFamily: "var(--font-inter)",
      }}
    >
      <DemoBadge />
      <Topbar view={view} setView={setView} cartCount={cart.reduce((s, c) => s + c.qty, 0)} />

      {view === "home" && (
        <HomeView
          onShopNow={() => setView("menu")}
          onTracker={() => setView("tracking")}
        />
      )}
      {view === "menu" && (
        <MenuView activeCat={activeCat} setActiveCat={setActiveCat} addToCart={addToCart} />
      )}
      {view === "cart" && (
        <CartView
          cart={cart}
          changeQty={changeQty}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          total={total}
          onCheckout={() => {
            setTrackStage(0);
            setView("tracking");
          }}
        />
      )}
      {view === "tracking" && <TrackingView stage={trackStage} cart={cart} />}
      {view === "rewards" && <RewardsView />}
      {view === "account" && <AccountView />}

      <Footer />
    </div>
  );
}

function DemoBadge() {
  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(255,107,53,0.94), rgba(255,150,75,0.94))",
        color: "white",
        padding: "8px 16px",
        fontSize: 12.5,
        fontWeight: 600,
        textAlign: "center",
        position: "sticky",
        top: 0,
        zIndex: 60,
      }}
    >
      🍕 DEMO STOREFRONT — Harbour Lane is a fictional merchant powered by ZentraBite ·{" "}
      <Link href="/demo" style={{ color: "white", textDecoration: "underline" }}>
        Back to demo hub
      </Link>
    </div>
  );
}

function Topbar({ view, setView, cartCount }: { view: View; setView: (v: View) => void; cartCount: number }) {
  const items: { key: View; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "menu", label: "Menu" },
    { key: "tracking", label: "Track order" },
    { key: "rewards", label: "Dough Club" },
    { key: "account", label: "Account" },
  ];
  return (
    <header
      style={{
        position: "sticky",
        top: 32,
        zIndex: 50,
        background: brand.cream,
        borderBottom: `1px solid rgba(26,22,18,0.08)`,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => setView("home")}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: brand.ink }}
        >
          <span style={{ fontSize: 28 }}>{brand.logoEmoji}</span>
          <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 19 }}>{brand.name}</span>
        </button>

        <nav style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {items.map((it) => {
            const on = view === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setView(it.key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: on ? brand.primary : "transparent",
                  color: on ? "white" : brand.ink,
                  border: "none",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {it.label}
              </button>
            );
          })}
          <button
            onClick={() => setView("cart")}
            style={{
              marginLeft: 6,
              padding: "8px 14px",
              borderRadius: 999,
              background: brand.ink,
              color: brand.cream,
              border: "none",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🛒 Cart {cartCount > 0 && (
              <span
                style={{
                  background: brand.primary,
                  color: "white",
                  borderRadius: 999,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

function HomeView({ onShopNow, onTracker }: { onShopNow: () => void; onTracker: () => void }) {
  return (
    <main>
      {/* Hero */}
      <section style={{ padding: "48px 24px 32px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 36, alignItems: "center" }} className="mh-hero">
          <div>
            <div style={{ display: "inline-block", padding: "5px 11px", borderRadius: 999, background: brand.accent, color: brand.cream, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Open · {brand.hours.split("·")[1]?.trim()}
            </div>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 900, fontSize: "clamp(38px, 5.5vw, 64px)", margin: "16px 0 12px", color: brand.ink, lineHeight: 1.05 }}>
              {brand.tagline}
            </h1>
            <p style={{ color: "rgba(26,22,18,0.7)", fontSize: 17, lineHeight: 1.55, marginBottom: 22 }}>
              Hand-stretched, wood-fired pizzas pulled out of a 480°C oven in 90 seconds. Ready
              for pickup in 15 mins or delivered to your door.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={onShopNow}
                style={{
                  padding: "14px 24px",
                  background: brand.primary,
                  color: "white",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Order now →
              </button>
              <button
                onClick={onTracker}
                style={{
                  padding: "14px 24px",
                  background: "transparent",
                  color: brand.ink,
                  border: `1px solid rgba(26,22,18,0.18)`,
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Track an order
              </button>
            </div>
            <div style={{ marginTop: 18, fontSize: 13, color: "rgba(26,22,18,0.6)" }}>
              📍 {brand.address} · 📞 {brand.phone}
            </div>
          </div>

          {/* Hero image — gradient pizza tile */}
          <div
            style={{
              borderRadius: 20,
              padding: 36,
              background: `radial-gradient(circle at 30% 30%, ${brand.primary}, ${brand.primaryDark})`,
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 30px 80px rgba(232,100,31,0.35)",
            }}
          >
            <div style={{ fontSize: 180, lineHeight: 1, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))" }}>🍕</div>
          </div>
        </div>
      </section>

      {/* Featured deals */}
      <section style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, marginBottom: 18 }}>This week's deals</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {featuredDeals.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 22,
                  borderRadius: 16,
                  background: "white",
                  border: `1px solid rgba(26,22,18,0.08)`,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>{d.emoji}</div>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 18 }}>{d.title}</div>
                <div style={{ color: "rgba(26,22,18,0.65)", fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>{d.subtitle}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 24, color: brand.primary }}>
                    {formatAUD(d.price)}
                  </span>
                  <span style={{ fontSize: 12, color: brand.accent, fontWeight: 700 }}>
                    Save ${d.saves}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty pitch */}
      <section style={{ padding: "32px 24px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: 32,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${brand.accent}, #1a3530)`,
            color: brand.cream,
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 30,
            alignItems: "center",
          }}
          className="mh-loyalty"
        >
          <div>
            <div style={{ fontSize: 12, color: "rgba(250,243,229,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
              Members club
            </div>
            <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 32, margin: "0 0 10px" }}>
              {loyalty.name}
            </h2>
            <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 16 }}>{loyalty.tagline}</p>
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
              {[
                "Free garlic bread on your first order",
                "Earn 1 point per $1 — unlock free pizzas, drinks, delivery",
                "Birthday tiramisu, on us",
                "Early access to new menu drops every Friday",
              ].map((p) => (
                <li key={p} style={{ display: "flex", gap: 10, fontSize: 14.5 }}>
                  <span style={{ color: brand.primary }}>✦</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              background: "rgba(250,243,229,0.06)",
              border: "1px solid rgba(250,243,229,0.18)",
              borderRadius: 14,
              padding: 22,
            }}
          >
            <div style={{ fontSize: 12, color: "rgba(250,243,229,0.7)", marginBottom: 4 }}>You'd earn</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 44, color: brand.primary }}>
              28 pts
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 18 }}>
              on a typical $28 family pizza order
            </div>
            <div style={{ height: 1, background: "rgba(250,243,229,0.16)", margin: "14px 0" }} />
            <div style={{ fontSize: 12, color: "rgba(250,243,229,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
              5 orders gets you
            </div>
            <div style={{ fontSize: 14.5 }}>
              Enough points for a free garlic bread (100 pts) — keep earning toward $10 off (500 pts).
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section style={{ padding: "32px 24px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: brand.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
            Our story
          </div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, marginBottom: 14 }}>
            A neighbourhood pizzeria, run by people who eat here too.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(26,22,18,0.7)", lineHeight: 1.7 }}>
            Marco grew up in his nonna's kitchen in Naples, then spent 14 years in Sydney pizzerias before
            opening Harbour Lane in 2019. We mill our own flour, ferment dough for 72 hours, and pull every
            pizza from a wood-fired oven we shipped in from Modena. No corporate parent. No commissary.
            Just the food we want to eat.
          </p>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .mh-hero, .mh-loyalty { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function MenuView({
  activeCat,
  setActiveCat,
  addToCart,
}: {
  activeCat: string;
  setActiveCat: (c: string) => void;
  addToCart: (m: MenuItem) => void;
}) {
  return (
    <main style={{ padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 36, marginBottom: 18 }}>Menu</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 6 }}>
          {categories.map((c) => {
            const on = c === activeCat;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 999,
                  background: on ? brand.primary : "white",
                  color: on ? "white" : brand.ink,
                  border: `1px solid ${on ? brand.primary : "rgba(26,22,18,0.12)"}`,
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {(menuByCategory[activeCat] || []).map((m) => (
            <div
              key={m.id}
              style={{
                padding: 20,
                borderRadius: 16,
                background: "white",
                border: "1px solid rgba(26,22,18,0.08)",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{m.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, display: "flex", gap: 6, alignItems: "center" }}>
                      {m.name}
                      {m.popular && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: brand.primary, color: "white", fontWeight: 700 }}>POPULAR</span>}
                      {m.vegetarian && <span style={{ fontSize: 11, color: brand.accent }}>🌿</span>}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, color: brand.primary }}>
                    {formatAUD(m.price)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(26,22,18,0.65)", marginTop: 4, lineHeight: 1.5 }}>{m.description}</div>
                <button
                  onClick={() => addToCart(m)}
                  style={{
                    marginTop: 12,
                    padding: "8px 14px",
                    background: brand.ink,
                    color: brand.cream,
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Add to cart +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function CartView({
  cart,
  changeQty,
  subtotal,
  deliveryFee,
  total,
  onCheckout,
}: {
  cart: CartItem[];
  changeQty: (id: string, delta: number) => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  onCheckout: () => void;
}) {
  return (
    <main style={{ padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 32, marginBottom: 14 }}>Your cart</h1>
        {cart.length === 0 ? (
          <div style={{ padding: 32, background: "white", borderRadius: 16, textAlign: "center", color: "rgba(26,22,18,0.6)" }}>
            Cart is empty. <span style={{ color: brand.primary, fontWeight: 700 }}>Browse the menu →</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }} className="mh-cart">
            <div style={{ background: "white", borderRadius: 16, padding: 8 }}>
              {cart.map((c) => (
                <div
                  key={c.item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr auto auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: "1px solid rgba(26,22,18,0.06)",
                  }}
                >
                  <div style={{ fontSize: 28 }}>{c.item.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.item.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(26,22,18,0.55)" }}>{formatAUD(c.item.price)} each</div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(26,22,18,0.12)" }}>
                    <button onClick={() => changeQty(c.item.id, -1)} style={qtyBtn}>−</button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }}>{c.qty}</span>
                    <button onClick={() => changeQty(c.item.id, 1)} style={qtyBtn}>+</button>
                  </div>
                  <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, minWidth: 60, textAlign: "right" }}>
                    {formatAUD(c.item.price * c.qty)}
                  </div>
                </div>
              ))}
            </div>

            <aside style={{ background: "white", borderRadius: 16, padding: 22, height: "fit-content", position: "sticky", top: 110 }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Order summary</div>
              <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                <Row k="Subtotal" v={formatAUD(subtotal)} />
                <Row k={`Delivery${deliveryFee === 0 ? " (free over $50)" : ""}`} v={deliveryFee === 0 ? "FREE" : formatAUD(deliveryFee)} />
                <div style={{ height: 1, background: "rgba(26,22,18,0.08)", margin: "8px 0" }} />
                <Row k="Total" v={formatAUD(total)} bold />
              </div>
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: brand.cream, fontSize: 12.5, color: "rgba(26,22,18,0.7)" }}>
                You'll earn <strong style={{ color: brand.accent }}>{Math.floor(total)} Dough Club points</strong> on this order.
              </div>
              <button
                onClick={onCheckout}
                disabled={cart.length === 0}
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: 14,
                  background: brand.primary,
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: cart.length === 0 ? 0.5 : 1,
                }}
              >
                Checkout — pay & track →
              </button>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "rgba(26,22,18,0.5)", textAlign: "center" }}>
                Apple Pay · Card · Demo (no real charge)
              </div>
            </aside>
          </div>
        )}
        <style>{`@media (max-width: 760px) { .mh-cart { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </main>
  );
}

function TrackingView({ stage, cart }: { stage: number; cart: CartItem[] }) {
  return (
    <main style={{ padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: brand.primary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Order #1289 · Confirmed
          </div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 32, margin: "6px 0 4px" }}>
            {TRACKING_STAGES[stage] === "Delivered" ? "Delivered. Enjoy 🎉" : `${TRACKING_STAGES[stage]}…`}
          </h1>
          <p style={{ color: "rgba(26,22,18,0.65)" }}>
            ETA <strong>4:42 PM</strong> · Marco is firing your pizza. We'll text you when the rider grabs it.
          </p>
        </div>

        {/* Progress line */}
        <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            {/* line */}
            <div style={{ position: "absolute", left: 18, right: 18, top: 16, height: 2, background: "rgba(26,22,18,0.1)" }} />
            <div
              style={{
                position: "absolute",
                left: 18,
                top: 16,
                height: 2,
                background: brand.primary,
                width: `calc((100% - 36px) * ${stage / (TRACKING_STAGES.length - 1)})`,
                transition: "width 0.5s",
              }}
            />
            {TRACKING_STAGES.map((s, i) => {
              const done = i <= stage;
              return (
                <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: done ? brand.primary : "white",
                      color: done ? "white" : "rgba(26,22,18,0.4)",
                      border: `2px solid ${done ? brand.primary : "rgba(26,22,18,0.1)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 14,
                      transition: "all 0.3s",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 11.5, color: done ? brand.ink : "rgba(26,22,18,0.5)", fontWeight: 600, maxWidth: 80, textAlign: "center" }}>
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver card */}
        {stage >= 2 && (
          <div style={{ background: "white", borderRadius: 16, padding: 18, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: brand.accent, color: brand.cream, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
              JT
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Jay T. is on the way</div>
              <div style={{ fontSize: 13, color: "rgba(26,22,18,0.6)" }}>Internal driver · 5 mins away · 🛵</div>
            </div>
            <button style={{ padding: "8px 14px", borderRadius: 8, background: brand.ink, color: brand.cream, border: "none", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
              Call rider
            </button>
          </div>
        )}

        {/* Items */}
        <div style={{ background: "white", borderRadius: 16, padding: 18 }}>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Your order</div>
          {cart.map((c) => (
            <div key={c.item.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(26,22,18,0.06)", fontSize: 14 }}>
              <span style={{ fontSize: 22 }}>{c.item.emoji}</span>
              <span><strong>{c.qty}×</strong> {c.item.name}</span>
              <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 700 }}>{formatAUD(c.item.price * c.qty)}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: 18, borderRadius: 14, background: `linear-gradient(135deg, ${brand.primary}22, transparent)`, border: `1px dashed ${brand.primary}55`, fontSize: 13, color: brand.ink }}>
          🔄 Live tracking is powered by ZentraBite's realtime engine — the merchant CRM sees this same status update at the same instant.
        </div>
      </div>
    </main>
  );
}

function RewardsView() {
  const myPoints = 320;
  return (
    <main style={{ padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 36, marginBottom: 4 }}>{loyalty.name}</h1>
        <p style={{ color: "rgba(26,22,18,0.65)", marginBottom: 24 }}>{loyalty.tagline}</p>

        {/* Balance */}
        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
            color: "white",
            marginBottom: 22,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
          className="mh-rew-balance"
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Your balance</div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 56, lineHeight: 1, marginTop: 6 }}>{myPoints}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>points · Silver tier 🥈</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.16)", padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Next tier: Gold (500 pts)</div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${(myPoints / 500) * 100}%`, height: "100%", background: "white" }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.9 }}>180 pts to go — order a family pizza to reach Gold.</div>
          </div>
        </div>

        {/* Available unlocks */}
        <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Available rewards</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 28 }}>
          {loyalty.unlocks.map((u) => {
            const can = myPoints >= u.cost;
            return (
              <div
                key={u.name}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "white",
                  border: `1px ${can ? "solid" : "dashed"} ${can ? brand.primary : "rgba(26,22,18,0.18)"}`,
                  opacity: can ? 1 : 0.6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: brand.primary, fontWeight: 700 }}>{u.cost} pts</div>
                <button
                  disabled={!can}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: can ? brand.ink : "rgba(26,22,18,0.1)",
                    color: can ? brand.cream : "rgba(26,22,18,0.4)",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: can ? "pointer" : "not-allowed",
                    marginTop: "auto",
                  }}
                >
                  {can ? "Redeem" : `${u.cost - myPoints} pts to go`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Tier ladder */}
        <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Tier perks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {loyalty.tiers.map((t) => (
            <div key={t.name} style={{ padding: 18, borderRadius: 12, background: "white", border: "1px solid rgba(26,22,18,0.08)" }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 17, color: brand.accent }}>{t.name}</div>
              <div style={{ fontSize: 12.5, color: "rgba(26,22,18,0.55)", marginBottom: 12 }}>{t.min}+ points</div>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>
                {t.perks.map((p) => (
                  <li key={p} style={{ fontSize: 13, display: "flex", gap: 8 }}>
                    <span style={{ color: brand.primary }}>✦</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <style>{`@media (max-width: 720px) { .mh-rew-balance { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </main>
  );
}

function AccountView() {
  return (
    <main style={{ padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 32, marginBottom: 18 }}>Your account</h1>
        <div style={{ background: "white", borderRadius: 16, padding: 22, marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Recent orders</div>
          {[
            { id: "#1289", date: "Today · 4:42 PM",     items: "Pepperoni · Garlic bread", total: 34, status: "In progress" },
            { id: "#1276", date: "Apr 14 · 7:22 PM",    items: "Margherita · Tiramisu",     total: 33, status: "Delivered" },
            { id: "#1264", date: "Apr 9 · 6:50 PM",     items: "Family Pack",                total: 62, status: "Delivered" },
            { id: "#1242", date: "Apr 2 · 8:10 PM",     items: "Quattro Formaggi",            total: 27, status: "Delivered" },
          ].map((o) => (
            <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "12px 0", borderTop: "1px solid rgba(26,22,18,0.06)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.id} · {o.date}</div>
                <div style={{ fontSize: 12.5, color: "rgba(26,22,18,0.6)" }}>{o.items}</div>
              </div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700 }}>{formatAUD(o.total)}</div>
              <div
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: o.status === "Delivered" ? "rgba(36,73,63,0.14)" : "rgba(232,100,31,0.14)",
                  color: o.status === "Delivered" ? brand.accent : brand.primary,
                  fontWeight: 700,
                }}
              >
                {o.status}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="mh-account-grid">
          <Card title="Saved address" body="48 Coogee Bay Rd, Coogee NSW 2034" />
          <Card title="Payment" body="Visa ending 6411 · Apple Pay" />
          <Card title="Notifications" body="SMS + push enabled" />
          <Card title="Email" body="liam@example.com" />
        </div>

        <style>{`@media (max-width: 560px) { .mh-account-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, border: "1px solid rgba(26,22,18,0.08)" }}>
      <div style={{ fontSize: 12, color: "rgba(26,22,18,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14 }}>{body}</div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 800 : 500, fontSize: bold ? 17 : 14 }}>
      <span style={{ color: bold ? brand.ink : "rgba(26,22,18,0.65)" }}>{k}</span>
      <span style={{ fontFamily: bold ? "var(--font-outfit)" : "inherit" }}>{v}</span>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  color: brand.ink,
  lineHeight: 1,
};

function Footer() {
  return (
    <footer style={{ background: brand.ink, color: brand.cream, padding: "32px 24px", marginTop: 24 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 20 }} className="mh-footer-grid">
        <div>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{brand.name}</div>
          <div style={{ fontSize: 13.5, opacity: 0.7, lineHeight: 1.6 }}>
            {brand.address}<br />
            {brand.phone}<br />
            {brand.hours}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Order</div>
          <div style={{ fontSize: 13.5, display: "grid", gap: 6 }}>
            <span>Pickup · 15 min</span>
            <span>Delivery · 5km radius</span>
            <span>Catering · 24h notice</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Powered by</div>
          <Link href="/" style={{ color: brand.cream, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-outfit)" }}>
            ZentraBite — Business OS
          </Link>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            <Link href="/demo" style={{ color: brand.cream, opacity: 0.7 }}>← Demo hub</Link>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 720px) { .mh-footer-grid { grid-template-columns: 1fr !important; } }`}</style>
    </footer>
  );
}
