"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { campaigns, customerById, formatAUD, timeAgo, type DemoCampaign, type DemoCustomer } from "../data";
import { Icon, type IconName } from "../../../components/zb-icon";
import { showOnPhone } from "../show-on-phone";

const STATUS_COLORS: Record<DemoCampaign["status"], { color: string; bg: string; label: string }> = {
  live:   { color: "#00AD82", bg: "rgba(0,173,130,0.14)",  label: "Live" },
  paused: { color: "#FFC14B", bg: "rgba(255,193,75,0.14)", label: "Paused" },
  draft:  { color: "#9CA8BD", bg: "rgba(156,168,189,0.14)", label: "Draft" },
};

const CHANNEL_COLORS: Record<DemoCampaign["channel"], { color: string; bg: string; label: string; icon: IconName }> = {
  sms:   { color: "#6BB1FF", bg: "rgba(107,177,255,0.14)", label: "SMS",   icon: "sms" },
  email: { color: "#C9A6FF", bg: "rgba(201,166,255,0.14)", label: "Email", icon: "email" },
};

function toast(text: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: rgba(0,173,130,0.94); color: #0F1F2D;
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
          className="wb-table"
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
            className="wb-row wb-head"
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
                className="wb-row"
                onClick={() => {
                  setSelectedId(isActive ? null : c.id);
                  if (!isActive) showOnPhone("campaign-detail");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "grid",
                  gridTemplateColumns: "1.6fr 110px 110px 110px 130px 90px",
                  gap: 10,
                  alignItems: "center",
                  padding: "14px 18px",
                  background: isActive ? "rgba(0,173,130,0.07)" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? "var(--green)" : "transparent"}`,
                  borderBottom: "1px solid var(--mist-9)",
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
                    <Icon name={ch.icon} size={14} />
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
            key={selected.id}
            campaign={selected}
            previewFor={customerById[selected.previewCustomerId]!}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* With the detail panel open the list is about 700px wide on a 1440px
          screen. The columns get narrower so the campaign name keeps a usable
          width. On smaller laptops the box is narrower still, so each campaign
          becomes a small card, the same as on a phone. Phones (820px and under)
          get that card layout from demo-shell.tsx, so these rules skip them. */}
      <style>{`
        .wb-table { container-type: inline-size; }
        @media (min-width: 821px) {
          @container (max-width: 820px) {
            .wb-row {
              grid-template-columns: minmax(180px, 1fr) 76px 56px 80px 94px 66px !important;
              gap: 8px !important;
              padding-left: 14px !important;
              padding-right: 14px !important;
            }
          }
          @container (max-width: 619px) {
            .wb-head { display: none !important; }
            .wb-row {
              grid-template-columns: auto auto minmax(0, 1fr) auto !important;
              align-items: start !important;
              row-gap: 8px !important;
              column-gap: 10px !important;
            }
            .wb-row > :nth-child(1) { grid-column: 1 / 4; grid-row: 1; }
            .wb-row > :nth-child(6) { grid-column: 4; grid-row: 1; }
            .wb-row > :nth-child(2) { grid-column: 1; grid-row: 2; }
            .wb-row > :nth-child(3) { grid-column: 2; grid-row: 2; }
            .wb-row > :nth-child(4) { grid-column: 3; grid-row: 2; }
            .wb-row > :nth-child(5) { grid-column: 4; grid-row: 2; text-align: right; }
            .wb-row > :nth-child(3)::before,
            .wb-row > :nth-child(4)::before {
              font-size: 11px; color: var(--steel); font-weight: 500; margin-right: 4px; font-family: var(--font-inter);
            }
            .wb-row > :nth-child(3)::before { content: "Sent"; }
            .wb-row > :nth-child(4)::before { content: "Back"; }
          }
        }
      `}</style>
    </div>
  );
}

function CampaignDetail({
  campaign,
  previewFor,
  onClose,
}: {
  campaign: DemoCampaign;
  /** A customer this campaign sends to. The preview is written for them. */
  previewFor: DemoCustomer;
  onClose: () => void;
}) {
  const [live, setLive] = useState(campaign.status === "live");
  const ch = CHANNEL_COLORS[campaign.channel];
  const firstName = previewFor.name.split(" ")[0] ?? "there";
  const favourite = previewFor.favourite.split(" + ")[0] ?? "pizza";
  const preview = campaign.template
    .replace("{name}", firstName)
    .replace("{favourite}", favourite);

  return (
    <aside
      id="campaign-detail"
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--mist-9)",
        padding: 20,
        position: "sticky",
        top: 116,
        scrollMarginTop: 120,
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
          <Icon name={ch.icon} size={14} style={{ marginRight: 6 }} />{ch.label}
        </span>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: live ? "rgba(0,173,130,0.14)" : "rgba(255,193,75,0.14)",
            color: live ? "#00AD82" : "#FFC14B",
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
        <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 6, lineHeight: 1.5 }}>
          Preview for {previewFor.name} ({previewFor.tier}, last order {timeAgo(previewFor.lastOrderAt)}). Each send is AI-tuned per customer.
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
          {live ? (
            <><Icon name="pause" size={14} accent="currentColor" style={{ marginRight: 6 }} />Pause campaign</>
          ) : (
            <><Icon name="play" size={14} accent="currentColor" style={{ marginRight: 6 }} />Activate campaign</>
          )}
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
