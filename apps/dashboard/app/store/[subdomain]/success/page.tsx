"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";

const C = { g:"#00B67A", st:"#8B9DB5", cl:"#F8FAFB", navy:"#0F1F2D", card:"#1C2D48", mist:"rgba(255,255,255,.08)" };

export default function StorefrontSuccessPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [biz, setBiz] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load business info
    fetch(`/api/store/${subdomain}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setBiz(data.business);
      })
      .catch(() => {});

    // Load order details from Stripe session
    if (sessionId) {
      fetch(`/api/store/session?session_id=${sessionId}`)
        .then(r => r.json())
        .then(data => {
          setOrder(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [subdomain, sessionId]);

  return (
    <div style={{ minHeight:"100vh", background:C.navy, fontFamily:"var(--font-inter, sans-serif)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px" }}>

      {/* Success card */}
      <div style={{ width:"100%", maxWidth:440, background:C.card, borderRadius:20, padding:"36px 28px", border:`1px solid ${C.mist}`, textAlign:"center" }}>

        {/* Animated tick */}
        <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(0,182,122,.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:32 }}>
          ✅
        </div>

        <div style={{ fontWeight:800, fontSize:22, color:C.cl, marginBottom:8 }}>Order confirmed!</div>
        <div style={{ fontSize:14, color:C.st, lineHeight:1.5, marginBottom:28 }}>
          {biz?.name ? `Thanks for your order at ${biz.name}.` : "Thanks for your order."}{" "}
          {order?.customer_email ? `A receipt has been sent to ${order.customer_email}.` : "Your payment was processed successfully."}
        </div>

        {/* Order summary */}
        {order?.items && order.items.length > 0 && (
          <div style={{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:"16px", marginBottom:24, textAlign:"left" }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.cl, marginBottom:12 }}>Order summary</div>
            {order.items.map((item: any, i: number) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom: i < order.items.length - 1 ? `1px solid ${C.mist}` : "none" }}>
                <div>
                  <span style={{ fontSize:13, color:C.cl, fontWeight:500 }}>{item.name}</span>
                  {item.qty > 1 && <span style={{ fontSize:11, color:C.st, marginLeft:6 }}>×{item.qty}</span>}
                </div>
                <span style={{ fontSize:13, color:C.st }}>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            {order.total && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, marginTop:4 }}>
                <span style={{ fontWeight:700, fontSize:13, color:C.cl }}>Total</span>
                <span style={{ fontWeight:800, fontSize:16, color:C.g }}>${Number(order.total).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* What's next */}
        <div style={{ background:"rgba(0,182,122,.08)", borderRadius:10, padding:"12px 14px", marginBottom:24, textAlign:"left" }}>
          <div style={{ fontSize:12, color:C.g, fontWeight:600, marginBottom:4 }}>What happens next?</div>
          <div style={{ fontSize:12, color:C.st, lineHeight:1.5 }}>
            The restaurant has received your order and will begin preparing it shortly. You'll be notified when it's ready.
          </div>
        </div>

        {/* Back to menu */}
        <a href={`/store/${subdomain}`} style={{
          display:"block", padding:"14px", borderRadius:12, background:C.g,
          color:C.navy, fontWeight:700, fontSize:14, textDecoration:"none", textAlign:"center",
        }}>
          ← Back to menu
        </a>
      </div>

      {/* Branding */}
      <div style={{ marginTop:24, fontSize:11, color:"rgba(255,255,255,.2)" }}>
        Powered by ZentraBite
      </div>
    </div>
  );
}
