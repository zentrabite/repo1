"use client";

import { useState } from "react";
import {
  deliveryProviderMeta,
  deliveryExampleRoute,
  deliveryWeekPlan,
  deliveryAnalytics30d,
  deliveryRecentJobs,
  deliveryStatusLabel,
  formatAUD,
  formatTime,
  type DeliveryProviderId,
  type DemoProviderQuote,
} from "../data";

type Tab = "route" | "plan" | "analytics" | "jobs";

const TABS: { id: Tab; label: string }[] = [
  { id: "route",     label: "Route test" },
  { id: "plan",      label: "7-day plan" },
  { id: "analytics", label: "Analytics" },
  { id: "jobs",      label: "Recent jobs" },
];

export default function DemoDeliveryPage() {
  const [tab, setTab] = useState<Tab>("route");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Dispatch · Smart routing</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Smart Delivery Routing
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          Real-time provider selection · dynamic pricing · margin optimisation
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              background: tab === t.id ? "var(--green)" : "rgba(15,25,42,0.6)",
              color: tab === t.id ? "var(--navy)" : "var(--steel)",
              border: tab === t.id ? "1px solid var(--green)" : "1px solid var(--mist-9)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "route" && <RouteTest />}
      {tab === "plan" && <WeekPlan />}
      {tab === "analytics" && <Analytics />}
      {tab === "jobs" && <RecentJobs />}
    </div>
  );
}

// ─── Route Test ──────────────────────────────────────────────────────────────

