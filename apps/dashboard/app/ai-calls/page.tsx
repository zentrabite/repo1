"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getAiCallProfile, upsertAiCallProfile } from "@/lib/queries";

const C = { g:"#00B67A", st:"#6B7C93", am:"#F59E0B" };

const DEFAULTS = {
  enabled:          false,
  answer_mode:      "after_hours",
  voice:            "female_au",
  personality:      "friendly, concise, South-Australian",
  greeting:         "Hi, you've reached {business_name}, how can I help?",
  faq_context:      "",
  escalation_phone: "",
  take_orders:      true,
  take_bookings:    true,
  send_followup_sms: true,
};

export default function AICallsPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [profile, setProfile] = useState<any>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!businessId) return;
    getAiCallProfile(businessId)
      .then(p => {
        if (p) setProfile({ ...DEFAULTS, ...p });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  const save = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const saved = await upsertAiCallProfile(businessId, {
        enabled:           profile.enabled,
        answer_mode:       profile.answer_mode,
        voice:             profile.voice,
        personality:       profile.personality,
        greeting:          profile.greeting,
        faq_context:       profile.faq_context || null,
        escalation_phone:  profile.escalation_phone || null,
        take_orders:       profile.take_orders,
        take_bookings:     profile.take_bookings,
        send_followup_sms: profile.send_followup_sms,
      });
      setProfile({ ...DEFAULTS, ...saved });
      show("AI call profile saved ✓");
    } catch (e: any) {
      show(`Error: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const renderedGreeting = (profile.greeting ?? "").replace("{business_name}", business?.name ?? "your restaurant");

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>AI Phone Agent</h2>
          <p style={{ color:C.st, fontSize:12, marginTop:2 }}>
            Configure how the AI answers your calls — out-of-hours, always-on or overflow.
          </p>
        </div>
        <button className="bp" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Status"        value={profile.enabled ? "ON" : "OFF"} accent={profile.enabled} icon={profile.enabled ? "🟢" : "⚪"} />
        <StatCard label="Answer mode"   value={profile.answer_mode.replace("_"," ")} icon="⏰" delay={50} />
        <StatCard label="Takes orders"  value={profile.take_orders ? "Yes" : "No"} icon="🛎️" delay={100} />
        <StatCard label="Takes bookings" value={profile.take_bookings ? "Yes" : "No"} icon="📅" delay={150} />
      </div>

      {/* Enable panel */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>Enable the AI agent</div>
            <div style={{ fontSize:11, color:C.st }}>When off, calls ring through unanswered.</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={profile.enabled} onChange={e => setProfile({ ...profile, enabled: e.target.checked })} />
            <span>{profile.enabled ? "ON" : "OFF"}</span>
          </label>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Answer mode</label>
            <select value={profile.answer_mode} onChange={e => setProfile({ ...profile, answer_mode: e.target.value })}>
              <option value="after_hours">After hours only</option>
              <option value="always">Always on</option>
              <option value="overflow">Overflow (when line is busy)</option>
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Voice</label>
            <select value={profile.voice} onChange={e => setProfile({ ...profile, voice: e.target.value })}>
              <option value="female_au">Female (AU)</option>
              <option value="male_au">Male (AU)</option>
              <option value="female_us">Female (US)</option>
              <option value="male_us">Male (US)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personality + greeting */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:12 }}>Personality & greeting</div>

        <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Personality</label>
        <input
          value={profile.personality}
          onChange={e => setProfile({ ...profile, personality: e.target.value })}
          placeholder="e.g. friendly, concise, Australian accent"
          style={{ marginBottom:10 }}
        />

        <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>
          Greeting — use <code>{"{business_name}"}</code>
        </label>
        <textarea
          value={profile.greeting}
          onChange={e => setProfile({ ...profile, greeting: e.target.value })}
          rows={2}
          style={{ width:"100%", fontFamily:"inherit", fontSize:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:6, padding:"10px 12px", color:"#fff", resize:"vertical", marginBottom:6 }}
        />
        {renderedGreeting && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,.55)", fontStyle:"italic" }}>Preview: &ldquo;{renderedGreeting}&rdquo;</div>
        )}
      </div>

      {/* Knowledge / FAQ */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:6 }}>Knowledge base</div>
        <p style={{ fontSize:11, color:C.st, marginBottom:10 }}>
          Paste your hours, delivery radius, gluten-free options, dietary notes, parking info — anything the AI should know.
        </p>
        <textarea
          value={profile.faq_context ?? ""}
          onChange={e => setProfile({ ...profile, faq_context: e.target.value })}
          rows={8}
          placeholder={`Opening hours: Tues–Sun 5pm–9pm, closed Mondays.\nDelivery radius: 5km, flat $6 fee.\nGluten-free: pizza base yes, pasta no.\nMinimum order: $25.\n…`}
          style={{ width:"100%", fontFamily:"inherit", fontSize:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:6, padding:"10px 12px", color:"#fff", resize:"vertical" }}
        />
      </div>

      {/* Actions the AI can take */}
      <div className="gc" style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:14 }}>What the AI can do</div>

        {([
          ["take_orders",       "Take orders",          "Capture customer details and write a draft order into the POS."],
          ["take_bookings",     "Take bookings",        "Book tables at quiet times, escalate otherwise."],
          ["send_followup_sms", "Send follow-up SMS",   "After the call, text the caller a summary / order link."],
        ] as [string,string,string][]).map(([key, label, desc]) => (
          <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            <div>
              <div style={{ fontSize:13, color:"#fff", fontWeight:600 }}>{label}</div>
              <div style={{ fontSize:11, color:C.st }}>{desc}</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={profile[key]} onChange={e => setProfile({ ...profile, [key]: e.target.checked })} />
              <span>{profile[key] ? "ON" : "OFF"}</span>
            </label>
          </div>
        ))}

        <div style={{ marginTop:14 }}>
          <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>
            Escalation phone number — calls the AI can't handle are forwarded here
          </label>
          <input
            value={profile.escalation_phone ?? ""}
            onChange={e => setProfile({ ...profile, escalation_phone: e.target.value })}
            placeholder="+61 4xx xxx xxx"
          />
        </div>
      </div>

      {profile.enabled && (
        <div className="gc" style={{ padding:16, background:"linear-gradient(135deg,rgba(245,158,11,.06),rgba(245,158,11,.02))", border:"1px solid rgba(245,158,11,.15)" }}>
          <p style={{ fontSize:11.5, color:"#ffd88a", margin:0, lineHeight:1.6 }}>
            <b>One more step.</b> To actually route phone calls to the AI, we need to connect a telephony provider (Twilio or Telnyx) to your business line. Ping support — or see the AI Calls section of the setup doc — to finalise this.
          </p>
        </div>
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
