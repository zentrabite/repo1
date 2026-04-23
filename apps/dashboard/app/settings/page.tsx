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
  const [notifications, setNotifications] = useState({ notify_email: "", notify_phone: "" });

  // Populate form from real business data
  useEffect(() => {
    if (business) {
      setProfile({ name: business.name, type: business.type, location: business.suburb ?? "", subdomain: business.subdomain ?? "" });
      const settings = (business.settings ?? {}) as Record<string, unknown>;
      setNotifications({
        notify_email: (settings.notify_email as string | undefined) ?? "",
        notify_phone: (settings.notify_phone as string | undefined) ?? "",
      });
    }
  }, [business]);

  // Build the customer-facing storefront URL
  const storefrontOrigin =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? window.location.origin)
      : (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "");
  const storefrontUrl = profile.subdomain ? `${storefrontOrigin.replace(/\/$/, "")}/store/${profile.subdomain}` : "";

  // Populate team from real auth user
  useEffect(() => {
    if (email) {
      setTeam([{ email, role: "Owner" }]);
    }
  }, [email]);
  const [team, setTeam] = useState<{ email:string; role:string }[]>([]);
  const [invite, setInvite] = useState("");
  const [stripeConnected, setStripeConnected] = useState(false);
  // Granular Stripe Connect onboarding state — drives the copy on the Stripe card.
  const [stripeCharges, setStripeCharges]   = useState(false); // can accept payments
  const [stripePayouts, setStripePayouts]   = useState(false); // can receive payouts
  const [stripeDetails, setStripeDetails]   = useState(false); // completed onboarding form
  const [subscriptionStatus, setSubscriptionStatus] = useState<"inactive"|"trialing"|"active">("inactive");
  const [connectLoading, setConnectLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    mon: { open: "17:00", close: "21:00", closed: false },
    tue: { open: "17:00", close: "21:00", closed: false },
    wed: { open: "17:00", close: "21:00", closed: false },
    thu: { open: "17:00", close: "21:00", closed: false },
    fri: { open: "17:00", close: "22:00", closed: false },
    sat: { open: "17:00", close: "22:00", closed: false },
    sun: { open: "17:00", close: "21:00", closed: false },
  });

  // Real Stripe + subscription status from the business row
  useEffect(() => {
    if (!business) return;
    const b = business as typeof business & {
      stripe_charges_enabled?:   boolean | null;
      stripe_payouts_enabled?:   boolean | null;
      stripe_details_submitted?: boolean | null;
    };
    setStripeConnected(Boolean(b.stripe_account_id));
    setStripeCharges(Boolean(b.stripe_charges_enabled));
    setStripePayouts(Boolean(b.stripe_payouts_enabled));
    setStripeDetails(Boolean(b.stripe_details_submitted));
    const settings = (b.settings ?? {}) as Record<string, unknown>;
    if (settings.subscription_status) {
      setSubscriptionStatus(settings.subscription_status as any);
    }
    if (settings.hours && typeof settings.hours === "object") {
      setHours(prev => ({ ...prev, ...(settings.hours as any) }));
    }
  }, [business]);

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
            {storefrontUrl && (
              <div style={{
                marginBottom:14, padding:"10px 12px",
                background:"rgba(0,182,122,.05)", border:"1px solid rgba(0,182,122,.18)", borderRadius:10,
              }}>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:11, color:C.st, marginBottom:4 }}>
                  Your public storefront
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:12, color:C.g, wordBreak:"break-all", textDecoration:"none" }}
                  >
                    {storefrontUrl}
                  </a>
                  <button
                    className="bg-btn"
                    style={{ flexShrink:0, padding:"5px 10px", fontSize:11 }}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(storefrontUrl);
                        show("Link copied ✓");
                      } catch {
                        show("Couldn't copy — select and copy manually");
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            <button className="bp" style={{ width:"100%", justifyContent:"center", marginTop:4 }} onClick={async () => {
              if (!businessId) return;
              await supabase.from("businesses").update({ name:profile.name, type:profile.type, suburb:profile.location, subdomain:profile.subdomain }).eq("id", businessId);
              show("Profile saved ✓");
            }}>
              Save Profile
            </button>
          </div>

          {/* Order Notifications */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Order Notifications</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10, marginBottom:16, lineHeight:1.6 }}>
              Get alerted the moment a new online order comes in. Leave blank to disable a channel.
            </p>
            <Field label="Email for order alerts">
              <input
                type="email"
                placeholder="orders@yourbusiness.com"
                value={notifications.notify_email}
                onChange={e => setNotifications(n => ({ ...n, notify_email: e.target.value }))}
              />
            </Field>
            <Field label="SMS number for order alerts">
              <input
                type="tel"
                placeholder="+61 4XX XXX XXX"
                value={notifications.notify_phone}
                onChange={e => setNotifications(n => ({ ...n, notify_phone: e.target.value }))}
              />
            </Field>
            <button
              className="bp"
              style={{ width:"100%", justifyContent:"center", marginTop:4 }}
              onClick={async () => {
                if (!businessId) return;
                const prev = (business?.settings ?? {}) as Record<string, unknown>;
                const next = {
                  ...prev,
                  notify_email: notifications.notify_email.trim() || null,
                  notify_phone: notifications.notify_phone.trim() || null,
                };
                await supabase.from("businesses").update({ settings: next }).eq("id", businessId);
                show("Notifications saved ✓");
              }}
            >
              Save Notifications
            </button>
          </div>

          {/* Operating hours */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Operating hours</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10, marginBottom:16, lineHeight:1.6 }}>
              Controls your storefront open/closed status and powers the AI phone agent's &ldquo;after hours&rdquo; mode.
            </p>
            {([
              ["mon","Monday"], ["tue","Tuesday"], ["wed","Wednesday"],
              ["thu","Thursday"], ["fri","Friday"], ["sat","Saturday"], ["sun","Sunday"],
            ] as [string,string][]).map(([key, label]) => {
              const h = hours[key];
              return (
                <div key={key} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 60px", gap:8, alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, color:C.cl }}>{label}</span>
                  <input type="time" value={h.open} disabled={h.closed} onChange={e => setHours(hs => ({ ...hs, [key]: { ...hs[key], open: e.target.value } }))} />
                  <input type="time" value={h.close} disabled={h.closed} onChange={e => setHours(hs => ({ ...hs, [key]: { ...hs[key], close: e.target.value } }))} />
                  <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.st }}>
                    <input type="checkbox" checked={h.closed} onChange={e => setHours(hs => ({ ...hs, [key]: { ...hs[key], closed: e.target.checked } }))} />
                    off
                  </label>
                </div>
              );
            })}
            <button className="bp" style={{ width:"100%", justifyContent:"center", marginTop:10 }} onClick={async () => {
              if (!businessId) return;
              const prev = (business?.settings ?? {}) as Record<string, unknown>;
              await supabase.from("businesses").update({ settings: { ...prev, hours } }).eq("id", businessId);
              show("Hours saved ✓");
            }}>
              Save hours
            </button>
          </div>

          {/* Win-Back pointer */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Win-Back rules</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginBottom:12, lineHeight:1.6 }}>
              Inactivity triggers, discount amounts and message templates now live on the Win-Back page — one rule per trigger so you can run several in parallel.
            </p>
            <a href="/biteback" className="bp" style={{ textDecoration:"none", display:"inline-block" }}>
              Open Win-Back →
            </a>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Stripe Connect */}
          <div className="gc" style={{ padding:24 }}>
            {(() => {
              // Three-state UX:
              //   not-started   — no stripe account id
              //   incomplete    — account exists but charges or payouts still disabled
              //   live          — charges + payouts both enabled
              const state =
                !stripeConnected ? "not-started"
                : stripeCharges && stripePayouts ? "live"
                : "incomplete";
              const pillLabel = state === "live" ? "Live" : state === "incomplete" ? "Finish onboarding" : "Not connected";
              const pillActive = state === "live";
              return (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                    <SectionTitle>Stripe Payments</SectionTitle>
                    <StatusPill active={pillActive} label={pillLabel} />
                  </div>

                  {state === "live" && (
                    <div>
                      <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, lineHeight:1.6, marginBottom:16 }}>
                        Your Stripe Express account is fully onboarded. Payments go direct to your bank (minus Stripe&apos;s processing fee).
                      </div>
                      <div style={{ padding:"12px 16px", background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.15)", borderRadius:10, marginBottom:16 }}>
                        <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.g, fontWeight:600 }}>
                          ✓ Charges enabled · ✓ Payouts enabled
                        </div>
                      </div>
                      <button className="bg-btn" style={{ width:"100%", justifyContent:"center" }} onClick={() => window.open("https://dashboard.stripe.com", "_blank")}>
                        Open Stripe Dashboard ↗
                      </button>
                    </div>
                  )}

                  {state === "incomplete" && (
                    <div>
                      <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.st, lineHeight:1.6, marginBottom:16 }}>
                        Stripe still needs a few details before you can take payments. Usually this is bank account info or an identity document.
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16, fontSize:13, fontFamily:"var(--font-inter)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ color: stripeDetails ? C.g : C.o, fontWeight:700, width:14 }}>{stripeDetails ? "✓" : "•"}</span>
                          <span style={{ color:C.cl }}>Business details submitted</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ color: stripeCharges ? C.g : C.o, fontWeight:700, width:14 }}>{stripeCharges ? "✓" : "•"}</span>
                          <span style={{ color:C.cl }}>Ready to accept charges</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ color: stripePayouts ? C.g : C.o, fontWeight:700, width:14 }}>{stripePayouts ? "✓" : "•"}</span>
                          <span style={{ color:C.cl }}>Ready to receive payouts</span>
                        </div>
                      </div>
                      <button
                        className="bp"
                        style={{ width:"100%", justifyContent:"center" }}
                        onClick={handleStripeConnect}
                        disabled={connectLoading}
                      >
                        {connectLoading ? "Opening Stripe…" : "Finish onboarding →"}
                      </button>
                    </div>
                  )}

                  {state === "not-started" && (
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
                </>
              );
            })()}
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
                    {subscriptionStatus === "trialing" ? "✓ Free trial active — 14 days remaining" : "✓ Subscription active"}
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
