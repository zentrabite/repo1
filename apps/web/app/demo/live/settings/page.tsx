"use client";

import { useState } from "react";
import { business } from "../data";

function toast(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: rgba(0,182,122,0.94); color: #0F1F2D;
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function SettingsPage() {
  const [name, setName] = useState(business.name);
  const [type, setType] = useState("Pizzeria");
  const [subdomain, setSubdomain] = useState("nonnas-kitchen");
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [winbackOn, setWinbackOn] = useState(true);
  const [aiCallsOn, setAiCallsOn] = useState(true);

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Settings
        </h1>
        <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Business profile, integrations, team, and billing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Business profile */}
          <Card title="Business profile">
            <Field label="Business name">
              <Input value={name} onChange={setName} />
            </Field>
            <Field label="Type">
              <Input value={type} onChange={setType} />
            </Field>
            <Field label="Storefront URL">
              <div style={{ display: "flex", alignItems: "center" }}>
                <Input value={subdomain} onChange={setSubdomain} />
                <span style={{ marginLeft: 8, color: "var(--steel)", fontSize: 13 }}>.zentrabite.com.au</span>
              </div>
            </Field>
            <Field label="Address">
              <Input value="12 King William St, Adelaide SA 5000" onChange={() => {}} />
            </Field>
            <SaveButton onClick={() => toast("Business profile saved")} />
          </Card>

          {/* Notifications */}
          <Card title="Notifications">
            <Toggle
              label="Email order alerts"
              sub="New order, refund requested, low rating"
              on={emailNotif}
              onToggle={() => setEmailNotif((v) => !v)}
            />
            <Toggle
              label="SMS staff alerts"
              sub="VIP arrival, late orders, low stock"
              on={smsNotif}
              onToggle={() => setSmsNotif((v) => !v)}
            />
            <Toggle
              label="Winback engine"
              sub="Auto-send recovery offers"
              on={winbackOn}
              onToggle={() => setWinbackOn((v) => !v)}
            />
            <Toggle
              label="AI receptionist"
              sub="Answer calls 24/7"
              on={aiCallsOn}
              onToggle={() => setAiCallsOn((v) => !v)}
            />
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Subscription */}
          <Card title="Subscription">
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                background: "linear-gradient(140deg, rgba(0,182,122,0.12), rgba(107,177,255,0.06))",
                border: "1px solid rgba(0,182,122,0.28)",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Subscription status
              </div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 26, color: "var(--green)", marginTop: 4 }}>
                Active
              </div>
              <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>
                All modules enabled · AI credits in good standing
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--cloud)" }}>
                Next billed: <strong>1 May 2026</strong>
              </div>
            </div>
            <button
              onClick={() => toast("Billing portal would open (demo)")}
              style={{ padding: "10px 14px", borderRadius: 10, background: "transparent", border: "1px solid var(--mist-9)", color: "var(--steel)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)", width: "100%" }}
            >
              Manage billing
            </button>
          </Card>

          {/* Integrations */}
          <Card title="Integrations">
            <IntegrationRow name="Stripe" status="connected" sub="Payouts daily 9am AEST" />
            <IntegrationRow name="Uber Eats" status="connected" sub="Synced 2m ago" />
            <IntegrationRow name="DoorDash" status="connected" sub="Synced 4m ago" />
            <IntegrationRow name="Twilio (SMS)" status="connected" sub="AU shortcode active" />
            <IntegrationRow name="Square POS" status="disconnected" sub="Connect to import legacy menu" />
          </Card>

          {/* Team */}
          <Card title="Team">
            {[
              { name: "Liam Potter", role: "Owner",  email: "liam@nonnas-kitchen.com.au" },
              { name: "Marco Rossi", role: "Manager",email: "marco@nonnas-kitchen.com.au" },
              { name: "Sara Lin",    role: "Staff",  email: "sara@nonnas-kitchen.com.au" },
            ].map((m) => (
              <div
                key={m.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--mist-9)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "rgba(0,182,122,0.18)",
                    color: "var(--green)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    fontFamily: "var(--font-outfit)",
                  }}
                >
                  {m.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{m.email}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--steel)", padding: "3px 9px", borderRadius: 999, background: "rgba(255,255,255,0.04)" }}>
                  {m.role}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                placeholder="Invite by email"
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "rgba(15,25,42,0.6)",
                  border: "1px solid var(--mist-9)",
                  color: "var(--cloud)",
                  fontSize: 13,
                  fontFamily: "var(--font-inter)",
                  outline: "none",
                }}
              />
              <button
                onClick={() => toast("Invite sent (demo)")}
                style={{ padding: "9px 14px", borderRadius: 10, background: "var(--green)", color: "var(--navy)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)" }}
              >
                Invite
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, color: "var(--cloud)", marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 5, fontSize: 12, color: "var(--steel)", fontWeight: 600 }}>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        width: "100%",
        padding: "9px 12px",
        borderRadius: 10,
        background: "rgba(15,25,42,0.6)",
        border: "1px solid var(--mist-9)",
        color: "var(--cloud)",
        fontSize: 13.5,
        fontFamily: "var(--font-inter)",
        outline: "none",
      }}
    />
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ marginTop: 6, padding: "9px 14px", borderRadius: 10, background: "var(--green)", color: "var(--navy)", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-inter)", justifySelf: "start" }}
    >
      Save changes
    </button>
  );
}

function Toggle({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        color: "inherit",
        fontFamily: "var(--font-inter)",
        borderBottom: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>{sub}</div>
      </div>
      <span
        style={{
          position: "relative",
          width: 36,
          height: 20,
          borderRadius: 999,
          background: on ? "var(--green)" : "var(--mist-9)",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "white",
            transition: "left 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </button>
  );
}

function IntegrationRow({ name, status, sub }: { name: string; status: "connected" | "disconnected"; sub: string }) {
  const connected = status === "connected";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--mist-9)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: connected ? "var(--green)" : "var(--steel)",
          boxShadow: connected ? "0 0 8px var(--green)" : "none",
        }}
        aria-hidden
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{sub}</div>
      </div>
      <button
        onClick={() => toast(`${connected ? "Disconnect" : "Connect"} ${name} (demo)`)}
        style={{
          padding: "5px 12px",
          borderRadius: 8,
          background: connected ? "transparent" : "var(--green)",
          border: connected ? "1px solid var(--mist-9)" : "none",
          color: connected ? "var(--steel)" : "var(--navy)",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "var(--font-inter)",
        }}
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}