"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { supabase } from "@/lib/supabase";
import { navigation } from "@/lib/navigation";
import { DEFAULT_ROLE_PERMISSIONS, NAV_HREFS } from "@/lib/permissions";
import { orderUrl } from "@/lib/tenant";
import { saveSettings } from "@/lib/queries";
import { DEFAULT_PREP_MINUTES, DEFAULT_TIMEZONE, type DayHours, breakProblem, readOrderingRules } from "@/lib/pickup-times";
import { DEFAULT_DELIVERY_MINUTES, parseAreas, readDeliveryRules } from "@/lib/own-delivery";
import { MAX_OFFER, offerProblem, offerText, readFirstOrderOffer } from "@/lib/first-order";

const TIMEZONES = ["Australia/Adelaide", "Australia/Darwin", "Australia/Brisbane", "Australia/Sydney", "Australia/Melbourne", "Australia/Hobart", "Australia/Perth", "Pacific/Auckland"];
const PREP_CHOICES = [10, 15, 20, 25, 30, 40, 45, 60, 90];
import BrandMark from "@/components/brand-mark";
import PasswordInput from "@/components/password-input";
import { Icon } from "@/components/zb-icon";

const C = { g:"#00AD82", o:"#FF6B35", r:"#FF4757", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

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
      background: active ? "rgba(0,173,130,.12)" : "rgba(107,124,147,.14)",
      color: active ? C.g : C.st,
      fontFamily:"var(--font-outfit)", fontSize:12, fontWeight:600,
      border: `1px solid ${active ? "rgba(0,173,130,.25)" : "rgba(107,124,147,.2)"}`,
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
        background: on ? "rgba(0,173,130,.3)" : "rgba(226,232,240,.1)",
        border: `1px solid ${on ? "rgba(0,173,130,.4)" : C.mist}`,
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({
    // Primary providers
    uber_direct_api_key:        "",
    uber_direct_customer_id:    "",
    doordash_developer_id:      "",
    doordash_key_id:            "",
    doordash_signing_secret:    "",
    sherpa_api_key:             "",
    zoom2u_api_key:             "",
    gopeople_api_key:           "",
    // Routing settings
    business_address:           "",
    max_eta_minutes:            60  as string | number,
    eta_diff_threshold_min:     7   as string | number,
    // Customer-facing pricing
    service_fee:                3.99 as string | number,
    priority_surcharge:         3.50 as string | number,
    peak_surcharge:             2.00 as string | number,
    bad_weather_surcharge:      3.00 as string | number,
    min_order_threshold:        25   as string | number,
    high_value_discount:        2.00 as string | number,
    // Legacy / Tasker
    tasker_rate_per_hour:       "" as string | number,
    tasker_capacity_per_day:    "" as string | number,
    other_provider_name:        "",
    other_provider_rate_per_order: "" as string | number,
  });

  // Populate form from real business data
  useEffect(() => {
    if (business) {
      setProfile({ name: business.name, type: business.type, location: business.suburb ?? "", subdomain: business.subdomain ?? "" });
      const settings = (business.settings ?? {}) as Record<string, unknown>;
      setNotifications({
        notify_email: (settings.notify_email as string | undefined) ?? "",
        notify_phone: (settings.notify_phone as string | undefined) ?? "",
      });
      setLogoUrl((business as any).logo_url ?? null);
      // The delivery_settings column (older saves put a copy in settings).
      const ds = ((business as { delivery_settings?: Record<string, unknown> | null }).delivery_settings ?? (settings as any).delivery_settings ?? {}) as Record<string, any>;
      if (Object.keys(ds).length) setDeliverySettings(prev => ({ ...prev, ...ds }));
    }
  }, [business]);

  // The customer-facing ordering page at name.zentrabite.com/order
  const storefrontUrl = profile.subdomain ? orderUrl(profile.subdomain) : "";

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
  // While trialing, Stripe's current period ends when the trial does.
  const [trialEnds, setTrialEnds] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean; break_from?: string; break_to?: string }>>({
    mon: { open: "17:00", close: "21:00", closed: false },
    tue: { open: "17:00", close: "21:00", closed: false },
    wed: { open: "17:00", close: "21:00", closed: false },
    thu: { open: "17:00", close: "21:00", closed: false },
    fri: { open: "17:00", close: "22:00", closed: false },
    sat: { open: "17:00", close: "22:00", closed: false },
    sun: { open: "17:00", close: "21:00", closed: false },
  });

  // Online ordering: prep time, time zone and the pause switch.
  const [ordering, setOrdering] = useState({ prep_minutes: DEFAULT_PREP_MINUTES, paused: false, timezone: DEFAULT_TIMEZONE });
  // Delivery by the shop's own drivers (lib/own-delivery.ts).
  const [ownDelivery, setOwnDelivery] = useState({ enabled: false, fee: "", min_order: "", extra_minutes: DEFAULT_DELIVERY_MINUTES, areas: "" });
  // First order offer (lib/first-order.ts). What the counter QR code promises.
  const [firstOrder, setFirstOrder] = useState({ enabled: false, amount: "", min_order: "" });

  // Role permissions — owner decides what Manager/Staff/POS can see in the nav.
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(DEFAULT_ROLE_PERMISSIONS);
  const [rolesSaving, setRolesSaving] = useState(false);

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
    if (settings.subscription_status === "trialing" && typeof settings.subscription_period_end === "string") {
      const end = new Date(settings.subscription_period_end);
      setTrialEnds(Number.isNaN(end.getTime()) ? null
        : end.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    }
    if (settings.hours && typeof settings.hours === "object") {
      setHours(prev => ({ ...prev, ...(settings.hours as any) }));
    }
    {
      const r = readOrderingRules(settings);
      setOrdering({ prep_minutes: r.prepMinutes, paused: r.paused, timezone: r.timezone });
      const d = readDeliveryRules(settings);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const savedOn = (settings as any).ordering?.delivery?.enabled === true;
      setOwnDelivery({
        enabled: savedOn, fee: d.fee ? d.fee.toFixed(2) : "", min_order: d.minOrder ? d.minOrder.toFixed(2) : "",
        extra_minutes: d.extraMinutes, areas: d.areas.join(", "),
      });
      const f = readFirstOrderOffer(settings);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fo = (settings as any).ordering?.first_order;
      setFirstOrder({
        enabled: f.enabled,
        amount: f.amount ? String(f.amount) : (fo?.amount ? String(fo.amount) : ""),
        min_order: f.minOrder ? String(f.minOrder) : (fo?.min_order ? String(fo.min_order) : ""),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp = (settings as any).role_permissions;
    if (rp && typeof rp === "object") {
      setRolePerms(prev => ({ ...prev, ...rp }));
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

  const addMember = async () => {
    const target = invite.trim();
    if (!target) return show("Enter an email address first");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return show("That doesn't look like a valid email");

    // Optimistic UI — add the row immediately, roll back on failure
    setTeam(t => [...t, { email: target, role: "Staff" }]);
    setInvite("");
    show("Sending invite…");

    try {
      const res = await fetch("/api/team/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        target,
          businessId:   businessId,
          role:         "Staff",
          businessName: profile.name || business?.name || "your team",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeam(t => t.filter(m => m.email !== target));
        show(`Couldn't send invite: ${data.error ?? "unknown error"}`);
        return;
      }
      if (data.skipped) {
        show("Invite recorded — set up RESEND_API_KEY to send emails");
      } else if (data.delivered) {
        show(`Invite sent to ${target} ✓`);
      } else {
        show("Invite recorded — email delivery failed");
      }
    } catch {
      setTeam(t => t.filter(m => m.email !== target));
      show("Network error sending invite");
    }
  };

  // Persist role permissions. Reads current settings then deep-merges so we
  // don't wipe hours / notify_email / etc.
  const savePermissions = async () => {
    if (!businessId) return;
    setRolesSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: current } = await supabase.from("businesses").select("settings").eq("id", businessId).single() as any;
      const prev = (current?.settings ?? {}) as Record<string, unknown>;
      const next = { ...prev, role_permissions: rolePerms };
      await supabase.from("businesses").update({ settings: next }).eq("id", businessId);
      show("Permissions saved ✓");
    } catch {
      show("Couldn't save permissions");
    } finally {
      setRolesSaving(false);
    }
  };

  const toggleRolePerm = (role: string, href: string) => {
    setRolePerms(prev => {
      const current = prev[role] ?? [];
      const has = current.includes(href);
      return { ...prev, [role]: has ? current.filter(h => h !== href) : [...current, href] };
    });
  };

  const resetRoleToDefault = (role: string) => {
    setRolePerms(prev => ({ ...prev, [role]: DEFAULT_ROLE_PERMISSIONS[role] ?? [] }));
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

      <div className="zb-stack" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

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
            <Field label="Business Logo">
              <div className="zb-wrap" style={{ display:"flex", alignItems:"center", gap:12 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" style={{ width:48, height:48, borderRadius:10, objectFit:"cover", border:"1px solid rgba(255,255,255,.1)", flexShrink:0 }} />
                ) : (
                  <BrandMark size={40} />
                )}
                <label style={{ cursor:"pointer" }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display:"none" }}
                    disabled={logoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !businessId) return;
                      setLogoUploading(true);
                      try {
                        const ext  = file.name.split(".").pop();
                        const path = `${businessId}/logo.${ext}`;
                        const { error: upErr } = await supabase.storage
                          .from("business-logos")
                          .upload(path, file, { upsert:true, contentType:file.type });
                        if (upErr) throw upErr;
                        const { data: { publicUrl } } = supabase.storage
                          .from("business-logos")
                          .getPublicUrl(path);
                        await supabase.from("businesses").update({ logo_url: publicUrl }).eq("id", businessId);
                        setLogoUrl(publicUrl);
                        show("Logo updated ✓");
                      } catch (err: any) {
                        show(err.message ?? "Upload failed");
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                  />
                  <span className="bg-btn" style={{ fontSize:11, padding:"7px 14px", cursor:logoUploading?"wait":"pointer", display:"inline-block" }}>
                    {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                  </span>
                </label>
                {logoUrl && (
                  <button
                    style={{ background:"transparent", border:"none", color:"#FF4757", fontSize:11, cursor:"pointer" }}
                    onClick={async () => {
                      if (!businessId) return;
                      await supabase.from("businesses").update({ logo_url: null }).eq("id", businessId);
                      setLogoUrl(null);
                      show("Logo removed");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>
            {storefrontUrl && (
              <div style={{
                marginBottom:14, padding:"10px 12px",
                background:"rgba(0,173,130,.05)", border:"1px solid rgba(0,173,130,.18)", borderRadius:10,
              }}>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:11, color:C.st, marginBottom:4 }}>
                  Your public storefront
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zb-tap"
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
                try {
                  await saveSettings(businessId, {
                    notify_email: notifications.notify_email.trim() || null,
                    notify_phone: notifications.notify_phone.trim() || null,
                  });
                  show("Notifications saved ✓");
                } catch { show("Couldn't save notifications"); }
              }}
            >
              Save Notifications
            </button>
          </div>

          {/* Operating hours */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Operating hours</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10, marginBottom:16, lineHeight:1.6 }}>
              Online orders follow these hours. Customers can order ahead for later the same day, and nobody can order while you&apos;re closed. Shut between lunch and dinner? Add a break to that day. They also power the AI phone agent&apos;s &ldquo;after hours&rdquo; mode.
            </p>
            {([
              ["mon","Monday"], ["tue","Tuesday"], ["wed","Wednesday"],
              ["thu","Thursday"], ["fri","Friday"], ["sat","Saturday"], ["sun","Sunday"],
            ] as [string,string][]).map(([key, label]) => {
              const h = hours[key];
              const hasBreak = h.break_from !== undefined;
              const problem = breakProblem(h as DayHours);
              const setDay = (patch: Partial<typeof h>) => setHours(hs => ({ ...hs, [key]: { ...hs[key], ...patch } }));
              return (
                <div key={key} style={{ marginBottom:8 }}>
                  <div className="zb-hours-row" style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 60px", gap:8, alignItems:"center" }}>
                    <span style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                      <span style={{ fontSize:12, color:C.cl }}>{label}</span>
                      {!h.closed && !hasBreak && (
                        <button type="button" onClick={() => setDay({ break_from: "14:00", break_to: "17:00" })} style={{ background:"none", border:0, padding:"4px 0", color:C.g, fontSize:11, cursor:"pointer" }}>
                          Add a break
                        </button>
                      )}
                    </span>
                    <input type="time" aria-label={`${label} opens`} value={h.open} disabled={h.closed} onChange={e => setDay({ open: e.target.value })} />
                    <input type="time" aria-label={`${label} closes`} value={h.close} disabled={h.closed} onChange={e => setDay({ close: e.target.value })} />
                    <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.st }}>
                      <input type="checkbox" checked={h.closed} onChange={e => setDay({ closed: e.target.checked })} />
                      off
                    </label>
                  </div>
                  {!h.closed && hasBreak && (
                    <div className="zb-hours-row" style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 60px", gap:8, alignItems:"center", marginTop:6 }}>
                      <span style={{ fontSize:11, color:C.st }}>Break</span>
                      <input type="time" aria-label={`${label} break starts`} value={h.break_from ?? ""} onChange={e => setDay({ break_from: e.target.value })} />
                      <input type="time" aria-label={`${label} break ends`} value={h.break_to ?? ""} onChange={e => setDay({ break_to: e.target.value })} />
                      <button type="button" onClick={() => setHours(hs => { const d = { ...hs[key] }; delete d.break_from; delete d.break_to; return { ...hs, [key]: d }; })}
                        style={{ background:"none", border:0, padding:"4px 0", color:C.st, fontSize:11, cursor:"pointer", textAlign:"right" }}>
                        Remove
                      </button>
                    </div>
                  )}
                  {!h.closed && problem && <p style={{ fontSize:11, color:C.o, margin:"4px 0 0" }}>{label}. {problem}</p>}
                </div>
              );
            })}
            <button className="bp" style={{ width:"100%", justifyContent:"center", marginTop:10 }} onClick={async () => {
              if (!businessId) return;
              const bad = Object.entries(hours).find(([, h]) => !h.closed && breakProblem(h as DayHours));
              if (bad) { show("Check the break times first"); return; }
              try { await saveSettings(businessId, { hours }); show("Hours saved ✓"); }
              catch { show("Couldn't save hours"); }
            }}>
              Save hours
            </button>
          </div>

          {/* Online ordering */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Online ordering</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10, marginBottom:16, lineHeight:1.6 }}>
              Customers pick &ldquo;as soon as possible&rdquo; or a later time today. As soon as possible means now plus your prep time.
            </p>
            <Field label="Prep time">
              <select value={ordering.prep_minutes} onChange={e => setOrdering(o => ({ ...o, prep_minutes: Number(e.target.value) }))}>
                {PREP_CHOICES.map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </Field>
            <Field label="Time zone your hours are in">
              <select value={ordering.timezone} onChange={e => setOrdering(o => ({ ...o, timezone: e.target.value }))}>
                {(TIMEZONES.includes(ordering.timezone) ? TIMEZONES : [ordering.timezone, ...TIMEZONES]).map(z => <option key={z} value={z}>{z.replace("Australia/", "").replace("Pacific/", "")}</option>)}
              </select>
            </Field>
            <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.cl, margin:"4px 0 14px", cursor:"pointer", minHeight:32 }}>
              <input type="checkbox" checked={ordering.paused} onChange={e => setOrdering(o => ({ ...o, paused: e.target.checked }))} style={{ width:16, height:16 }} />
              Pause online orders (you can also do this on the Orders page)
            </label>

            {/* Delivery by the shop's own drivers */}
            <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.cl, margin:"4px 0 10px", cursor:"pointer", minHeight:32 }}>
              <input type="checkbox" checked={ownDelivery.enabled} onChange={e => setOwnDelivery(d => ({ ...d, enabled: e.target.checked }))} style={{ width:16, height:16 }} />
              Offer delivery with your own drivers
            </label>
            {ownDelivery.enabled && (
              <div style={{ background:"rgba(255,255,255,.03)", borderRadius:10, padding:"12px 12px 2px", marginBottom:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Field label="Delivery fee ($)">
                    <input type="number" inputMode="decimal" min="0" step="0.5" value={ownDelivery.fee} onChange={e => setOwnDelivery(d => ({ ...d, fee: e.target.value }))} placeholder="0.00" />
                  </Field>
                  <Field label="Minimum order ($)">
                    <input type="number" inputMode="decimal" min="0" step="1" value={ownDelivery.min_order} onChange={e => setOwnDelivery(d => ({ ...d, min_order: e.target.value }))} placeholder="0.00" />
                  </Field>
                </div>
                <Field label="Drive time added to prep time">
                  <select value={ownDelivery.extra_minutes} onChange={e => setOwnDelivery(d => ({ ...d, extra_minutes: Number(e.target.value) }))}>
                    {[10, 15, 20, 25, 30, 40, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </Field>
                <Field label="Suburbs or postcodes you deliver to">
                  <textarea value={ownDelivery.areas} onChange={e => setOwnDelivery(d => ({ ...d, areas: e.target.value }))} rows={3}
                    placeholder="Norwood, Kent Town, 5067" style={{ resize:"vertical", fontFamily:"inherit" }} />
                </Field>
              </div>
            )}

            {/* First order offer */}
            <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.cl, margin:"4px 0 10px", cursor:"pointer", minHeight:32 }}>
              <input type="checkbox" checked={firstOrder.enabled} onChange={e => setFirstOrder(f => ({ ...f, enabled: e.target.checked }))} style={{ width:16, height:16 }} />
              Give money off a customer&apos;s first online order
            </label>
            {firstOrder.enabled && (
              <div style={{ background:"rgba(255,255,255,.03)", borderRadius:10, padding:"12px 12px 2px", marginBottom:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Field label="Amount off ($)">
                    <input type="number" inputMode="decimal" min="1" max={MAX_OFFER} step="1" value={firstOrder.amount} onChange={e => setFirstOrder(f => ({ ...f, amount: e.target.value }))} placeholder="10" />
                  </Field>
                  <Field label="Minimum spend ($)">
                    <input type="number" inputMode="decimal" min="1" step="1" value={firstOrder.min_order} onChange={e => setFirstOrder(f => ({ ...f, min_order: e.target.value }))} placeholder="30" />
                  </Field>
                </div>
                <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, margin:"0 0 10px", lineHeight:1.6 }}>
                  {`Once per mobile number, on their first online order here. It comes out of your takings. It shows on your website, your ordering page and the counter QR code${offerText({ enabled: true, amount: Number(firstOrder.amount) || 0, minOrder: Number(firstOrder.min_order) || 0 }) && !offerProblem(Number(firstOrder.amount), Number(firstOrder.min_order)) ? ` as "${offerText({ enabled: true, amount: Number(firstOrder.amount), minOrder: Number(firstOrder.min_order) })}".` : "."}`}
                </p>
              </div>
            )}

            <button className="bp" style={{ width:"100%", justifyContent:"center" }} onClick={async () => {
              if (!businessId) return;
              const areas = parseAreas(ownDelivery.areas);
              if (ownDelivery.enabled && areas.length === 0) return show("Add the suburbs or postcodes you deliver to");
              const offerAmount = Number(firstOrder.amount), offerMin = Number(firstOrder.min_order);
              const offerIssue = firstOrder.enabled ? offerProblem(offerAmount, offerMin) : null;
              if (offerIssue) return show(offerIssue);
              try {
                await saveSettings(businessId, {
                  timezone: ordering.timezone,
                  ordering: {
                    prep_minutes: ordering.prep_minutes,
                    paused: ordering.paused,
                    delivery: {
                      enabled: ownDelivery.enabled,
                      fee: Math.max(0, Number(ownDelivery.fee) || 0),
                      min_order: Math.max(0, Number(ownDelivery.min_order) || 0),
                      extra_minutes: ownDelivery.extra_minutes,
                      areas,
                    },
                    first_order: {
                      enabled: firstOrder.enabled,
                      amount: firstOrder.enabled ? offerAmount : Number(firstOrder.amount) || 0,
                      min_order: firstOrder.enabled ? offerMin : Number(firstOrder.min_order) || 0,
                    },
                  },
                });
                show(ordering.paused ? "Saved. Online orders are paused" : "Online ordering saved ✓");
              } catch { show("Couldn't save online ordering"); }
            }}>
              Save online ordering
            </button>
          </div>

          {/* Win-Back pointer */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Win-Back rules</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginBottom:12, lineHeight:1.6 }}>
              Inactivity triggers, discount amounts and message templates now live on the Win-Back page — one rule per trigger so you can run several in parallel.
            </p>
            <a href="/zentra-rewards" className="bp" style={{ textDecoration:"none", display:"inline-block" }}>
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
                        Your Stripe account is set up. Customer payments go into your own Stripe account and on to your bank, minus Stripe&apos;s card fee. Refunds and payouts are in your Stripe Dashboard.
                      </div>
                      <div style={{ padding:"12px 16px", background:"rgba(0,173,130,.06)", border:"1px solid rgba(0,173,130,.15)", borderRadius:10, marginBottom:16 }}>
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
                  Start your 30-day free trial. You add a card at checkout. The first payment is taken when the trial ends.
                </div>
                <div style={{ padding:"16px", background:"rgba(28,45,72,.5)", borderRadius:12, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
                    <span style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:C.cl }}>$500</span>
                    <span style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st }}>/month AUD</span>
                  </div>
                  <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st }}>
                    All features · SMS credits · AI calls · Zentra Rewards network
                  </div>
                </div>
                <button
                  className="bp"
                  style={{ width:"100%", justifyContent:"center" }}
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Opening checkout…" : "Start 1-Month Free Trial →"}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ padding:"12px 16px", background:"rgba(0,173,130,.06)", border:"1px solid rgba(0,173,130,.15)", borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontFamily:"var(--font-inter)", fontSize:13, color:C.g, fontWeight:600 }}>
                    {subscriptionStatus === "trialing"
                      ? (trialEnds ? `✓ Free trial active. It ends on ${trialEnds}, and your first payment is taken then.` : "✓ Free trial active")
                      : "✓ Subscription active"}
                  </div>
                </div>
                <button
                  className="bg-btn"
                  style={{ width:"100%", justifyContent:"center" }}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/portal", { method: "POST" });
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        show(data.error ?? "Could not open billing portal");
                      }
                    } catch {
                      show("Could not open billing portal");
                    }
                  }}
                >
                  Manage Subscription ↗
                </button>
              </div>
            )}
          </div>

          {/* Delivery Providers */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Delivery Providers</SectionTitle>
            <p style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10, marginBottom:18, lineHeight:1.6 }}>
              Configure credentials for each delivery provider. The routing engine queries all configured
              providers simultaneously and selects the optimal one per order. Providers with no credentials are skipped.
            </p>

            {/* Business address + routing params */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10 }}>Routing Settings</div>
              <Field label="Pickup Address (your business address)">
                <input
                  placeholder="123 George St, Sydney NSW 2000"
                  value={deliverySettings.business_address}
                  onChange={e => setDeliverySettings(d => ({ ...d, business_address: e.target.value }))}
                />
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Max ETA (minutes)">
                  <input type="number" min={10} max={120}
                    value={deliverySettings.max_eta_minutes}
                    onChange={e => setDeliverySettings(d => ({ ...d, max_eta_minutes: e.target.value }))}
                  />
                </Field>
                <Field label="ETA diff threshold (minutes)">
                  <input type="number" min={1} max={30}
                    value={deliverySettings.eta_diff_threshold_min}
                    onChange={e => setDeliverySettings(d => ({ ...d, eta_diff_threshold_min: e.target.value }))}
                  />
                </Field>
              </div>
              <div style={{ fontSize:11, color:C.st }}>ETA diff threshold: if two providers are within this many minutes of each other, the cheaper one always wins.</div>
            </div>

            {/* Customer-facing pricing */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10 }}>Customer-Facing Pricing</div>
              <div style={{ fontSize:11, color:C.st, marginBottom:12 }}>
                Base fee is distance-based (0–3km $6.99 · 3–6km $8.99 · 6km+ $10.99). Surcharges stack on top.
              </div>
              <div className="zb-two" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <Field label="Service fee ($)">
                  <input type="number" step="0.01" value={deliverySettings.service_fee}
                    onChange={e => setDeliverySettings(d => ({ ...d, service_fee: e.target.value }))} />
                </Field>
                <Field label="Priority surcharge ($)">
                  <input type="number" step="0.01" value={deliverySettings.priority_surcharge}
                    onChange={e => setDeliverySettings(d => ({ ...d, priority_surcharge: e.target.value }))} />
                </Field>
                <Field label="Peak hour surcharge ($)">
                  <input type="number" step="0.01" value={deliverySettings.peak_surcharge}
                    onChange={e => setDeliverySettings(d => ({ ...d, peak_surcharge: e.target.value }))} />
                </Field>
                <Field label="Bad weather surcharge ($)">
                  <input type="number" step="0.01" value={deliverySettings.bad_weather_surcharge}
                    onChange={e => setDeliverySettings(d => ({ ...d, bad_weather_surcharge: e.target.value }))} />
                </Field>
                <Field label="Min order for standard fee ($)">
                  <input type="number" step="1" value={deliverySettings.min_order_threshold}
                    onChange={e => setDeliverySettings(d => ({ ...d, min_order_threshold: e.target.value }))} />
                </Field>
                <Field label="High-value order discount ($)">
                  <input type="number" step="0.01" value={deliverySettings.high_value_discount}
                    onChange={e => setDeliverySettings(d => ({ ...d, high_value_discount: e.target.value }))} />
                </Field>
              </div>
            </div>

            {/* Uber Direct */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="car" size={14} />Uber Direct</div>
              <div className="zb-stack" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="API Key">
                  <PasswordInput label="key" placeholder="From developer.uber.com"
                    value={deliverySettings.uber_direct_api_key}
                    onChange={e => setDeliverySettings(d => ({ ...d, uber_direct_api_key: e.target.value }))} />
                </Field>
                <Field label="Customer ID">
                  <input placeholder="Uber Direct Customer ID"
                    value={deliverySettings.uber_direct_customer_id}
                    onChange={e => setDeliverySettings(d => ({ ...d, uber_direct_customer_id: e.target.value }))} />
                </Field>
              </div>
              <div style={{ fontSize:11, color:C.st }}>Live quotes fetched per order when credentials are set. Docs: developer.uber.com/docs/deliveries</div>
            </div>

            {/* DoorDash Drive */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="dot" size={14} accent="#FF4757" />DoorDash Drive</div>
              <div className="zb-stack" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <Field label="Developer ID">
                  <PasswordInput label="ID" placeholder="From developer.doordash.com"
                    value={deliverySettings.doordash_developer_id}
                    onChange={e => setDeliverySettings(d => ({ ...d, doordash_developer_id: e.target.value }))} />
                </Field>
                <Field label="Key ID">
                  <input placeholder="DoorDash Key ID"
                    value={deliverySettings.doordash_key_id}
                    onChange={e => setDeliverySettings(d => ({ ...d, doordash_key_id: e.target.value }))} />
                </Field>
                <Field label="Signing Secret">
                  <PasswordInput label="secret" placeholder="JWT signing secret"
                    value={deliverySettings.doordash_signing_secret}
                    onChange={e => setDeliverySettings(d => ({ ...d, doordash_signing_secret: e.target.value }))} />
                </Field>
              </div>
              <div style={{ fontSize:11, color:C.st }}>Docs: developer.doordash.com/en-US/docs/drive</div>
            </div>

            {/* Sherpa */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="package" size={14} />Sherpa</div>
              <Field label="API Key">
                <PasswordInput label="key" placeholder="From Sherpa developer portal"
                  value={deliverySettings.sherpa_api_key}
                  onChange={e => setDeliverySettings(d => ({ ...d, sherpa_api_key: e.target.value }))} />
              </Field>
              <div style={{ fontSize:11, color:C.st }}>Australian same-day courier. Docs: developer.sherpa.delivery</div>
            </div>

            {/* Zoom2u */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="fast" size={14} />Zoom2u</div>
              <Field label="API Key">
                <PasswordInput label="key" placeholder="From Zoom2u developer portal"
                  value={deliverySettings.zoom2u_api_key}
                  onChange={e => setDeliverySettings(d => ({ ...d, zoom2u_api_key: e.target.value }))} />
              </Field>
              <div style={{ fontSize:11, color:C.st }}>Australian courier aggregator. Docs: developer.zoom2u.com</div>
            </div>

            {/* GoPeople */}
            <div style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="delivery" size={14} />GoPeople</div>
              <Field label="API Key">
                <PasswordInput label="key" placeholder="From GoPeople developer portal"
                  value={deliverySettings.gopeople_api_key}
                  onChange={e => setDeliverySettings(d => ({ ...d, gopeople_api_key: e.target.value }))} />
              </Field>
              <div style={{ fontSize:11, color:C.st }}>Australian last-mile courier. Docs: developer.gopeople.com.au</div>
            </div>

            {/* Legacy Tasker fields */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:12, color:"#fff", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><Icon name="drivers" size={14} />In-house Drivers / Tasker (volume planning)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Daily rate ($)">
                  <input type="number" placeholder="e.g. 180"
                    value={deliverySettings.tasker_rate_per_hour}
                    onChange={e => setDeliverySettings(d => ({ ...d, tasker_rate_per_hour: e.target.value }))} />
                </Field>
                <Field label="Max orders per driver per day">
                  <input type="number" placeholder="e.g. 25"
                    value={deliverySettings.tasker_capacity_per_day}
                    onChange={e => setDeliverySettings(d => ({ ...d, tasker_capacity_per_day: e.target.value }))} />
                </Field>
              </div>
              <div style={{ fontSize:11, color:C.st }}>Used by the 7-day delivery volume planning tool, not the live routing engine.</div>
            </div>

            <button
              className="bp"
              style={{ width:"100%", justifyContent:"center" }}
              onClick={async () => {
                if (!businessId) return;
                // Only the delivery column. Writing settings from the page's
                // copy here could wipe a section saved since it loaded.
                const { error } = await supabase.from("businesses").update({
                  delivery_settings: deliverySettings,
                }).eq("id", businessId);
                if (error) { show("Could not save delivery settings"); return; }
                show("Delivery settings saved ✓");
              }}
            >
              Save delivery settings
            </button>
          </div>

          {/* Team */}
          <div className="gc" style={{ padding:24 }}>
            <SectionTitle>Team</SectionTitle>
            {team.map((m, i) => (
              <div key={i} className="zb-break" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.mist}`, fontSize:13, fontFamily:"var(--font-inter)" }}>
                <span style={{ color:C.cl }}>{m.email}</span>
                <span style={{
                  padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:600,
                  fontFamily:"var(--font-outfit)",
                  background: m.role==="Owner" ? "rgba(0,173,130,.12)" : "rgba(107,124,147,.14)",
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

          {/* Permissions */}
          <div className="gc" style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <div>
                <SectionTitle>Permissions</SectionTitle>
                <div style={{ fontFamily:"var(--font-inter)", fontSize:12, color:C.st, marginTop:-10 }}>
                  Choose which pages each role can see. Owners always see everything.
                </div>
              </div>
            </div>

            {["Manager", "Staff", "POS"].map(role => {
              const allowed = rolePerms[role] ?? [];
              return (
                <div key={role} style={{ marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${C.mist}` }}>
                  <div className="zb-wrap" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{
                        padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:600,
                        fontFamily:"var(--font-outfit)", background:"rgba(107,124,147,.14)", color:C.cl,
                      }}>
                        {role}
                      </span>
                      <span style={{ fontSize:11, color:C.st, fontFamily:"var(--font-inter)" }}>
                        {allowed.length}/{NAV_HREFS.length} pages
                      </span>
                    </div>
                    <button
                      onClick={() => resetRoleToDefault(role)}
                      style={{ background:"transparent", border:"none", color:C.st, fontSize:11, cursor:"pointer", textDecoration:"underline" }}
                    >
                      Reset to default
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {navigation.map(nav => {
                      const on = allowed.includes(nav.href);
                      return (
                        <label
                          key={nav.href}
                          style={{
                            display:"flex", alignItems:"center", gap:8,
                            padding:"6px 10px", borderRadius:8,
                            background: on ? "rgba(0,173,130,.06)" : "transparent",
                            border: `1px solid ${on ? "rgba(0,173,130,.22)" : C.mist}`,
                            cursor:"pointer", fontFamily:"var(--font-inter)", fontSize:12,
                            color: on ? C.cl : C.st,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleRolePerm(role, nav.href)}
                            style={{ margin:0 }}
                          />
                          <nav.icon size={14} />
                          <span>{nav.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              className="bp"
              disabled={rolesSaving}
              onClick={savePermissions}
              style={{ width:"100%", justifyContent:"center" }}
            >
              {rolesSaving ? "Saving…" : "Save permissions"}
            </button>
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
