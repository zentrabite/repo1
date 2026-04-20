"use client";

const C = { g:"#00B67A", st:"#6B7C93" };

export default function AICallsPage() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center", gap:16 }}>
      <div style={{ fontSize:52 }}>🚧</div>
      <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:"#fff", margin:0 }}>
        AI Calls — Under Development
      </h2>
      <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, maxWidth:380, lineHeight:1.7, margin:0 }}>
        The AI call system is currently being built. Once live, it will automatically call your customers to confirm bookings, recover lapsed clients, and handle follow-ups — all without lifting a finger.
      </p>
      <div style={{ marginTop:8, padding:"8px 18px", borderRadius:20, background:"rgba(0,182,122,.08)", border:"1px solid rgba(0,182,122,.15)", fontSize:12, color:C.g, fontWeight:500 }}>
        Coming soon
      </div>
    </div>
  );
}
