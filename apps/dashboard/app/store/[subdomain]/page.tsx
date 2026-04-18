"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

const C = { g:"#00B67A", st:"#8B9DB5", cl:"#F8FAFB", navy:"#0F1F2D", card:"#1C2D48", mist:"rgba(255,255,255,.08)", r:"#FF4757" };

interface CartItem { id:string; name:string; price:number; qty:number; image_url?:string }

export default function StorefrontPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);
  const router = useRouter();

  const [biz,       setBiz]       = useState<any>(null);
  const [menu,      setMenu]      = useState<any[]>([]);
  const [cart,      setCart]      = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [customer,  setCustomer]  = useState({ name:"", phone:"", email:"" });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [checking,  setChecking]  = useState(false);
  const [showCart,  setShowCart]  = useState(false);

  useEffect(() => {
    fetch(`/api/store/${subdomain}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setBiz(data.business);
        setMenu(data.menu);
        if (data.menu.length > 0) setActiveTab(data.menu[0].id);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load menu"); setLoading(false); });
  }, [subdomain]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, image_url: item.image_url }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.id !== id));
    else setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleCheckout = async () => {
    if (!customer.name.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, items: cart, customer }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Failed to start checkout");
    } catch { alert("Network error"); }
    finally { setChecking(false); }
  };

  const activeSection = menu.find(s => s.id === activeTab);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"sans-serif", color:C.st, fontSize:14 }}>Loading menu…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:40 }}>🍽️</div>
      <div style={{ fontFamily:"sans-serif", color:C.cl, fontWeight:600, fontSize:18 }}>Menu not found</div>
      <div style={{ fontFamily:"sans-serif", color:C.st, fontSize:13 }}>This restaurant may not have set up their online menu yet.</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.navy, fontFamily:"var(--font-inter, sans-serif)" }}>

      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(15,31,45,.95)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.mist}`, padding:"0 20px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {biz?.logo_url ? (
              <img src={biz.logo_url} alt={biz.name} style={{ width:38, height:38, borderRadius:10, objectFit:"cover" }} />
            ) : (
              <div style={{ width:38, height:38, borderRadius:10, background:C.g, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:C.navy }}>
                {biz?.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:C.cl }}>{biz?.name}</div>
              {biz?.suburb && <div style={{ fontSize:11, color:C.st }}>{biz.suburb}</div>}
            </div>
          </div>

          {cartCount > 0 && (
            <button onClick={() => setShowCart(!showCart)} style={{
              display:"flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:10,
              background:C.g, border:"none", color:C.navy, fontWeight:700, fontSize:13, cursor:"pointer",
            }}>
              🛒 {cartCount} · ${total.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"0 20px 100px" }}>

        {/* Category tabs */}
        {menu.length > 1 && (
          <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"16px 0", scrollbarWidth:"none" }}>
            {menu.map(s => (
              <button key={s.id} onClick={() => setActiveTab(s.id)} style={{
                padding:"8px 16px", borderRadius:20, border:`1px solid ${activeTab===s.id?C.g:C.mist}`,
                background:activeTab===s.id?"rgba(0,182,122,.15)":"transparent",
                color:activeTab===s.id?C.g:C.st, fontWeight:600, fontSize:13, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
              }}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:menu.length > 1 ? 0 : 20 }}>
          {(activeSection?.items ?? []).map((item: any) => {
            const inCart = cart.find(c => c.id === item.id);
            return (
              <div key={item.id} style={{ background:C.card, borderRadius:14, overflow:"hidden", display:"flex", alignItems:"stretch", border:`1px solid ${C.mist}` }}>
                {item.image_url && (
                  <div style={{ width:100, flexShrink:0 }}>
                    <img src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                )}
                <div style={{ flex:1, padding:"14px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:C.cl, marginBottom:4 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize:12, color:C.st, lineHeight:1.4 }}>{item.description}</div>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:C.g }}>${Number(item.price).toFixed(2)}</div>
                    {inCart ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <button onClick={() => updateQty(item.id, inCart.qty - 1)} style={{ width:28, height:28, borderRadius:7, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                        <span style={{ fontWeight:700, fontSize:13, color:C.cl, minWidth:16, textAlign:"center" }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(item.id, inCart.qty + 1)} style={{ width:28, height:28, borderRadius:7, background:C.g, border:"none", color:C.navy, cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} style={{ padding:"7px 18px", borderRadius:8, background:C.g, border:"none", color:C.navy, fontWeight:700, fontSize:13, cursor:"pointer" }}>Add</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout panel — slides up when cart has items */}
      {showCart && cartCount > 0 && (
        <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div onClick={() => setShowCart(false)} style={{ flex:1, background:"rgba(0,0,0,.5)" }} />
          <div style={{ background:"#1A2E45", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ fontWeight:700, fontSize:17, color:C.cl, marginBottom:16 }}>Your Order</div>

            {cart.map(item => (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.mist}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:C.cl }}>{item.name}</div>
                  <div style={{ fontSize:11, color:C.st }}>${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontWeight:700, fontSize:13, color:C.cl, minWidth:16, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(0,182,122,.2)", border:"none", color:C.g, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              </div>
            ))}

            <div style={{ padding:"16px 0", borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontWeight:700, fontSize:15, color:C.cl, marginBottom:12 }}>Your details</div>
              <input value={customer.name} onChange={e=>setCustomer(c=>({...c,name:e.target.value}))} placeholder="Your name *" style={{ width:"100%", marginBottom:8, background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
              <input value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} placeholder="Phone number" style={{ width:"100%", marginBottom:8, background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
              <input type="email" value={customer.email} onChange={e=>setCustomer(c=>({...c,email:e.target.value}))} placeholder="Email (for receipt)" style={{ width:"100%", background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0" }}>
              <span style={{ color:C.st, fontSize:13 }}>Total</span>
              <span style={{ fontWeight:800, fontSize:20, color:C.cl }}>${total.toFixed(2)}</span>
            </div>

            <button onClick={handleCheckout} disabled={checking || !customer.name.trim()} style={{
              width:"100%", padding:"15px", borderRadius:12, border:"none",
              background: !customer.name.trim() ? "rgba(255,255,255,.08)" : C.g,
              color: !customer.name.trim() ? C.st : C.navy,
              fontWeight:700, fontSize:15, cursor: !customer.name.trim() ? "not-allowed" : "pointer",
              opacity: checking ? .7 : 1,
            }}>
              {checking ? "Opening payment…" : !customer.name.trim() ? "Enter your name to continue" : `Pay $${total.toFixed(2)} →`}
            </button>
          </div>
        </div>
      )}

      {/* Floating cart button when cart has items and panel is closed */}
      {cartCount > 0 && !showCart && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:50 }}>
          <button onClick={() => setShowCart(true)} style={{
            padding:"14px 28px", borderRadius:14, background:C.g, border:"none",
            color:C.navy, fontWeight:700, fontSize:14, cursor:"pointer",
            boxShadow:"0 8px 32px rgba(0,182,122,.4)",
          }}>
            🛒 View order · {cartCount} items · ${total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
