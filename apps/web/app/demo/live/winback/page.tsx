"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { campaigns, customers, formatAUD, type DemoCampaign } from "../data";

const STATUS_COLORS: Record<DemoCampaign["status"], { color: string; bg: string; label: string }> = {
  live:   { color: "#00B67A", bg: "rgba(0,182,122,0.14)",  label: "Live" },
  paused: { color: "#FFC14B", bg: "rgba(255,193,75,0.14)", label: "Paused" },
  draft:  { color: "#9CA8BD", bg: "rgba(156,168,189,0.14)", label: "Draft" },
};

const CHANNEL_COLORS: Record<DemoCampaign["channel"], { color: string; bg: string; label: string; emoji: string }> = {
  sms:   { color: "#6BB1FF", bg: "rgba(107,177,255,0.14)", label: "SMS",   emoji: "💬" },
  email: { color: "#C9A6FF", bg: "rgba(201,166,255,0.14)", label: "Email", emoji: "✉️" },
};

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
    animation: slideIn 0.2s ease-out;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export default function WinbackPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  // Aggregate stats across all campaigns
  const totals = useMemo(() => {
    const sent = campaigns.reduce((s, c) => s + c.sent30d, 0);
    const recovered = campaigns.reduce((s, c) => s + c.recovered30d, 0);
    const revenue = campaigns.reduce((s, c) => s + c.revenue30d, 0);
    const liveCount = campaigns.filter((c) => c.status === "live").length;
    return { sent, recovered, revenue, liveCount };
  }, []);

  // Pick a deterministic sample customer for template preview
  const sampleCustomer = customers[0]!;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Win-Back
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Automated campaigns that bring customers back. Powered by AI personalisation.
          </p>
        </div>
        <button
          onClick={() => toast("New campaign draft created (demo)")}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "var(--green)",
            color: "var(--navy)",
            border: "none",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          + Create campaign
        </button>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          { label: "Live campaigns", value: String(totals.liveCount), sub: `${campaigns.length - totals.liveCount} paused/draft`, color: "var(--green)" },
          { label: "Messages sent · 30d", value: totals.sent.toLocaleString("en-AU"), sub: "Across SMS + email", color: "var(--cloud)" },
          { label: "Customers recovered", value: String(totals.recovered), sub: `${((totals.recovered / Math.max(1, totals.sent)) * 100).toFixed(1)}% reply rate`, color: "var(--cloud)" },
          { label: "Revenue recovered", value: formatAUD(totals.revenue), sub: `$${(totals.revenue / Math.max(1, totals.recovered)).toFixed(0)} avg ticket`, color: "var(--green)" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--mist-9)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 26, color: s.color, marginTop: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Campaigns list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0,1fr) 420px" : "1fr", gap: 16 }}>
        <div
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--mist-9)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--mist-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)" }}>
              All campaigns · {campaigns.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)" }}>Last 30 days</div>
          </div>

          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 110px 110px 110px 130px 90px",
              gap: 10,
              padding: "10px 18px",
              fontSize: 11,
              color: "var(--steel)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              borderBottom: "1px solid var(--mist-9)",
            }}
          >
            <div>Campaign</div>
            <div>Channel</div>
            <div>Sent</div>
            <div>Recovered</div>
            <div>Revenue</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>

          {/* Campaign rows */}
          {campaigns.map((c) => {
            const recoveryRate = c.sent30d > 0 ? (c.recovered30d / c.sent30d) * 100 : 0;
            const isActive = selectedId === c.id;
            const ch = CHANNEL_COLORS[c.channel];
            const st = STATUS_COLORS[c.status];

            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(isActive ? null : c.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "grid",
                  gridTemplateColumns: "1.6fr 110px 110px 110px 130px 90px",
                  gap: 10,
                  alignItems: "center",
                  padding: "14px 18px",
                  background: isActive ? "rgba(0,182,122,0.07)" : "transparent",
                  borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                  borderBottom: "1px solid var(--mist-9)",
                  border: "none",
                  borderTop: "none",
                  borderRight: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--cloud)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>
                    Trigger: {c.trigger}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 9px",
                      borderRadius: 8,
                      background: ch.bg,
                      color: ch.color,
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    <span aria-hidden>{ch.emoji}</span>
                    {ch.label}
                  </span>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 14, color: "var(--cloud)" }}>
                  {c.sent30d.toLocaleString("en-AU")}
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 14, color: "var(--cloud)" }}>
                  {c.recovered30d}
                  <div style={{ fontSize: 11, color: "var(--steel)" }}>{recoveryRate.toFixed(1)}%</div>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 14, color: "var(--green)", fontWeight: 600 }}>
                  {formatAUD(c.revenue30d)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: st.bg,
                      color: st.color,
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <CampaignDetail
            campaign={selected}
            sampleName={sampleCustomer.name.split(" ")[0] ?? "there"}
            sampleFav={sampleCustomer.favourite.split(" + ")[0] ?? "pizza"}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

function CampaignDetail({
  campaign,
  sampleName,
  sampleFav,
  onClose,
}: {
  campaign: DemoCampaign;
  sampleName: string;
  sampleFav: string;
  onClose: () => void;
}) {
  const [live, setLive] = useState(campaign.status === "live");
  const ch = CHANNEL_COLORS[campaign.channel];
  const preview = campaign.template
    .replace("{name}", sampleName)
    .replace("{favourite}", sampleFav);

  return (
    <aside
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--mist-9)",
        padding: 20,
        position: "sticky",
        top: 116,
        height: "fit-content",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          Campaign detail
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--steel)", cursor: "pointer", fontSize: 16 }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 19, color: "var(--cloud)", lineHeight: 1.25 }}>
        {campaign.name}
      </div>
      <div style={{ fontSize: 13, color: "var(--steel)", marginTop: 6 }}>
        {campaign.trigger}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: ch.bg,
            color: ch.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {ch.emoji} {ch.label}
        </span>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: live ? "rgba(0,182,122,0.14)" : "rgba(255,193,75,0.14)",
            color: live ? "#00B67A" : "#FFC14B",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {live ? "Live" : "Paused"}
        </span>
      </div>

      {/* Template preview */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
          Message preview
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(107,177,255,0.08)",
            border: "1px solid rgba(107,177,255,0.22)",
            fontSize: 13.5,
            color: "var(--cloud)",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {preview}
        </div>
        <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 6 }}>
          Preview personalised for {sampleName}. Each send is AI-tuned per customer.
        </div>
      </div>

      {/* 30-day stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 18,
        }}
      >
        {[
          { label: "Sent", value: campaign.sent30d.toLocaleString("en-AU") },
          { label: "Recovered", value: String(campaign.recovered30d) },
          { label: "Revenue", value: formatAUD(campaign.revenue30d) },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: 10,
              borderRadius: 10,
              background: "rgba(15,25,42,0.5)",
              border: "1px solid var(--mist-9)",
            }}
          >
            <div style={{ fontSize: 10.5, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 15, color: "var(--cloud)", marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
        <button
          onClick={() => {
            setLive((v) => !v);
            toast(live ? "Campaign paused (demo)" : "Campaign activated (demo)");
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: live ? "rgba(255,193,75,0.14)" : "var(--green)",
            color: live ? "#FFC14B" : "var(--navy)",
            border: live ? "1px solid rgba(255,193,75,0.3)" : "none",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          {live ? "⏸ Pause campaign" : "▶ Activate campaign"}
        </button>
        <button
          onClick={() => toast("Test message sent to your number (demo)")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(107,177,255,0.10)",
            color: "#6BB1FF",
            border: "1px solid rgba(107,177,255,0.28)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          Send test to my phone
        </button>
        <button
          onClick={() => toast("Edit mode would open here (demo)")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "transparent",
            color: "var(--steel)",
            border: "1px solid var(--mist-9)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}
        >
          Edit template & trigger
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid var(--mist-9)",
          fontSize: 12,
          color: "var(--steel)",
          lineHeight: 1.5,
        }}
      >
        Want to see who this campaign is targeting?{" "}
        <Link href="/demo/live/customers" style={{ color: "var(--green)", fontWeight: 600 }}>
          View customer list →
        </Link>
      </div>
    </aside>
  );
}
