"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/zb-icon";
import { OptionPicker, missingGroup } from "@/components/option-picker";
import { cheapestPrice, lineKey, optionsLabel, priceSelection, pricesVary, readOptions, type OptionGroup } from "@/lib/menu-options";
import { DEFAULT_TIMEZONE, pickupPlan, shopTime, type OrderingRules } from "@/lib/pickup-times";
import { checkDeliveryAddress } from "@/lib/own-delivery";
import { cameFrom, codeDiscount, type OfferType } from "@/lib/offer-codes";
import { analyticsId, track } from "@/lib/analytics";

// A win-back offer code from the link, as /api/store/[subdomain]?code= sends it.
type CodeOffer = { code: string; type: OfferType; value: number; label: string; ends: string };

// The ordering rules as /api/store/[subdomain] sends them.
type DeliveryInfo = { fee: number; min_order: number; extra_minutes: number; areas: string[] };
type OrderingInfo = { hours: OrderingRules["week"]; timezone: string; prep_minutes: number; paused: boolean; now: string; delivery?: DeliveryInfo | null };
const rulesFrom = (o: OrderingInfo): OrderingRules =>
  ({ week: o.hours ?? null, timezone: o.timezone, prepMinutes: o.prep_minutes, paused: o.paused });

const INPUT_STYLE: React.CSSProperties = { width:"100%", marginBottom:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", color:"#F8FAFB", borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" };

const BASE = { g:"#00AD82", st:"#8B9DB5", cl:"#F8FAFB", navy:"#0F1F2D", card:"#1C2D48", mist:"rgba(255,255,255,.08)", r:"#FF4757" };

// Readable text colour on the restaurant's brand colour.
function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45 ? "#0F1F2D" : "#FFFFFF";
}

// One line per item and set of options. price is the unit price with options.
// A menu item as /api/store/[subdomain] sends it.
type MenuEntry = { id: string; name: string; price: number; description?: string | null; image_url?: string; options?: unknown };

const plainLine = (item: MenuEntry): CartItem =>
  ({ key: item.id, id: item.id, name: item.name, price: Number(item.price), qty: 1, image_url: item.image_url, options: [], label: "" });

interface CartItem { key:string; id:string; name:string; price:number; qty:number; image_url?:string; options:string[]; label:string }
type Picking = { item: MenuEntry; groups: OptionGroup[]; picked: string[]; qty: number };

