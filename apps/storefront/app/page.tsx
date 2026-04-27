"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getBusinessBySubdomain, getMenuByBusiness } from "@/lib/supabase";

const C = { g:"#00B67A", o:"#FF6B35", st:"#6B7C93", navy:"#1C2D48", bg:"#0F1F2D" };

interface CartItem    { id:string; name:string; price:number; qty:number; }
interface MenuItem    { id:string; name:string; price:number; description:string|null; dietary_tags:string[]; }
interface MenuSection { id:string; name:string; items:MenuItem[]; }
interface Business    { id:string; name:string; type:string; suburb:string|null; logo_url:string|null; }

interface FeeBreakdown {
  baseDistance:        number;
  peakSurcharge:       number;
  highDemandSurcharge: number;
  badWeatherSurcharge: number;
  lowOrderSurcharge:   number;
  highValueDiscount:   number;
  prioritySurcharge:   number;
  serviceFee:          number;
  total:               number;
}

type FulfilMode = "pickup" | "delivery";
type DistBand   = "short"  | "mid" | "far";
type DelivTier  = "standard" | "priority";

const DIST_KM:    Record<DistBand, number>  = { short:1.5, mid:4.5, far:8 };
const DIST_LABEL: Record<DistBand, string>  = { short:"< 3 km", mid:"3–6 km", far:"6 km+" };

