"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get("session_id");
  // sessionId is available here for future use (e.g. "Tracking #${sessionId}")

  return (
    <div style={{ minHeight:"100vh", background:"#0F1F2D", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
        {/* Success icon */}
        <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(0,182,122,.15)", border:"2px solid rgba(0,182,122,.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:32 }}>
          ✅
        </div>

        <h1 style={{ fontSize:26, fontWeight:700, marginBottom:8 }}>Order confirmed!</h1>
        <p style={{ fontSize:15, color:"#6B7C93", lineHeight:1.6, marginBottom:28 }}>
          Your order has been placed and payment received. We&apos;ll have it ready shortly.
        </p>

        {/* What happens next */}
        <div style={{ background:"rgba(28,45,72,.5)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:"20px", textAlign:"left", marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:12 }}>What happens next</div>
          {[
            ["📋", "Your order appears on the kitchen display instantly"],
            ["📱", "You'll receive an SMS confirmation shortly"],
            ["⭐", "You've earned reward points on this order"],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:i<2?10:0, fontSize:13, color:"#6B7C93", lineHeight:1.4 }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/"
          style={{ display:"inline-block", padding:"12px 28px", background:"#00B67A", borderRadius:10, color:"#fff", fontWeight:600, fontSize:14, textDecoration:"none" }}
        >
          Order Again
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmedContent />
    </Suspense>
  );
}
