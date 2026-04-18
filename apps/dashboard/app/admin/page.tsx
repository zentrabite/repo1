"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getAllBusinessesStats } from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

function StatBox({ label, value, accent }: { label:string; value:string; accent?:boolean }) {
  return (
    <div style={{ background:"rgba(28,45,72,.5)", border:`1px solid ${accent?"rgba(0,182,122,.2)":C.mist}`, borderRadius:12, padding:"14px 18px", flex:1, minWidth:140 }}>
      <div style={{ fontFamily:"var(--font-inter)", fontSize:11, color:C.st, marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:accent?C.g:C.cl }}>{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const { toast, show } = useToast();
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useBusiness();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    getAllBusinessesStats()
      .then(data => { setBusinesses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isSuperAdmin, authLoading, router]);

  const filtered = businesses.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.suburb ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue   = businesses.reduce((s, b) => s + b.totalRevenue, 0);
  const totalCustomers = businesses.reduce((s, b) => s + b.customerCount, 0);
  const totalSMS       = businesses.reduce((s, b) => s + b.smsSent, 0);
  const totalOrders    = businesses.reduce((s, b) => s + b.orderCount, 0);

  if (authLoading || (loading && isSuperAdmin)) {
    return <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:80, fontFamily:"var(--font-inter)" }}>Loading…</div>;
  }

  if (!isSuperAdmin) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <span style={{ fontSize:22 }}>🔐</span>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:22, color:C.cl }}>Super Admin</h2>
          <span style={{ padding:"3px 10px", borderRadius:999, background:"rgba(255,71,87,.12)", border:"1px solid rgba(255,71,87,.2)", fontSize:11, fontWeight:600, color:C.r, fontFamily:"var(--font-outfit)" }}>ADMIN ONLY</span>
        </div>
        <p style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st }}>All businesses on ZentraBite — combined platform view</p>
      </div>

      {/* Combined stats */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
        <StatBox label="Total Businesses" value={String(businesses.length)} />
        <StatBox label="Total Revenue"    value={`$${totalRevenue.toLocaleString()}`} accent />
        <StatBox label="Total Customers"  value={totalCustomers.toLocaleString()} />
        <StatBox label="Total Orders"     value={totalOrders.toLocaleString()} />
        <StatBox label="SMS Sent"         value={totalSMS.toLocaleString()} />
      </div>

      {/* Search */}
      <div style={{ marginBottom:12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search businesses…" style={{ width:260 }} />
      </div>

      {/* Table */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <table>
          <thead>
            <tr>
              {["Business","Type","Location","Customers","Orders","Revenue","SMS Sent","Stripe","Last Order"].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={9}>{businesses.length === 0 ? "No businesses yet" : "No results"}</td></tr>
            ) : filtered.map((b, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight:600, color:C.cl, fontSize:13 }}>{b.name}</div>
                  {b.subdomain && <div style={{ fontSize:10, color:C.st }}>{b.subdomain}.zentrabite.com</div>}
                </td>
                <td style={{ fontSize:12, color:C.st }}>{b.type}</td>
                <td style={{ fontSize:12, color:C.st }}>{b.suburb ?? "—"}</td>
                <td style={{ fontWeight:600, color:C.cl }}>{b.customerCount}</td>
                <td style={{ fontWeight:600, color:C.cl }}>{b.orderCount}</td>
                <td style={{ fontWeight:700, color:C.g }}>{b.totalRevenue > 0 ? `$${b.totalRevenue.toLocaleString()}` : "—"}</td>
                <td style={{ color:C.st, fontSize:12 }}>{b.smsSent}</td>
                <td>
                  <span style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:999, background:b.stripe_account_id?"rgba(0,182,122,.12)":"rgba(107,124,147,.12)", color:b.stripe_account_id?C.g:C.st, border:`1px solid ${b.stripe_account_id?"rgba(0,182,122,.2)":"rgba(107,124,147,.15)"}` }}>
                    {b.stripe_account_id ? "Connected" : "Not set"}
                  </span>
                </td>
                <td style={{ fontSize:11, color:C.st }}>
                  {b.lastOrder ? new Date(b.lastOrder).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
