"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getMenu } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { MenuItem } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", st:"#6B7C93", cl:"#F8FAFB", navy:"#1C2D48", mist:"rgba(226,232,240,.08)" };

interface CartItem extends MenuItem { qty: number }
type PayMethod = "cash" | "card";

export default function POSPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [menu,       setMenu]       = useState<any[]>([]);
  const [cart,       setCart]       = useState<CartItem[]>([]);
  const [customer,   setCustomer]   = useState({ name:"", phone:"" });
  const [payMethod,  setPayMethod]  = useState<PayMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<string>("");

  useEffect(() => {
    if (!businessId) return;
    getMenu(businessId)
      .then(data => {
        setMenu(data);
        if (data.length > 0) setActiveTab(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return show("Add at least one item");
    if (!businessId) return;
    setSubmitting(true);

    try {
      // Look up or create customer if name/phone provided
      let customerId: string | null = null;
      if (customer.name.trim()) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", customer.phone)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          await supabase.from("customers").update({
            last_order_date: new Date().toISOString(),
            total_orders: supabase.rpc as any, // incremented below
          }).eq("id", existing.id);
        } else if (customer.name.trim()) {
          const { data: newCust } = await supabase
            .from("customers")
            .insert({ business_id: businessId, name: customer.name, phone: customer.phone || null, source: "pos", segment: "New" })
            .select("id")
            .single();
          customerId = newCust?.id ?? null;
        }
      }

      const items = cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }));

      await supabase.from("orders").insert({
        business_id: businessId,
        customer_id: customerId,
        items,
        total,
        status: "paid",
        source: "pos",
      });

      // Update customer stats if linked
      if (customerId) {
        const { data: cust } = await supabase.from("customers").select("total_orders, total_spent, points_balance").eq("id", customerId).single();
        if (cust) {
          await supabase.from("customers").update({
            last_order_date: new Date().toISOString(),
            total_orders:   cust.total_orders + 1,
            total_spent:    Number(cust.total_spent) + total,
            points_balance: cust.points_balance + Math.round(total * 10),
          }).eq("id", customerId);
        }
      }

      setCart([]);
      setCustomer({ name:"", phone:"" });
      show(`Order placed ✓ — $${total.toFixed(2)} ${payMethod === "cash" ? "cash" : "card"}`);
    } catch (e: any) {
      show(e?.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const activeSection = menu.find(s => s.id === activeTab);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:0, height:"calc(100vh - 66px)", margin:"-32px -40px", overflow:"hidden" }}>

      {/* ── Left: Menu ── */}
      <div style={{ display:"flex", flexDirection:"column", borderRight:`1px solid ${C.mist}`, overflow:"hidden" }}>

        {/* Category tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.mist}`, overflowX:"auto", flexShrink:0 }}>
          {menu.map(section => (
            <button key={section.id} onClick={() => setActiveTab(section.id)} style={{
              padding:"14px 20px", background:"transparent", border:"none", borderBottom:`2px solid ${activeTab===section.id?C.g:"transparent"}`,
              color:activeTab===section.id?C.g:C.st, fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13,
              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s",
            }}>
              {section.name} <span style={{ fontSize:10, opacity:.6 }}>({section.items.length})</span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {loading ? (
            <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:48 }}>Loading menu…</div>
          ) : menu.length === 0 ? (
            <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:48 }}>No menu items yet — add items in Menu Builder</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
              {(activeSection?.items ?? []).filter((i: MenuItem) => i.available).map((item: MenuItem) => (
                <div key={item.id} onClick={() => addToCart(item)} style={{
                  background:"rgba(28,45,72,.5)", border:`1px solid ${C.mist}`, borderRadius:12,
                  padding:16, cursor:"pointer", transition:"all .15s",
                  display:"flex", flexDirection:"column", gap:6,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,182,122,.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.mist)}
                >
                  {item.image_url ? (
                    <div style={{ width:"100%", height:80, borderRadius:8, overflow:"hidden", marginBottom:2 }}>
                      <img src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    </div>
                  ) : (
                    <div style={{ width:"100%", height:80, borderRadius:8, background:"rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>🍽️</div>
                  )}
                  <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:C.cl, lineHeight:1.2 }}>{item.name}</div>
                  {item.description && <div style={{ fontSize:10, color:C.st, lineHeight:1.3 }}>{item.description}</div>}
                  <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:14, color:C.g, marginTop:"auto" }}>${Number(item.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Order panel ── */}
      <div style={{ display:"flex", flexDirection:"column", background:"rgba(15,25,42,.7)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.mist}`, flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:16, color:C.cl }}>Current Order</div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ fontSize:11, color:C.r, background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"var(--font-inter)", marginTop:2 }}>
              Clear all
            </button>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", color:"rgba(255,255,255,.15)", padding:32, fontSize:13, fontFamily:"var(--font-inter)" }}>
              Tap items to add them
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ padding:"10px 20px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:C.cl }}>{item.name}</div>
                <div style={{ fontSize:11, color:C.st }}>${(item.price * item.qty).toFixed(2)}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,.08)", border:"none", color:C.cl, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                <span style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:13, color:C.cl, minWidth:20, textAlign:"center" }}>{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(0,182,122,.2)", border:"none", color:C.g, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Customer (optional) */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.mist}`, flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:C.st, marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Customer (optional)</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={customer.name} onChange={e=>setCustomer(c=>({...c,name:e.target.value}))} placeholder="Name" style={{ flex:1, fontSize:12, padding:"8px 10px" }} />
            <input value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} placeholder="Phone" style={{ flex:1, fontSize:12, padding:"8px 10px" }} />
          </div>
        </div>

        {/* Payment method */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.mist}`, flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:C.st, marginBottom:8, textTransform:"uppercase", letterSpacing:".5px" }}>Payment</div>
          <div style={{ display:"flex", gap:8 }}>
            {(["cash","card"] as PayMethod[]).map(m => (
              <button key={m} onClick={() => setPayMethod(m)} style={{
                flex:1, padding:"10px 0", borderRadius:8, border:`1px solid ${payMethod===m?C.g:C.mist}`,
                background:payMethod===m?"rgba(0,182,122,.15)":"rgba(255,255,255,.04)",
                color:payMethod===m?C.g:C.st, fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, cursor:"pointer",
              }}>
                {m === "cash" ? "💵 Cash" : "💳 Card"}
              </button>
            ))}
          </div>
        </div>

        {/* Total + place order */}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.mist}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>Total</span>
            <span style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:24, color:C.cl }}>${total.toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={submitting || cart.length === 0}
            style={{
              width:"100%", padding:"14px", borderRadius:10, border:"none",
              background: cart.length === 0 ? "rgba(255,255,255,.05)" : C.g,
              color: cart.length === 0 ? C.st : C.navy,
              fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:15,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              opacity: submitting ? .7 : 1, transition:"all .2s",
            }}
          >
            {submitting ? "Placing…" : cart.length === 0 ? "Add items to order" : `Place Order · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