export default function StorefrontPage() {
  const [business,    setBusiness]    = useState<Business|null>(null);
  const [menu,        setMenu]        = useState<MenuSection[]>([]);
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customer,    setCustomer]    = useState({ name:"", phone:"", email:"" });
  const [notFound,    setNotFound]    = useState(false);

  // ── Delivery state ───────────────────────────────────────────────────────
  const [fulfilMode,    setFulfilMode]    = useState<FulfilMode>("pickup");
  const [delivAddress,  setDelivAddress]  = useState("");
  const [distBand,      setDistBand]      = useState<DistBand>("short");
  const [delivTier,     setDelivTier]     = useState<DelivTier>("standard");
  const [feeBreakdown,  setFeeBreakdown]  = useState<FeeBreakdown|null>(null);
  const [feeLoading,    setFeeLoading]    = useState(false);
  const feeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const subdomain = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BUSINESS_SUBDOMAIN || window.location.hostname.split(".")[0])
    : process.env.NEXT_PUBLIC_BUSINESS_SUBDOMAIN ?? "demo";

  useEffect(() => {
    async function load() {
      const biz = await getBusinessBySubdomain(subdomain);
      if (!biz) { setNotFound(true); setLoading(false); return; }
      const menuData = await getMenuByBusiness(biz.id);
      setBusiness(biz);
      setMenu(menuData);
      setLoading(false);
      document.title = `Order from ${biz.name}`;
    }
    load();
  }, [subdomain]);

  // ── Live fee fetch ────────────────────────────────────────────────────────
  const fetchFee = useCallback(() => {
    if (fulfilMode !== "delivery") { setFeeBreakdown(null); return; }
    if (feeTimer.current) clearTimeout(feeTimer.current);
    feeTimer.current = setTimeout(async () => {
      setFeeLoading(true);
      try {
        const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
        const params = new URLSearchParams({
          distance_km: String(DIST_KM[distBand]),
          order_value:  String(subtotal),
          tier:         delivTier,
          peak:         "0", demand: "0", weather: "0",
        });
        const res  = await fetch(`/api/delivery/fee?${params}`);
        const data = await res.json();
        if (!data.error) setFeeBreakdown(data as FeeBreakdown);
      } catch { /* silent */ } finally {
        setFeeLoading(false);
      }
    }, 350);
  }, [fulfilMode, distBand, delivTier, cart]);

  useEffect(() => { fetchFee(); }, [fetchFee]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addItem = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty:c.qty+1 } : c);
      return [...prev, { id:item.id, name:item.name, price:item.price, qty:1 }];
    });
  };
  const removeItem = (id:string) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty  = (id:string, qty:number) => {
    if (qty <= 0) return removeItem(id);
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  };

  const subtotal    = cart.reduce((a,c) => a + c.price * c.qty, 0);
  const delivFeeAmt = fulfilMode === "delivery" && feeBreakdown ? feeBreakdown.total : 0;
  const grandTotal  = subtotal + delivFeeAmt;
  const cartCount   = cart.reduce((a,c) => a + c.qty, 0);

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!customer.name || !customer.phone) { alert("Please enter your name and phone number."); return; }
    if (cart.length === 0) { alert("Your cart is empty."); return; }
    if (fulfilMode === "delivery" && !delivAddress.trim()) { alert("Please enter your delivery address."); return; }
    setCheckingOut(true);

    const res = await fetch("/api/checkout", {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify({
        cart,
        customer,
        businessId:      business?.id,
        // Delivery fields — passed through to Stripe metadata → webhook → order
        fulfillmentType: fulfilMode,
        deliveryAddress: fulfilMode === "delivery" ? delivAddress.trim() : undefined,
        deliveryFee:     fulfilMode === "delivery" ? delivFeeAmt : undefined,
        deliveryTier:    fulfilMode === "delivery" ? delivTier : undefined,
      }),
    });
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Checkout failed. Please try again.");
      setCheckingOut(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid rgba(0,182,122,.2)`, borderTopColor:C.g, animation:"spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", background:C.bg, gap:12 }}>
      <div style={{ fontSize:48 }}>🍽️</div>
      <h1 style={{ fontSize:22, fontWeight:700 }}>Business not found</h1>
      <p style={{ color:C.st, fontSize:14 }}>Check the URL and try again.</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>

      {/* ── Header ── */}
      <header style={{ borderBottom:"1px solid rgba(255,255,255,.08)", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"rgba(15,31,45,.95)", backdropFilter:"blur(20px)", zIndex:40 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>{business?.name}</h1>
          <p style={{ fontSize:12, color:C.st, marginTop:2 }}>{business?.type}{business?.suburb ? ` · ${business.suburb}` : ""} · Order direct & save</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          style={{ position:"relative", background:C.g, border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}
        >
          🛒 Cart
          {cartCount > 0 && (
            <span style={{ background:"#fff", color:C.g, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* ── Menu ── */}
      <main style={{ maxWidth:760, margin:"0 auto", padding:"24px 20px" }}>
        {menu.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:C.st }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🍽️</div>
            <p style={{ fontSize:15 }}>Menu coming soon</p>
          </div>
        ) : menu.map(section => (
          <div key={section.id} style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:14, paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
              {section.name}
            </h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {section.items.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <div key={item.id} style={{ background:"rgba(28,45,72,.5)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize:13, color:C.st, lineHeight:1.4 }}>{item.description}</div>}
                      {item.dietary_tags?.length > 0 && (
                        <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                          {item.dietary_tags.map(tag => (
                            <span key={tag} style={{ fontSize:10, padding:"2px 7px", borderRadius:999, background:"rgba(0,182,122,.12)", color:C.g, fontWeight:600 }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
                      <span style={{ fontWeight:700, fontSize:16 }}>${item.price.toFixed(2)}</span>
                      {inCart ? (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button onClick={() => updateQty(item.id, inCart.qty-1)} style={{ width:28, height:28, borderRadius:7, background:"rgba(255,255,255,.1)", border:"none", color:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                          <span style={{ fontSize:15, fontWeight:600, minWidth:16, textAlign:"center" }}>{inCart.qty}</span>
                          <button onClick={() => updateQty(item.id, inCart.qty+1)} style={{ width:28, height:28, borderRadius:7, background:C.g, border:"none", color:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addItem(item)} style={{ background:C.g, border:"none", borderRadius:9, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Add</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:100 }} onClick={() => setCartOpen(false)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)" }} />
          <div
            onClick={e => e.stopPropagation()}
            style={{ position:"absolute", right:0, top:0, bottom:0, width:Math.min(440, window.innerWidth), background:"rgba(15,25,42,.98)", borderLeft:"1px solid rgba(255,255,255,.08)", display:"flex", flexDirection:"column", overflowY:"auto" }}
          >
            {/* Drawer header */}
            <div style={{ padding:"20px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Your Order</h2>
              <button onClick={() => setCartOpen(false)} style={{ background:"rgba(255,255,255,.08)", border:"none", color:"#fff", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:16 }}>✕</button>
            </div>

            {/* Cart items */}
            <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign:"center", color:C.st, padding:"32px 0", fontSize:14 }}>Your cart is empty</div>
              ) : cart.map(item => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{item.name}</div>
                    <div style={{ fontSize:12, color:C.st, marginTop:2 }}>${item.price.toFixed(2)} each</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={() => updateQty(item.id, item.qty-1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,.1)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontSize:14, fontWeight:600, minWidth:16, textAlign:"center" }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty+1)} style={{ width:26, height:26, borderRadius:6, background:C.g, border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <>
                {/* ── Fulfilment mode ─────────────────────────────────────── */}
                <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:12, color:C.st, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:".4px" }}>How would you like your order?</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {([["pickup","🥡","Pick up in store"],["delivery","🛵","Home delivery"]] as [FulfilMode,string,string][]).map(([m,emoji,label]) => (
                      <button
                        key={m}
                        onClick={() => setFulfilMode(m)}
                        style={{
                          padding:"12px 8px", borderRadius:10, border:`1px solid ${fulfilMode===m ? C.g : "rgba(255,255,255,.1)"}`,
                          background: fulfilMode===m ? "rgba(0,182,122,.1)" : "rgba(255,255,255,.04)",
                          color: fulfilMode===m ? C.g : C.st,
                          fontSize:13, fontWeight:600, cursor:"pointer",
                          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        }}
                      >
                        <span style={{ fontSize:22 }}>{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Delivery details ────────────────────────────────────── */}
                {fulfilMode === "delivery" && (
                  <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(0,182,122,.03)" }}>
                    <div style={{ fontSize:12, color:C.g, fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:".4px" }}>Delivery Details</div>

                    {/* Address */}
                    <input
                      value={delivAddress}
                      onChange={e => setDelivAddress(e.target.value)}
                      placeholder="Delivery address *"
                      style={{ marginBottom:10, fontSize:13 }}
                    />

                    {/* Distance */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:C.st, marginBottom:6 }}>Distance from restaurant</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                        {(["short","mid","far"] as DistBand[]).map(b => (
                          <button
                            key={b}
                            onClick={() => setDistBand(b)}
                            style={{
                              padding:"8px 4px", borderRadius:7, border:`1px solid ${distBand===b ? C.g : "rgba(255,255,255,.1)"}`,
                              background: distBand===b ? "rgba(0,182,122,.12)" : "rgba(255,255,255,.04)",
                              color: distBand===b ? C.g : C.st,
                              fontSize:11, fontWeight:600, cursor:"pointer",
                            }}
                          >
                            {DIST_LABEL[b]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tier */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:C.st, marginBottom:6 }}>Delivery speed</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                        {([["standard","⚡ Standard"],["priority","🚀 Priority"]] as [DelivTier,string][]).map(([t,label]) => (
                          <button
                            key={t}
                            onClick={() => setDelivTier(t)}
                            style={{
                              padding:"8px 4px", borderRadius:7, border:`1px solid ${delivTier===t ? C.g : "rgba(255,255,255,.1)"}`,
                              background: delivTier===t ? "rgba(0,182,122,.12)" : "rgba(255,255,255,.04)",
                              color: delivTier===t ? C.g : C.st,
                              fontSize:11, fontWeight:600, cursor:"pointer",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fee preview */}
                    {feeLoading ? (
                      <div style={{ fontSize:12, color:C.st, textAlign:"center", padding:"8px 0" }}>Calculating delivery fee…</div>
                    ) : feeBreakdown ? (
                      <div style={{ background:"rgba(255,255,255,.04)", borderRadius:8, padding:"10px 12px" }}>
                        {[
                          ["Base delivery",   feeBreakdown.baseDistance],
                          feeBreakdown.peakSurcharge      ? ["Peak surcharge",   feeBreakdown.peakSurcharge]      : null,
                          feeBreakdown.highDemandSurcharge? ["High demand",      feeBreakdown.highDemandSurcharge] : null,
                          feeBreakdown.badWeatherSurcharge? ["Weather surcharge",feeBreakdown.badWeatherSurcharge] : null,
                          feeBreakdown.lowOrderSurcharge  ? ["Low order fee",    feeBreakdown.lowOrderSurcharge]   : null,
                          feeBreakdown.prioritySurcharge  ? ["Priority",         feeBreakdown.prioritySurcharge]   : null,
                          feeBreakdown.highValueDiscount  ? ["High value disc.", `-${feeBreakdown.highValueDiscount}`] : null,
                          ["Service fee",     feeBreakdown.serviceFee],
                        ].filter(Boolean).map(row => (
                          <div key={String(row![0])} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:3 }}>
                            <span>{row![0]}</span>
                            <span>${typeof row![1] === "number" ? (row![1] as number).toFixed(2) : row![1]}</span>
                          </div>
                        ))}
                        <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:13, color:C.g, borderTop:"1px solid rgba(255,255,255,.1)", marginTop:6, paddingTop:6 }}>
                          <span>Delivery total</span>
                          <span>${feeBreakdown.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ── Customer details ────────────────────────────────────── */}
                <div style={{ padding:"16px 20px" }}>
                  <div style={{ fontSize:12, color:C.st, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:".4px" }}>Your details</div>
                  <input value={customer.name}  onChange={e => setCustomer(c=>({...c,name:e.target.value}))}  placeholder="Your name *"       style={{ marginBottom:8, fontSize:13 }} />
                  <input value={customer.phone} onChange={e => setCustomer(c=>({...c,phone:e.target.value}))} placeholder="Phone number *"     style={{ marginBottom:8, fontSize:13 }} />
                  <input value={customer.email} onChange={e => setCustomer(c=>({...c,email:e.target.value}))} placeholder="Email (optional)"   style={{ marginBottom:14, fontSize:13 }} />

                  {/* Order total */}
                  <div style={{ marginBottom:4 }}>
                    {fulfilMode === "delivery" && delivFeeAmt > 0 && (
                      <>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.st, marginBottom:4 }}>
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.g, marginBottom:6 }}>
                          <span>Delivery fee</span>
                          <span>+${delivFeeAmt.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:17, fontWeight:700, marginBottom:14 }}>
                      <span>Total</span>
                      <span style={{ color:C.g }}>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    style={{ width:"100%", padding:"14px", background:C.g, border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:checkingOut?.7:1 }}
                  >
                    {checkingOut ? "Redirecting to payment…" : `Pay $${grandTotal.toFixed(2)}`}
                  </button>
                  <p style={{ fontSize:11, color:C.st, textAlign:"center", marginTop:8 }}>Powered by Stripe · Secure checkout</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