export default function StorefrontPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);
  const router = useRouter();

  const [biz,       setBiz]       = useState<any>(null);
  const [menu,      setMenu]      = useState<any[]>([]);
  const [cart,      setCart]      = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [customer,  setCustomer]  = useState({ name:"", phone:"", email:"", marketingOptIn:false });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [checking,  setChecking]  = useState(false);
  const [showCart,  setShowCart]  = useState(false);
  const [notice,    setNotice]    = useState("");
  const [siteHref,  setSiteHref]  = useState<string | null>(null);
  const [picking,   setPicking]   = useState<Picking | null>(null);
  // Pick-up time: "asap" or the ISO time of a slot. The server's clock is
  // used, so a phone set to the wrong time still sees the right choices.
  const [pickup,      setPickup]      = useState<string>("asap");
  const [clockOffset, setClockOffset] = useState(0);
  // Pick-up or delivery by the shop's own driver, the address, and a note.
  const [fulfilment,  setFulfilment]  = useState<"pickup" | "delivery">("pickup");
  const [address,     setAddress]     = useState({ line1: "", suburb: "", postcode: "" });
  const [note,        setNote]        = useState("");
  const [tick,        setTick]        = useState(0);
  // A win-back code (?code=) and where the link came from (?src=), sent on to checkout.
  const [codeOffer,    setCodeOffer]    = useState<CodeOffer | null>(null);
  const [codeProblem,  setCodeProblem]  = useState<string | null>(null);
  const [src,          setSrc]          = useState<string | null>(null);

  // Brand colour on buttons and prices, ZentraBite green if none is set.
  const accent = biz?.accent_color ?? BASE.g;
  const C = { ...BASE, g: accent, onG: textOn(accent) };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    fetch(`/api/store/${subdomain}${code ? `?code=${encodeURIComponent(code)}` : ""}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setBiz(data.business);
        setCodeOffer((data.offer as CodeOffer | null) ?? null);
        setCodeProblem((data.offer_problem as string | null) ?? null);
        setSrc(query.get("src"));
        setMenu(data.menu);
        const ordering = data.business?.ordering as OrderingInfo | undefined;
        const offset = ordering?.now ? Date.parse(ordering.now) - Date.now() : 0;
        setClockOffset(Number.isFinite(offset) ? offset : 0);
        const shut = ordering ? ["paused", "closed"].includes(pickupPlan(rulesFrom(ordering), new Date(Date.now() + offset)).state) : false;
        if (data.menu.length > 0) setActiveTab(data.menu[0].id);
        // Link back to their website. On name.zentrabite.com that's "/".
        if (data.business?.has_website) {
          setSiteHref(window.location.pathname === "/order" ? "/" : `/site/${subdomain}`);
        }
        // "+" on the website links here with ?add=<item id>. An item with
        // options opens its picker instead of going straight in the order.
        const add = new URLSearchParams(window.location.search).get("add");
        if (add && data.business?.taking_orders && !shut) {
          for (const section of data.menu) {
            const item = section.items.find((i: { id: string }) => i.id === add);
            if (item) {
              setActiveTab(section.id);
              const groups = readOptions(item.options);
              if (groups.length) setPicking({ item, groups, picked: [], qty: 1 });
              else setCart([plainLine(item)]);
              break;
            }
          }
        }
        setLoading(false);
        track("ordering", "ordering_viewed", {
          shop: String(data.business?.id ?? subdomain), came_from: cameFrom(query.get("src"), Boolean(data.offer)),
          taking_orders: Boolean(data.business?.taking_orders), has_code: Boolean(data.offer),
        });
      })
      .catch(() => { setError("Failed to load menu"); setLoading(false); });
  }, [subdomain]);

  const addLine = (line: CartItem) => {
    track("ordering", "item_added", { shop: String(biz?.id ?? subdomain) });
    setCart(prev => {
      const existing = prev.find(c => c.key === line.key);
      if (existing) return prev.map(c => c.key === line.key ? { ...c, qty: c.qty + line.qty } : c);
      return [...prev, line];
    });
  };

  const addToCart = (item: any) => {
    const groups = readOptions(item.options);
    if (groups.length) setPicking({ item, groups, picked: [], qty: 1 });
    else addLine(plainLine(item));
  };

  const addPicked = () => {
    if (!picking) return;
    const priced = priceSelection(Number(picking.item.price), picking.groups, picking.picked);
    if (!priced.ok) return;
    addLine({
      key: lineKey(picking.item.id, priced.choiceIds), id: picking.item.id, name: picking.item.name,
      price: priced.unitPrice, qty: picking.qty, image_url: picking.item.image_url,
      options: priced.choiceIds, label: optionsLabel(priced.chosen),
    });
    setPicking(null);
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.key !== key));
    else setCart(prev => prev.map(c => c.key === key ? { ...c, qty } : c));
  };

  // Refresh the pick-up choices every half minute while the page is open.
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const tz = (biz?.ordering?.timezone as string | undefined) ?? DEFAULT_TIMEZONE;
  const plan = useMemo(
    () => (biz?.ordering ? pickupPlan(rulesFrom(biz.ordering as OrderingInfo), new Date(Date.now() + clockOffset)) : null),
    // tick re-runs this as time passes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [biz, clockOffset, tick],
  );
  const canOrder = Boolean(biz?.taking_orders) && plan?.state !== "paused" && plan?.state !== "closed";

  // Delivery, if the shop offers it. Its times add the drive time.
  const deliveryInfo = (biz?.ordering?.delivery as DeliveryInfo | null | undefined) ?? null;
  // The shop's first order offer (lib/first-order.ts). Checkout decides who gets it, from the mobile number.
  // A win-back code replaces it, so it isn't shown alongside one.
  const firstOrder = codeOffer ? null : (biz?.ordering?.first_order as { amount: number; min_order: number } | null | undefined) ?? null;
  const isDelivery = fulfilment === "delivery" && Boolean(deliveryInfo);
  const timePlan = useMemo(() => {
    if (!biz?.ordering || !isDelivery || !deliveryInfo) return plan;
    const r = rulesFrom(biz.ordering as OrderingInfo);
    return pickupPlan({ ...r, prepMinutes: r.prepMinutes + deliveryInfo.extra_minutes }, new Date(Date.now() + clockOffset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, isDelivery, deliveryInfo]);

  // The picked time if it's still on offer, otherwise the first choice.
  const slotIsos = timePlan && (timePlan.state === "open" || timePlan.state === "later") ? timePlan.slots.map(d => d.toISOString()) : [];
  const asapOk = timePlan?.state === "open" || timePlan?.state === "anytime" || !timePlan;
  const pickupChoice = (pickup === "asap" && asapOk) || slotIsos.includes(pickup) ? pickup : (asapOk ? "asap" : slotIsos[0] ?? "asap");

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const deliveryFee = isDelivery && deliveryInfo ? deliveryInfo.fee : 0;
  // What the code takes off, worked out the same way as checkout.
  const codeOff = codeOffer ? codeDiscount(codeOffer, Math.round(total * 100), Math.round(deliveryFee * 100)) : null;
  const codeSaving = (codeOff?.cents ?? 0) / 100;
  const grandTotal = total + deliveryFee - codeSaving;
  // Only checked once the suburb and postcode are both filled in.
  const addressCheck = isDelivery && deliveryInfo && address.suburb.trim() && address.postcode.trim()
    ? checkDeliveryAddress({ enabled: true, fee: deliveryInfo.fee, minOrder: deliveryInfo.min_order, extraMinutes: deliveryInfo.extra_minutes, areas: deliveryInfo.areas }, address)
    : null;
  // What still stops the order, in the words the Pay button shows.
  const blocker =
    !customer.name.trim() ? "Enter your name to continue"
    : timePlan && (timePlan.state === "closed" || timePlan.state === "paused") ? (isDelivery ? "Delivery has finished for today" : "We're closed right now")
    : isDelivery && deliveryInfo && total < deliveryInfo.min_order ? `Delivery needs $${deliveryInfo.min_order.toFixed(2)} or more`
    : isDelivery && (!address.line1.trim() || !addressCheck) ? "Add your delivery address"
    : isDelivery && addressCheck && !addressCheck.ok ? "We don't deliver there yet"
    : isDelivery && !customer.phone.trim() ? "Add your phone number"
    : null;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleCheckout = async () => {
    if (blocker) return;
    setChecking(true);
    const shop = String(biz?.id ?? subdomain);
    track("ordering", "checkout_started", { shop, items: cartCount, total: Math.round(grandTotal * 100) / 100, fulfilment: isDelivery ? "delivery" : "pickup", has_code: Boolean(codeOffer) });
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain, items: cart.map(c => ({ id: c.id, qty: c.qty, options: c.options })), customer, pickup: pickupChoice,
          fulfilment: isDelivery ? "delivery" : "pickup", address: isDelivery ? address : undefined, note: note.trim() || undefined,
          code: codeOffer?.code, src: src ?? undefined,
          // The random id this visit is counted under, so the paid order joins it. Only when counting is on.
          ph: analyticsId("ordering") ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        track("ordering", "checkout_refused", { shop, status: res.status });
        setNotice(data.error ?? "Couldn't start checkout. Please try again.");
      }
    } catch { setNotice("Network error. Check your connection and try again."); }
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
      <Icon name="menu" size={40} />
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
              <img src={biz.logo_url} alt={biz.name} style={{ height:38, maxWidth:120, borderRadius:8, objectFit:"contain" }} />
            ) : (
              <div style={{ width:38, height:38, borderRadius:10, background:C.g, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:C.onG }}>
                {biz?.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:C.cl }}>{biz?.name}</div>
              {siteHref
                ? <a href={siteHref} style={{ fontSize:11, color:C.st, textDecoration:"none" }}>← Back to our website</a>
                : biz?.suburb && <div style={{ fontSize:11, color:C.st }}>{biz.suburb}</div>}
            </div>
          </div>

          {cartCount > 0 && (
            <button onClick={() => setShowCart(!showCart)} style={{
              display:"flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:10,
              background:C.g, border:"none", color:C.onG, fontWeight:700, fontSize:13, cursor:"pointer",
            }}>
              <Icon name="storefront" size={16} accent={C.onG} />{cartCount} · ${total.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"0 20px 100px" }}>

        {/* Not connected to Stripe yet: customers can browse, but can't pay online */}
        {biz && !biz.taking_orders && (
          <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:"rgba(255,193,75,.1)", border:"1px solid rgba(255,193,75,.3)", color:"#FFC14B", fontSize:13, lineHeight:1.5 }}>
            Online payments aren&apos;t set up yet.{biz.phone ? <> Call <a href={`tel:${String(biz.phone).replace(/[^\d+]/g, "")}`} style={{ color:"#FFC14B", fontWeight:700 }}>{biz.phone}</a> to order.</> : " Please order in store for now."}
          </div>
        )}

        {/* Paused, closed, or open later today */}
        {biz?.taking_orders && plan && (plan.state === "paused" || plan.state === "closed") && (
          <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:"rgba(255,193,75,.1)", border:"1px solid rgba(255,193,75,.3)", color:"#FFC14B", fontSize:13, lineHeight:1.5 }}>
            {plan.state === "paused"
              ? <>We&apos;ve paused online orders for now.{biz.phone ? <> Call <a href={`tel:${String(biz.phone).replace(/[^\d+]/g, "")}`} style={{ color:"#FFC14B", fontWeight:700 }}>{biz.phone}</a> to order.</> : " Please try again soon."}</>
              : <>We&apos;re closed for online orders right now.{plan.nextOpen ? ` ${plan.nextOpen}.` : ""}</>}
          </div>
        )}
        {biz?.taking_orders && plan?.state === "later" && plan.slots[0] && (
          <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:`color-mix(in srgb, ${C.g} 12%, transparent)`, color:C.cl, fontSize:13, lineHeight:1.5 }}>
            {`We're closed until ${shopTime(plan.opensAt, tz)}. Order now for pick-up from ${shopTime(plan.slots[0], tz)}.`}
          </div>
        )}
        {biz?.taking_orders && codeOffer && (
          <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, border:`1px solid color-mix(in srgb, ${C.g} 35%, transparent)`, color:C.cl, fontSize:13, lineHeight:1.5 }}>
            {codeOffer.type === "free_delivery"
              ? `Free delivery on this order with your code ${codeOffer.code}. Choose delivery at checkout. Ends ${codeOffer.ends}.`
              : `${codeOffer.label.charAt(0).toUpperCase()}${codeOffer.label.slice(1)} this order with your code ${codeOffer.code}. It comes off at checkout. Ends ${codeOffer.ends}.`}
          </div>
        )}
        {codeProblem && (
          <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, background:"rgba(255,193,75,.1)", border:"1px solid rgba(255,193,75,.3)", color:"#FFC14B", fontSize:13, lineHeight:1.5 }}>
            {`${codeProblem} You can still order at the normal price.`}
          </div>
        )}
        {biz?.taking_orders && firstOrder && (
          <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, border:`1px solid color-mix(in srgb, ${C.g} 35%, transparent)`, color:C.cl, fontSize:13, lineHeight:1.5 }}>
            {`$${firstOrder.amount % 1 ? firstOrder.amount.toFixed(2) : firstOrder.amount} off your first online order of $${firstOrder.min_order % 1 ? firstOrder.min_order.toFixed(2) : firstOrder.min_order} or more. Add your mobile number at checkout.`}
          </div>
        )}

        {/* Category tabs */}
        {menu.length > 1 && (
          <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"16px 0", scrollbarWidth:"none" }}>
            {menu.map(s => (
              <button key={s.id} onClick={() => setActiveTab(s.id)} style={{
                padding:"8px 16px", borderRadius:20, border:`1px solid ${activeTab===s.id?C.g:C.mist}`,
                background:activeTab===s.id?`color-mix(in srgb, ${C.g} 15%, transparent)`:"transparent",
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
            const groups = readOptions(item.options);
            const inCart = groups.length ? undefined : cart.find(c => c.key === item.id);
            const countInCart = cart.filter(c => c.id === item.id).reduce((n, c) => n + c.qty, 0);
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
                    <div style={{ fontWeight:700, fontSize:15, color:C.g }}>
                      {pricesVary(groups) ? `From $${cheapestPrice(Number(item.price), groups).toFixed(2)}` : `$${Number(item.price).toFixed(2)}`}
                    </div>
                    {!canOrder ? null : groups.length ? (
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {countInCart > 0 && <span style={{ fontSize:12, color:C.st }}>{countInCart} in order</span>}
                        <button onClick={() => addToCart(item)} style={{ padding:"7px 18px", borderRadius:8, background:C.g, border:"none", color:C.onG, fontWeight:700, fontSize:13, cursor:"pointer" }}>Add</button>
                      </div>
                    ) : inCart ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <button onClick={() => updateQty(inCart.key, inCart.qty - 1)} style={{ width:28, height:28, borderRadius:7, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                        <span style={{ fontWeight:700, fontSize:13, color:C.cl, minWidth:16, textAlign:"center" }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(inCart.key, inCart.qty + 1)} style={{ width:28, height:28, borderRadius:7, background:C.g, border:"none", color:C.onG, cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} style={{ padding:"7px 18px", borderRadius:8, background:C.g, border:"none", color:C.onG, fontWeight:700, fontSize:13, cursor:"pointer" }}>Add</button>
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
              <div key={item.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.mist}` }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:C.cl }}>{item.name}</div>
                  {item.label && <div style={{ fontSize:12, color:C.st, lineHeight:1.4 }}>{item.label}</div>}
                  <div style={{ fontSize:11, color:C.st }}>${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button onClick={() => updateQty(item.key, item.qty - 1)} style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontWeight:700, fontSize:13, color:C.cl, minWidth:16, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.key, item.qty + 1)} style={{ width:26, height:26, borderRadius:6, background:`color-mix(in srgb, ${C.g} 20%, transparent)`, border:"none", color:C.g, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              </div>
            ))}

            {/* Pick-up or delivery, when the shop delivers */}
            {deliveryInfo && (
              <div role="radiogroup" aria-label="Pick-up or delivery" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, paddingTop:16 }}>
                {(["pickup", "delivery"] as const).map(f => (
                  <button key={f} type="button" role="radio" aria-checked={fulfilment === f} onClick={() => setFulfilment(f)} style={{
                    minHeight:44, borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer",
                    border:`1px solid ${fulfilment === f ? C.g : C.mist}`,
                    background: fulfilment === f ? `color-mix(in srgb, ${C.g} 15%, transparent)` : "transparent",
                    color: fulfilment === f ? C.cl : C.st,
                  }}>
                    {f === "pickup" ? "Pick-up" : `Delivery${deliveryInfo.fee > 0 ? ` +$${deliveryInfo.fee.toFixed(2)}` : ""}`}
                  </button>
                ))}
              </div>
            )}

            {/* Delivery address */}
            {isDelivery && deliveryInfo && (
              <div style={{ padding:"16px 0 8px", borderBottom:`1px solid ${C.mist}` }}>
                <div style={{ fontWeight:700, fontSize:15, color:C.cl, marginBottom:10 }}>Deliver to</div>
                <input value={address.line1} onChange={e=>setAddress(a=>({...a,line1:e.target.value}))} placeholder="Street address *" autoComplete="address-line1" style={INPUT_STYLE} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 110px", gap:8 }}>
                  <input value={address.suburb} onChange={e=>setAddress(a=>({...a,suburb:e.target.value}))} placeholder="Suburb *" autoComplete="address-level2" style={INPUT_STYLE} />
                  <input value={address.postcode} onChange={e=>setAddress(a=>({...a,postcode:e.target.value.replace(/\D/g, "").slice(0, 4)}))} placeholder="Postcode *" inputMode="numeric" autoComplete="postal-code" style={INPUT_STYLE} />
                </div>
                {addressCheck && !addressCheck.ok && <div style={{ fontSize:12, color:"#FFC14B", marginBottom:8 }}>{addressCheck.error}</div>}
                {deliveryInfo.min_order > 0 && total < deliveryInfo.min_order && (
                  <div style={{ fontSize:12, color:"#FFC14B", marginBottom:8 }}>Delivery is for orders of ${deliveryInfo.min_order.toFixed(2)} or more.</div>
                )}
              </div>
            )}

            {/* Pick-up or delivery time */}
            {timePlan && (
              <div style={{ padding:"16px 0", borderBottom:`1px solid ${C.mist}` }}>
                <label htmlFor="pickup-time" style={{ display:"block", fontWeight:700, fontSize:15, color:C.cl, marginBottom:10 }}>{isDelivery ? "Delivery time" : "Pick-up time"}</label>
                {timePlan.state === "paused" || timePlan.state === "closed" ? (
                  <div style={{ fontSize:13, color:"#FFC14B" }}>{isDelivery ? "Delivery has finished for today. You can still pick it up." : "We're closed for online orders right now."}</div>
                ) : timePlan.state === "anytime" ? (
                  <div style={{ fontSize:13, color:C.st }}>As soon as possible, about {shopTime(timePlan.asap, tz)}</div>
                ) : (
                  <select id="pickup-time" value={pickupChoice} onChange={e => setPickup(e.target.value)} style={{ width:"100%", minHeight:44, background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:14, boxSizing:"border-box" }}>
                    {timePlan.state === "open" && <option value="asap">ASAP, about {shopTime(timePlan.asap, tz)}</option>}
                    {timePlan.slots.map(d => <option key={d.toISOString()} value={d.toISOString()}>Today at {shopTime(d, tz)}</option>)}
                  </select>
                )}
              </div>
            )}

            <div style={{ padding:"16px 0", borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontWeight:700, fontSize:15, color:C.cl, marginBottom:12 }}>Your details</div>
              {firstOrder && (
                <div style={{ marginBottom:10, padding:"10px 12px", borderRadius:8, background:"rgba(0,173,130,.12)", border:"1px solid rgba(0,173,130,.3)", fontSize:13, lineHeight:1.5, color:C.cl }}>
                  {total >= firstOrder.min_order
                    ? `First online order here? $${firstOrder.amount.toFixed(2)} comes off at checkout. Add your mobile number to get it.`
                    : `First online order here? Spend $${(firstOrder.min_order - total).toFixed(2)} more and $${firstOrder.amount.toFixed(2)} comes off at checkout.`}
                </div>
              )}
              <input value={customer.name} onChange={e=>setCustomer(c=>({...c,name:e.target.value}))} placeholder="Your name *" style={{ width:"100%", marginBottom:8, background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
              <input type="tel" value={customer.phone} onChange={e=>setCustomer(c=>({...c,phone:e.target.value}))} placeholder={isDelivery ? "Phone number *" : firstOrder ? "Mobile number, for the first order offer" : "Phone number"} autoComplete="tel" style={{ width:"100%", marginBottom:8, background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
              <input type="email" value={customer.email} onChange={e=>setCustomer(c=>({...c,email:e.target.value}))} placeholder="Email (for receipt)" style={{ width:"100%", background:"rgba(255,255,255,.06)", border:`1px solid ${C.mist}`, color:C.cl, borderRadius:8, padding:"10px 12px", fontSize:13, boxSizing:"border-box" }} />
              {/* Marketing consent. Its own unticked box, separate from the order (Spam Act). */}
              <label style={{ display:"flex", gap:10, alignItems:"flex-start", marginTop:12, fontSize:12, lineHeight:1.5, color:C.st, cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={customer.marketingOptIn}
                  onChange={e=>setCustomer(c=>({...c,marketingOptIn:e.target.checked}))}
                  style={{ marginTop:2, width:16, height:16, flexShrink:0 }}
                />
                <span>Send me offers and rewards from {biz?.name ?? "this restaurant"} by text and email. Unsubscribe any time by replying STOP.</span>
              </label>
              <textarea value={note} onChange={e=>setNote(e.target.value.slice(0, 300))} rows={2} maxLength={300}
                aria-label="Note for the order"
                placeholder={isDelivery ? "Note for the kitchen or driver (optional)" : "Note for the kitchen (optional)"}
                style={{ ...INPUT_STYLE, marginTop:12, marginBottom:0, resize:"vertical", fontFamily:"inherit" }} />
            </div>

            {deliveryFee > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:14, fontSize:13, color:C.st }}>
                <span>Delivery</span><span>${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {codeOffer && (codeSaving > 0 ? (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:14, fontSize:13, color:C.cl }}>
                <span>{`Offer code ${codeOffer.code}, ${codeOffer.label}`}</span><span>-${codeSaving.toFixed(2)}</span>
              </div>
            ) : codeOff?.note ? (
              <div style={{ paddingTop:14, fontSize:13, color:"#FFC14B" }}>{codeOff.note}</div>
            ) : null)}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0" }}>
              <span style={{ color:C.st, fontSize:13 }}>Total</span>
              <span style={{ fontWeight:800, fontSize:20, color:C.cl }}>${grandTotal.toFixed(2)}</span>
            </div>

            {notice && (
              <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:10, background:"rgba(255,71,87,.12)", border:"1px solid rgba(255,71,87,.3)", color:C.r, fontSize:13, lineHeight:1.45 }}>
                {notice}
              </div>
            )}

            <button onClick={handleCheckout} disabled={checking || Boolean(blocker)} style={{
              width:"100%", padding:"15px", borderRadius:12, border:"none",
              background: blocker ? "rgba(255,255,255,.08)" : C.g,
              color: blocker ? C.st : C.onG,
              fontWeight:700, fontSize:15, cursor: blocker ? "not-allowed" : "pointer",
              opacity: checking ? .7 : 1,
            }}>
              {checking ? "Opening payment…" : blocker ?? `Pay $${grandTotal.toFixed(2)} →`}
            </button>
          </div>
        </div>
      )}

      {/* Options picker: sizes, extras and choices for one item */}
      {picking && (() => {
        const priced = priceSelection(Number(picking.item.price), picking.groups, picking.picked);
        const missing = missingGroup(picking.groups, picking.picked);
        return (
          <div style={{ position:"fixed", inset:0, zIndex:110, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
            <div onClick={() => setPicking(null)} style={{ flex:1, background:"rgba(0,0,0,.5)" }} />
            <div role="dialog" aria-modal="true" aria-label={`Choose options for ${picking.item.name}`} style={{ background:"#1A2E45", borderRadius:"20px 20px 0 0", padding:"22px 20px calc(24px + env(safe-area-inset-bottom))", maxHeight:"88vh", overflowY:"auto" }}>
              <div style={{ maxWidth:680, margin:"0 auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:6 }}>
                  <div style={{ fontWeight:700, fontSize:18, color:C.cl }}>{picking.item.name}</div>
                  <button onClick={() => setPicking(null)} aria-label="Close" style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.08)", border:"none", color:C.cl, fontSize:18, cursor:"pointer", flexShrink:0 }}>×</button>
                </div>
                {picking.item.description && <div style={{ fontSize:13, color:C.st, lineHeight:1.5, marginBottom:16 }}>{picking.item.description}</div>}
                <OptionPicker
                  groups={picking.groups}
                  picked={picking.picked}
                  onChange={next => setPicking(p => p && { ...p, picked: next })}
                  colors={{ text:C.cl, muted:C.st, accent:C.g, onAccent:C.onG, line:C.mist }}
                />
                <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={() => setPicking(p => p && { ...p, qty: Math.max(1, p.qty - 1) })} aria-label="One less" style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:18 }}>−</button>
                    <span style={{ fontWeight:700, fontSize:15, color:C.cl, minWidth:20, textAlign:"center" }}>{picking.qty}</span>
                    <button onClick={() => setPicking(p => p && { ...p, qty: Math.min(50, p.qty + 1) })} aria-label="One more" style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.1)", border:"none", color:C.cl, cursor:"pointer", fontSize:18 }}>+</button>
                  </div>
                  <button onClick={addPicked} disabled={!priced.ok} style={{
                    flex:1, minHeight:48, borderRadius:12, border:"none",
                    background: priced.ok ? C.g : "rgba(255,255,255,.08)", color: priced.ok ? C.onG : C.st,
                    fontWeight:700, fontSize:15, cursor: priced.ok ? "pointer" : "not-allowed",
                  }}>
                    {priced.ok ? `Add to order · $${(priced.unitPrice * picking.qty).toFixed(2)}` : missing ? `Choose ${missing.name.toLowerCase()}` : "Check your choices"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating cart button when cart has items and panel is closed */}
      {cartCount > 0 && !showCart && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:50 }}>
          <button onClick={() => setShowCart(true)} style={{
            padding:"14px 28px", borderRadius:14, background:C.g, border:"none",
            color:C.onG, fontWeight:700, fontSize:14, cursor:"pointer",
            boxShadow:`0 8px 32px color-mix(in srgb, ${C.g} 40%, transparent)`,
          }}>
            <Icon name="storefront" size={16} accent={C.onG} style={{ marginRight: 6 }} />View order · {cartCount} items · ${total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