function RouteTest() {
  const ex = deliveryExampleRoute;
  const [pickup, setPickup] = useState(ex.pickup);
  const [dropoff, setDropoff] = useState(ex.dropoff);
  const [distance, setDistance] = useState(String(ex.distanceKm));
  const [orderValue, setOrderValue] = useState(String(ex.orderValue));
  const [tier, setTier] = useState<"standard" | "priority">(ex.tier);
  const [peak, setPeak] = useState(ex.conditions.peak);
  const [highDemand, setHighDemand] = useState(ex.conditions.highDemand);
  const [badWeather, setBadWeather] = useState(ex.conditions.badWeather);
  const [decision, setDecision] = useState<typeof deliveryExampleRoute | null>(deliveryExampleRoute);
  const [running, setRunning] = useState(false);

  const runRoute = () => {
    setRunning(true);
    setDecision(null);
    setTimeout(() => {
      const dist = Number(distance) || 4;
      const tierMul = tier === "priority" ? 1.4 : 1;
      const peakMul = peak ? 1.15 : 1;
      const demandMul = highDemand ? 1.2 : 1;
      const weatherMul = badWeather ? 1.25 : 1;
      const conditionMul = peakMul * demandMul * weatherMul;

      const baseCost: Record<DeliveryProviderId, number> = {
        uber_direct: 4.5 + dist * 0.55,
        doordash:    5.2 + dist * 0.65,
        sherpa:      5.8 + dist * 0.75,
        zoom2u:      4.8 + dist * 0.62,
        gopeople:    4.6 + dist * 0.58,
      };

      const providers: DeliveryProviderId[] = ["uber_direct", "doordash", "sherpa", "zoom2u", "gopeople"];
      const quotes: DemoProviderQuote[] = providers.map((p, i) => {
        const cost = round2(baseCost[p] * tierMul * conditionMul);
        const pickupEta = clamp(4 + i * 2 + (peak ? 2 : 0) + (badWeather ? 3 : 0), 3, 18);
        const deliveryEta = Math.round(pickupEta + dist * 4 + (peak ? 3 : 0));
        const available = !(p === "gopeople" && (badWeather || dist > 8));
        return {
          provider: p,
          available,
          cost: available ? cost : 0,
          pickupEtaMin: available ? pickupEta : 0,
          deliveryEtaMin: available ? deliveryEta : 0,
          unavailableReason: available ? undefined : "No driver in coverage area",
        };
      });

      const cheapest = quotes.filter((q) => q.available).sort((a, b) => a.cost - b.cost)[0]!;
      const customerFee = tier === "priority" ? 8.5 : 6.5;
      const serviceFee = 2.5;
      const margin = round2(customerFee + serviceFee - cheapest.cost);

      setDecision({
        ...ex,
        pickup,
        dropoff,
        distanceKm: dist,
        orderValue: Number(orderValue) || 0,
        tier,
        conditions: { peak, highDemand, badWeather },
        selected: cheapest.provider,
        rationale:
          margin >= 0
            ? `Cheapest available · ${cheapest.pickupEtaMin}m pickup · margin +${formatAUD(margin)}`
            : `Cheapest available · margin ${formatAUD(margin)} (subsidised to retain customer)`,
        customerFee,
        serviceFee,
        providerCost: cheapest.cost,
        margin,
        pickupEtaMin: cheapest.pickupEtaMin,
        deliveryEtaMin: cheapest.deliveryEtaMin,
        quotes,
      });
      setRunning(false);
    }, 350);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 16 }}>
      <div style={cardStyle}>
        <div style={panelHeading}>Route parameters</div>
        <Field label="Pickup address" value={pickup} setValue={setPickup} />
        <Field label="Drop-off address" value={dropoff} setValue={setDropoff} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Distance (km)" value={distance} setValue={setDistance} type="number" />
          <Field label="Order value ($)" value={orderValue} setValue={setOrderValue} type="number" />
        </div>

        <div style={{ marginTop: 6, marginBottom: 12 }}>
          <Label>Delivery tier</Label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["standard", "priority"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: tier === t ? "var(--green)" : "rgba(15,25,42,0.55)",
                  color: tier === t ? "var(--navy)" : "var(--cloud)",
                  border: tier === t ? "1px solid var(--green)" : "1px solid var(--mist-9)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Label>Conditions</Label>
        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          {[
            { state: peak, set: setPeak, label: "Peak hour" },
            { state: highDemand, set: setHighDemand, label: "High demand" },
            { state: badWeather, set: setBadWeather, label: "Bad weather" },
          ].map((c) => (
            <label key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--cloud)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={c.state}
                onChange={(e) => c.set(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "var(--green)" }}
              />
              {c.label}
            </label>
          ))}
        </div>

        <button onClick={runRoute} disabled={running} style={{ ...btnPrimary, width: "100%", padding: "10px 14px" }}>
          {running ? "Querying providers…" : "Get optimal route"}
        </button>
        <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 8, textAlign: "center" }}>
          Demo: queries all five providers in parallel, applies margin rules, returns the cheapest viable.
        </div>
      </div>

      <div>
        {!decision || running ? (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--steel)" }}>{running ? "Querying providers…" : "Run a route to see the decision"}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <DecisionBanner decision={decision} />
            <div>
              <div style={{ ...panelHeading, marginBottom: 10 }}>All provider quotes</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                {decision.quotes.map((q) => (
                  <QuoteCard key={q.provider} q={q} selected={q.provider === decision.selected} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionBanner({ decision }: { decision: typeof deliveryExampleRoute }) {
  const meta = deliveryProviderMeta[decision.selected];
  const customerTotal = decision.customerFee + decision.serviceFee;
  return (
    <div
      style={{
        ...cardStyle,
        padding: "16px 20px",
        borderLeft: `3px solid ${meta.color}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="eyebrow">Selected provider</div>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: "var(--cloud)", marginTop: 4 }}>
            {meta.emoji} {meta.label}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 4 }}>{decision.rationale}</div>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--cloud)",
            background: "rgba(15,25,42,0.55)",
            border: "1px solid var(--mist-9)",
            textTransform: "capitalize",
            flexShrink: 0,
          }}
        >
          {decision.tier}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
        <Stat label="Provider cost" value={formatAUD(decision.providerCost)} valueColor="#FF5A5A" />
        <Stat label="Customer fee" value={formatAUD(decision.customerFee)} />
        <Stat label="Service fee" value={formatAUD(decision.serviceFee)} />
        <Stat
          label="Delivery margin"
          value={formatAUD(decision.margin)}
          valueColor={decision.margin >= 0 ? "var(--green)" : "#FF5A5A"}
        />
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "var(--steel)", flexWrap: "wrap" }}>
        <span>Pickup in {decision.pickupEtaMin} min</span>
        <span>Delivery in {decision.deliveryEtaMin} min</span>
        <span>Customer pays {formatAUD(customerTotal)} (delivery + service fee)</span>
      </div>
    </div>
  );
}

function QuoteCard({ q, selected }: { q: DemoProviderQuote; selected: boolean }) {
  const meta = deliveryProviderMeta[q.provider];
  return (
    <div
      style={{
        position: "relative",
        padding: "12px 14px",
        borderRadius: 10,
        background: selected ? `${meta.color}1F` : "rgba(15,25,42,0.55)",
        border: `1px solid ${selected ? meta.color : "var(--mist-9)"}`,
        opacity: q.available ? 1 : 0.5,
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            fontSize: 9.5,
            fontWeight: 700,
            color: meta.color,
            background: `${meta.color}2A`,
            padding: "2px 7px",
            borderRadius: 999,
            letterSpacing: "0.05em",
          }}
        >
          SELECTED
        </div>
      )}
      <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--cloud)", marginBottom: 4 }}>{meta.label}</div>
      {!q.available ? (
        <div style={{ fontSize: 11, color: "var(--steel)" }}>{q.unavailableReason ?? "Unavailable"}</div>
      ) : (
        <>
          <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20, color: meta.color, marginBottom: 2 }}>
            {formatAUD(q.cost)}
          </div>
          <div style={{ fontSize: 11, color: "var(--steel)" }}>
            ETA {q.deliveryEtaMin} min · pickup in {q.pickupEtaMin} min
          </div>
        </>
      )}
    </div>
  );
}

// ─── 7-Day Plan ──────────────────────────────────────────────────────────────

function WeekPlan() {
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 12.5, color: "var(--steel)", margin: 0 }}>
        Predicted volume per day-of-week, derived from the last 8 weeks of order history. Recommendation balances
        in-house driver hours with overflow to Uber Direct.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {deliveryWeekPlan.map((day, i) => {
          const accent = day.recommendation.provider === "uber_direct"
            ? "#3B82F6"
            : day.recommendation.provider === "in_house"
              ? "var(--green)"
              : day.recommendation.provider === "in_house_mix"
                ? "#F59E0B"
                : "var(--steel)";
          const isSelected = i === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              style={{
                padding: "12px 10px",
                textAlign: "center",
                cursor: "pointer",
                borderRadius: 12,
                background: isSelected ? `${accentToRgba(accent)}` : "var(--navy-40)",
                border: `1px solid ${isSelected ? accent : "var(--mist-6)"}`,
                color: "inherit",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: day.isToday ? "var(--green)" : "var(--steel)", marginBottom: 4 }}>
                {day.dayLabel}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{day.dateLabel}</div>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 22, color: "var(--cloud)" }}>
                {day.predictedVolume}
              </div>
              <div style={{ fontSize: 10, color: "var(--steel)", marginBottom: 8 }}>orders</div>
              <div
                style={{
                  padding: "3px 6px",
                  borderRadius: 6,
                  background: `${accent}25`,
                  color: accent,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {day.recommendation.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 6 }}>
                ${day.recommendation.estimatedCost}
              </div>
            </button>
          );
        })}
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(0,182,122,0.07)",
          border: "1px solid rgba(0,182,122,0.18)",
          fontSize: 12.5,
          color: "var(--green)",
        }}
      >
        Friday is the volume peak — dispatch is suggesting 3 in-house drivers with overflow to Uber Direct after 7 pm.
      </div>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────

function Analytics() {
  const a = deliveryAnalytics30d;
  const successPct = Math.round(a.successRate * 100);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <Stat label="Total jobs (30d)" value={String(a.totalJobs)} />
        <Stat label="Total margin" value={formatAUD(a.totalMargin)} valueColor="var(--green)" />
        <Stat label="Avg margin / job" value={formatAUD(a.avgMargin)} valueColor="var(--green)" />
        <Stat
          label="Success rate"
          value={`${successPct}%`}
          valueColor={successPct >= 90 ? "var(--green)" : "#F59E0B"}
        />
      </div>

      <div style={{ ...cardStyle, padding: "16px 20px" }}>
        <div style={panelHeading}>Provider breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 12 }}>
          {a.providerBreakdown.map((p) => {
            const meta = p.provider === "in_house"
              ? { label: "In-house drivers", color: "#00B67A", emoji: "🛵" }
              : deliveryProviderMeta[p.provider];
            return (
              <div
                key={p.provider}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(15,25,42,0.55)",
                  border: "1px solid var(--mist-9)",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--cloud)" }}>{meta.label}</div>
                <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 18, color: meta.color, margin: "4px 0" }}>
                  {Math.round(p.share * 100)}%{" "}
                  <span style={{ fontSize: 11, color: "var(--steel)", fontWeight: 500 }}>({p.count} jobs)</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--steel)" }}>
                  Avg {formatAUD(p.avgCost)} · {p.avgEtaMin} min ETA
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Recent Jobs ─────────────────────────────────────────────────────────────

function RecentJobs() {
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1.6fr 80px 110px 110px 110px 80px 110px 90px",
          gap: 10,
          padding: "12px 16px",
          fontSize: 11,
          color: "var(--steel)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
          borderBottom: "1px solid var(--mist-9)",
          background: "rgba(15,25,42,0.45)",
        }}
      >
        <div>Provider</div>
        <div>Drop-off</div>
        <div>Tier</div>
        <div style={{ textAlign: "right" }}>Provider cost</div>
        <div style={{ textAlign: "right" }}>Customer fee</div>
        <div style={{ textAlign: "right" }}>Margin</div>
        <div>ETA</div>
        <div>Status</div>
        <div>Time</div>
      </div>
      {deliveryRecentJobs.map((j, i) => {
        const meta = j.provider === "in_house"
          ? { label: "In-house", color: "#00B67A", emoji: "🛵" }
          : deliveryProviderMeta[j.provider];
        const status = deliveryStatusLabel[j.status];
        return (
          <div
            key={j.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.6fr 80px 110px 110px 110px 80px 110px 90px",
              gap: 10,
              padding: "12px 16px",
              alignItems: "center",
              borderBottom: "1px solid var(--mist-9)",
              background: i % 2 ? "transparent" : "rgba(15,25,42,0.22)",
              fontSize: 13,
              color: "var(--cloud)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{meta.emoji}</span>
              <span style={{ color: meta.color, fontWeight: 600, fontSize: 12.5 }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--steel)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {j.dropoffAddress}
            </div>
            <div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--cloud)",
                  background: "rgba(15,25,42,0.55)",
                  border: "1px solid var(--mist-9)",
                  textTransform: "capitalize",
                }}
              >
                {j.tier}
              </span>
            </div>
            <div style={{ textAlign: "right", color: "#FF5A5A", fontWeight: 600 }}>{formatAUD(j.providerCost)}</div>
            <div style={{ textAlign: "right" }}>{formatAUD(j.customerFee)}</div>
            <div style={{ textAlign: "right", fontWeight: 700, color: j.margin >= 0 ? "var(--green)" : "#FF5A5A" }}>
              {formatAUD(j.margin)}
            </div>
            <div style={{ fontSize: 12, color: "var(--steel)" }}>{j.etaMin} min</div>
            <div>
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: status.color,
                  background: status.bg,
                }}
              >
                {status.label}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--steel)" }}>{formatTime(j.createdAt)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  setValue,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid var(--mist-9)",
          background: "rgba(15,25,42,0.55)",
          color: "var(--cloud)",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--steel)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, valueColor = "var(--cloud)" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(15,25,42,0.55)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 18, color: valueColor, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 14,
  background: "var(--navy-40)",
  border: "1px solid var(--mist-6)",
};

const panelHeading: React.CSSProperties = {
  fontFamily: "var(--font-outfit)",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--cloud)",
  marginBottom: 12,
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--green)",
  background: "var(--green)",
  color: "var(--navy)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function accentToRgba(color: string) {
  if (color.startsWith("var(")) return "rgba(0,182,122,0.10)";
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.10)`;
  }
  return color;
}
