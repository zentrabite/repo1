"use client";

import { useMemo, useState } from "react";
import {
  stockItems as initialItems,
  stockDeliveries,
  stockStats,
  stockStatusColor,
  stockStatusLabel,
  formatAUD,
  type StockItem,
  type StockStatus,
} from "../data";

function toast(text: string, tone: "ok" | "warn" = "ok") {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999;
    background: ${tone === "warn" ? "rgba(255,107,53,0.94)" : "rgba(0,182,122,0.94)"};
    color: #0F1F2D;
    padding: 10px 16px; border-radius: 10px; font-weight: 600;
    font-family: var(--font-inter); font-size: 13px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

type FilterKey = "all" | StockStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All items" },
  { key: "critical", label: "Critical" },
  { key: "low", label: "Low" },
  { key: "expiring", label: "Expiring" },
  { key: "ok", label: "In stock" },
];

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);

  const filtered = useMemo(
    () => items.filter((i) => (filter === "all" ? true : i.status === filter)),
    [items, filter]
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const aiCart = useMemo(() => items.filter((i) => i.aiSuggestOrder > 0), [items]);
  const aiCartValue = aiCart.reduce((s, i) => s + i.aiSuggestOrder * i.costPerUnit, 0);

  function acceptAll() {
    setItems((prev) =>
      prev.map((i) =>
        i.aiSuggestOrder > 0 ? { ...i, onHand: i.onHand + i.aiSuggestOrder, status: "ok", aiSuggestOrder: 0 } : i
      )
    );
    toast(`✓ ${aiCart.length} orders sent to suppliers · ${formatAUD(aiCartValue)}`);
  }

  function acceptOne(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, onHand: i.onHand + i.aiSuggestOrder, status: "ok", aiSuggestOrder: 0 } : i
      )
    );
    toast(`${item.name} · ordered ${item.aiSuggestOrder}${item.unit} from ${item.supplier}`);
  }

  function dismissOne(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, aiSuggestOrder: 0 } : i)));
    toast("AI suggestion dismissed", "warn");
  }

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
            Stock take · AI ordering
          </h1>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Live inventory, predicted reorders, expiry tracking — the brain that keeps your kitchen full and your waste low.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => toast("Voice stock count started — say item names to log (demo)")}
            style={btnGhost("#C9A6FF", "rgba(201,166,255,0.12)", "rgba(201,166,255,0.28)")}
          >
            🎙 Voice count
          </button>
          <button
            onClick={acceptAll}
            disabled={aiCart.length === 0}
            style={{
              ...btnPrimary(),
              opacity: aiCart.length === 0 ? 0.45 : 1,
              cursor: aiCart.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ✨ Accept all AI orders ({aiCart.length}) · {formatAUD(aiCartValue)}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Items tracked" value={String(stockStats.itemsTracked)} />
        <Stat label="Low or critical" value={String(stockStats.lowOrCritical)} color="var(--orange)" />
        <Stat label="Expiring ≤ 3 days" value={String(stockStats.expiringSoon)} color="#febc2e" />
        <Stat label="AI suggested order" value={formatAUD(aiCartValue)} color="var(--green)" />
        <Stat label="Waste avoided · 30d" value={formatAUD(stockStats.estWasteAvoided30d)} color="var(--green)" sub="vs. pre-AI baseline" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              border: `1px solid ${filter === f.key ? "var(--green)" : "var(--mist-9)"}`,
              background: filter === f.key ? "var(--green-15)" : "transparent",
              color: filter === f.key ? "var(--green)" : "var(--cloud)",
              cursor: "pointer",
              fontFamily: "var(--font-inter)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main grid: list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 20 }} className="stock-grid">
        {/* Stock list */}
        <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mist-9)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cloud)" }}>
              Inventory · {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </div>
            <button
              onClick={() => toast("Full stock take mode — scan + count all items")}
              style={{ padding: "6px 12px", background: "transparent", color: "var(--steel)", border: "1px solid var(--mist-9)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Start full stock take
            </button>
          </div>

          <div style={{ maxHeight: 640, overflow: "auto" }}>
            {filtered.map((i) => {
              const pct = Math.min(100, (i.onHand / i.parLevel) * 100);
              const isSel = i.id === selectedId;
              return (
                <button
                  key={i.id}
                  onClick={() => setSelectedId(i.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 110px 90px",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    background: isSel ? "rgba(0,182,122,0.08)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--cloud)",
                    fontFamily: "var(--font-inter)",
                    width: "100%",
                    borderTop: "none",
                    borderLeft: `3px solid ${isSel ? "var(--green)" : "transparent"}`,
                    borderRight: "none",
                    borderBottom: "1px solid var(--mist-9)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--cloud)", display: "flex", alignItems: "center", gap: 8 }}>
                      {i.name}
                      {i.expiresIn !== null && i.expiresIn <= 3 && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(254,188,46,0.15)", color: "#febc2e", fontWeight: 700 }}>
                          ⏱ {i.expiresIn}d
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 2 }}>
                      {i.category} · {i.supplier}
                    </div>
                    <div style={{ marginTop: 6, height: 4, background: "var(--mist-6)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: stockStatusColor(i.status), transition: "width 0.3s" }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--cloud)", textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>
                      {i.onHand}
                      <span style={{ color: "var(--steel)", fontSize: 11, fontWeight: 500 }}>{i.unit}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--steel)" }}>par {i.parLevel}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {i.aiSuggestOrder > 0 ? (
                      <>
                        <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
                          +{i.aiSuggestOrder}{i.unit}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--steel)" }}>
                          {formatAUD(i.aiSuggestOrder * i.costPerUnit)}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--steel)" }}>—</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        color: stockStatusColor(i.status),
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${stockStatusColor(i.status)}55`,
                      }}
                    >
                      {stockStatusLabel(i.status)}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--steel)", fontSize: 13 }}>
                Nothing matches this filter.
              </div>
            )}
          </div>
        </div>

        {/* Right column: detail + deliveries + AI reorder */}
        <div style={{ display: "grid", gap: 16, alignContent: "flex-start" }}>
          {selected && <StockDetail item={selected} onAccept={() => acceptOne(selected.id)} onDismiss={() => dismissOne(selected.id)} />}

          {/* Incoming deliveries */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cloud)", marginBottom: 12 }}>
              Incoming deliveries
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {stockDeliveries.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--navy-40)",
                    border: "1px solid var(--mist-6)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cloud)" }}>{d.supplier}</div>
                    <div style={{ fontSize: 11.5, color: "var(--steel)" }}>
                      {d.itemsCount} items · ETA {d.eta}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--cloud)" }}>
                    {formatAUD(d.total)}
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      color:
                        d.status === "delivered"
                          ? "var(--green)"
                          : d.status === "in-transit"
                          ? "#febc2e"
                          : d.status === "delayed"
                          ? "#ff5f57"
                          : "var(--steel)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--mist-9)",
                    }}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI insights */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cloud)", marginBottom: 12 }}>
              ✨ AI insights
            </div>
            <div style={{ display: "grid", gap: 10, fontSize: 13, color: "var(--cloud)", lineHeight: 1.5 }}>
              <Insight
                tone="warn"
                title="Chicken thigh will run out Thursday lunch"
                body="Based on 14-day use rate. AI suggests 18kg from Meatworks AU — $261."
              />
              <Insight
                tone="warn"
                title="Pizza box overbought 3 weeks ago"
                body="Demand flat. Reduce next order to 200 boxes — save $76."
              />
              <Insight
                tone="ok"
                title="Friday prep: +18% mozzarella forecast"
                body="Live orders trending higher week-on-week. Prep 1.5× normal."
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1080px) {
          .stock-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StockDetail({
  item,
  onAccept,
  onDismiss,
}: {
  item: StockItem;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const daysCover = item.avgDailyUse > 0 ? (item.onHand / item.avgDailyUse).toFixed(1) : "—";
  const reorderValue = item.aiSuggestOrder * item.costPerUnit;

  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>
            {item.category}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cloud)" }}>{item.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--steel)", marginTop: 2 }}>Supplier · {item.supplier}</div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            color: stockStatusColor(item.status),
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${stockStatusColor(item.status)}55`,
          }}
        >
          {stockStatusLabel(item.status)}
        </span>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <Mini label="On hand" value={`${item.onHand}${item.unit}`} />
        <Mini label="Days cover" value={daysCover} />
        <Mini label="Avg daily use" value={`${item.avgDailyUse}${item.unit}`} />
        <Mini label="Par level" value={`${item.parLevel}${item.unit}`} />
        <Mini label="Reorder at" value={`${item.reorderAt}${item.unit}`} />
        <Mini label="Expires in" value={item.expiresIn === null ? "—" : `${item.expiresIn}d`} />
        <Mini label="Last delivery" value={item.lastDelivery} />
        <Mini label="Cost / unit" value={formatAUD(item.costPerUnit)} />
      </div>

      {item.linkedMenuItems.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--mist-9)" }}>
          <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>
            Used in
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {item.linkedMenuItems.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 11.5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "var(--navy-40)",
                  border: "1px solid var(--mist-9)",
                  color: "var(--cloud)",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.aiSuggestOrder > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            background: "rgba(0,182,122,0.08)",
            border: "1px solid rgba(0,182,122,0.35)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>
            ✨ AI suggests ordering
          </div>
          <div style={{ fontSize: 15, color: "var(--cloud)", fontWeight: 600 }}>
            {item.aiSuggestOrder}{item.unit} · {formatAUD(reorderValue)} from {item.supplier}
          </div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 4 }}>
            Restores to par level · covers ~{Math.round(item.parLevel / item.avgDailyUse)} days at current pace.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onAccept} style={btnPrimary()}>
              Accept & send order
            </button>
            <button onClick={onDismiss} style={btnGhost("var(--cloud)", "transparent", "var(--mist-9)")}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "var(--cloud)", sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: "var(--navy-40)",
        border: "1px solid var(--mist-6)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontFamily: "var(--font-outfit)", fontWeight: 800, color, marginTop: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        background: "var(--navy-40)",
        border: "1px solid var(--mist-6)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--cloud)", fontWeight: 600, marginTop: 3, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
    </div>
  );
}

function Insight({ tone, title, body }: { tone: "ok" | "warn"; title: string; body: string }) {
  const color = tone === "warn" ? "var(--orange)" : "var(--green)";
  const bg = tone === "warn" ? "rgba(255,107,53,0.08)" : "rgba(0,182,122,0.08)";
  const border = tone === "warn" ? "rgba(255,107,53,0.28)" : "rgba(0,182,122,0.28)";
  return (
    <div style={{ padding: 12, borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--steel)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    background: "var(--green)",
    color: "var(--navy)",
    border: "none",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "var(--font-inter)",
  };
}

function btnGhost(color: string, bg: string, border: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    background: bg,
    color,
    border: `1px solid ${border}`,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "var(--font-inter)",
  };
}
