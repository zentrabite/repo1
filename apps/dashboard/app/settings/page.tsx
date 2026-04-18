"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { supabase } from "@/lib/supabase";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:15, color:C.cl, marginBottom:18 }}>
      {children}
    </div>
  );
}

// ─── Field row inside a settings card ────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginBottom:6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"4px 12px", borderRadius:999,
      background: active ? "rgba(0,182,122,.12)" : "rgba(107,124,147,.14)",
      color: active ? C.g : C.st,
      fontFamily:"var(--font-outfit)", fontSize:12, fontWeight:600,
      border: `1px solid ${active ? "rgba(0,182,122,.25)" : "rgba(107,124,147,.2)"}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: active ? C.g : C.st, flexShrink:0 }} />
      {label}
    </span>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width:44, height:24, borderRadius:12, flexShrink:0,
        background: on ? "rgba(0,182,122,.3)" : "rgba(226,232,240,.1)",
        border: `1px solid ${on ? "rgba(0,182,122,.4)" : C.mist}`,
        cursor:"pointer", position:"relative", transition:"all .2s",
      }}
    >
      <div style={{
        width:18, height:18, borderRadius:"50%",
        background: on ? C.g : C.st,
        position:"absolute", top:2.5, left: on ? 22.5 : 2.5,
        transition:"all .2s", boxShadow:"0 1px 4px rgba(0,0,0,.3)",
      }} />
    </div>
  );
}

function SettingsContent() {
  const { toast, show } = useToast();
  const searchParams = useSearchParams();
  const { businessId, business, email } = useBusiness();

  // ── Local state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: "", type:"Restaurant", location: "",
    subdomain:"",
  });

  // Populate form from real business data
  useEffect(() => {
    if (business) {
      setProfile({ name: business.name, type: business.type, location: business.suburb ?? "", subdomain: business.subdomain ?? "" });
    }
  }, [business]);
  const [winback, setWinback] = useState({
    enabled:true, trigger:"14", discount:"10", cooldown:"30",
  });
  const [team, setTeam] = useState([
    { email:"owner@email.com", role:"Owner" },
  ]);
  const [invite, setInvite] = useState("");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"inactive"|"trialing"|"active">("inactive");
  const [connectLoading, setConnectLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ── Handle Stripe return redirects ──────────────────────────────────────
  useEffect(() => {
    const stripe = searchParams.get("stripe");
    const sub    = searchParams.get("subscription");
    if (stripe === "success") { setStripeConnected(true); show("Stripe connected ✓"); }
    if (stripe === "refresh") show("Please complete Stripe onboarding");
    if (sub === "success")    { setSubscriptionStatus("active"); show("Subscription activated ✓"); }
    if (sub === "cancelled")  show("Subscription setup cancelled");
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stripe Connect ───────────────────────────────────────────────────────
  const handleStripeConnect = async () => {
    setConnectLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        show(data.error ?? "Failed to start Stripe onboarding");
      }
    } catch {
      show("Network error — check your Stripe keys in .env.local");
    } finally {
      setConnectLoading(false);
    }
  };

  // ── Stripe Checkout (subscription) ──────────────────────────────────────
  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ business_id: businessId, email: email ?? team[0]?.email ?? "" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        show(data.error ?? "Failed to start checkout");
      }
    } catch {
      show("Network error — check your Stripe keys in .env.local");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const addMember = () => {
    if (!invite.trim()) return show("Enter an email address first");
    setTeam(t => [...t, { email:invite.trim(), role:"Staff" }]);
    setInvite("");
    show("Invite sent ✓");
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:22, color:C.cl }}>Settings</h2>
          <p style={{ fontFamily:"var(--font-inter)", fontSize:14, color:C.st, marginTop:4 }}>
            Business profile & configuration
          </p>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Business Profile */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Business Profile</SectionTitle>
            <Field label="Business Name">
              <input value={profile.name} onChange={e => setProfile(p=>({...p,name:e.target.value}))} />
            </Field>
            <Field label="Business Type">
              <select value={profile.type} onChange={e => setProfile(p=>({...p,type:e.target.value}))}>
                {["Restaurant","Café","Hair Salon","Beauty","Mechanic","Dental"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input value={profile.location} onChange={e => setProfile(p=>({...p,location:e.target.value}))} />
            </Field>
            <Field label="Subdomain">
              <input value={profile.subdomain} onChange={e => setProfile(p=>({...p,subdomain:e.target.value}))} />
            </Field>
            <button className="bp" style={{ width:"100%", justifyContent:"center", marginTop:4 }} onClick={async () => {
              if (!businessId) return;
              await supabase.from("businesses").update({ name:profile.name, type:profile.type, suburb:profile.location, subdomain:profile.subdomain }).eq("id", businessId);
              show("Profile saved ✓");
            }}>
              Save Profile
            </button>
          </div>

          {/* Win-Back Config */}
          <div className="gc" style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <SectionTitle>Win-Back Engine</SectionTitle>
              <Toggle on={winback.enabled} onChange={v => { setWinback(w=>({...w,enabled:v})); show(v?"Win-Back enabled ✓":"Win-Back paused"); }} />
            </div>
            <Field label="Inactivity trigger (days)">
              <input type="number" value={winback.trigger} onChange={e => setWinback(w=>({...w,trigger:e.target.value}))} />
            </Field>
            <Field label="Discount amount ($)">
              <input type="number" value={winback.discount} onChange={e => setWinback(w=>({...w,discount:e.target.value}))} />
            </Field>
            <Field label="Cooldown period (days)">
              <input type="number" value={winback.cooldown} onChange={e => setWinback(w=>({...w,cooldown:e.target.value}))} />
            </Field>
            <button className="bp" style={{ width:"100%", justifyContent:"center", marginTop:4 }} onClick={() => show("Win-Back config saved ✓")}>
              Save Config
            </button>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Stripe Connect */}
          <div className="gc" style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <SectionTitle>Stripe Payments</SectionTitle>
              <StatusPill active={stripeConnected} label={stripeConnected ? "Connected" : "Not connected"} />
            </div>

            {stripeConnected ? (
              <div>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, lineHeight:1.6, marginBottom:16 }}>
                  Your Stripe Express account is connected. Payments from your storefront will go directly to your bank account (minus Stripe&apos;s processing fee).
                </div>
                <div style={{ padding:"12px 16px", background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.15)", borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.g, fontWeight:600 }}>
                    ✓ Payments enabled · Direct to your bank
                  </div>
                </div>
                <button className="bg-btn" style={{ width:"100%", justifyContent:"center" }} onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
                  Open Stripe Dashboard ↗
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, lineHeight:1.6, marginBottom:16 }}>
                  Connect Stripe so customers can pay and funds go directly to your bank. Takes about 5 minutes.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16, fontSize:13, color:C.st, fontFamily:"var(--font-inter)" }}>
                  {["Accept card payments from customers","Funds deposited directly to your bank","Stripe handles all compliance & security"].map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ color:C.g, fontWeight:700 }}>✓</span> {item}
                    </div>
                  ))}
                </div>
                <button
                  className="bp"
                  style={{ width:"100%", justifyContent:"center" }}
                  onClick={handleStripeConnect}
                  disabled={connectLoading}
                >
                  {connectLoading ? "Opening Stripe…" : "Connect Stripe →"}
                </button>
              </div>
            )}
          </div>

          {/* Subscription */}
          <div className="gc" style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <SectionTitle>Subscription</SectionTitle>
              <StatusPill
                active={subscriptionStatus === "active" || subscriptionStatus === "trialing"}
                label={subscriptionStatus === "active" ? "Active" : subscriptionStatus === "trialing" ? "Free trial" : "Inactive"}
              />
            </div>

            {subscriptionStatus === "inactive" ? (
              <div>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, lineHeight:1.6, marginBottom:16 }}>
                  Start your 14-day free trial. No credit card required until the trial ends.
                </div>
                <div style={{ padding:"16px", background:"rgba(28,45,72,.5)", borderRadius:12, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
                    <span style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:C.cl }}>$500</span>
                    <span style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st }}>/month AUD</span>
                  </div>
                  <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st }}>
                    All features · SMS credits · AI calls · BiteBack network
                  </div>
                </div>
                <button
                  className="bp"
                  style={{ width:"100%", justifyContent:"center" }}
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Opening checkout…" : "Start 14-Day Free Trial →"}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ padding:"12px 16px", background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.15)", borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.g, fontWeight:600 }}>
                    {subscriptionStatus === "trialing" ? "✓ Free trial active — 14 days remaining" : "✓ Pro plan active · $500/month"}
                  </div>
                </div>
                <button className="bg-btn" style={{ width:"100%", justifyContent:"center" }} onClick={() => window.open("https://dashboard.stripe.com/subscriptions", "_blank")}>
                  Manage Subscription ↗
                </button>
              </div>
            )}
          </div>

          {/* Team */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Team</SectionTitle>
            {team.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.mist}`, fontSize:13, fontFamily:"var(--font-inter)" }}>
                <span style={{ color:C.cl }}>{m.email}</span>
                <span style={{
                  padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:600,
                  fontFamily:"var(--font-outfit)",
                  background: m.role==="Owner" ? "rgba(0,182,122,.12)" : "rgba(107,124,147,.14)",
                  color: m.role==="Owner" ? C.g : C.st,
                }}>
                  {m.role}
                </span>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <input
                value={invite}
                onChange={e => setInvite(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addMember()}
                placeholder="teammate@email.com"
                style={{ flex:1 }}
              />
              <button className="bp" style={{ flexShrink:0, padding:"11px 18px" }} onClick={addMember}>
                Invite
              </button>
            </div>
          </div>

        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
