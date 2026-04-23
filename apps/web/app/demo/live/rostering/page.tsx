"use client";

// Demo rostering page — mirrors the CRM /rostering view.
// Weekly grid, click a shift to edit, drag-less for simplicity.

import { useMemo, useState } from "react";
import {
  rosterShifts as SEED_SHIFTS,
  rosterRoleLabel,
  rosterDays,
  type DemoShift,
  type RosterRole,
} from "../data";

type RoleFilter = RosterRole | "all";

export default function DemoRosteringPage() {
  const [shifts, setShifts] = useState<DemoShift[]>(SEED_SHIFTS);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (roleFilter === "all" ? shifts : shifts.filter((s) => s.role === roleFilter)),
    [shifts, roleFilter]
  );

  // Totals by day
  const byDay = useMemo(() => {
    const result: { day: number; shifts: DemoShift[]; totalHours: number; totalWages: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dayShifts = filtered.filter((s) => s.dayOfWeek === d);
      const totalHours = dayShifts.reduce((sum, s) => sum + hoursBetween(s.start, s.end), 0);
      const totalWages = dayShifts.reduce((sum, s) => sum + hoursBetween(s.start, s.end) * s.hourlyRate, 0);
      result.push({ day: d, shifts: dayShifts, totalHours, totalWages });
    }
    return result;
  }, [filtered]);

  const weekTotals = useMemo(() => {
    const hours = byDay.reduce((s, d) => s + d.totalHours, 0);
    const wages = byDay.reduce((s, d) => s + d.totalWages, 0);
    return { hours, wages };
  }, [byDay]);

  const selected = selectedId ? shifts.find((s) => s.id === selectedId) ?? null : null;

  function updateStatus(id: string, status: DemoShift["status"]) {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Team</div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 28, color: "var(--cloud)", margin: 0 }}>
          Rostering
        </h1>
        <div style={{ fontSize: 14, color: "var(--steel)", marginTop: 6 }}>
          Week of Mon 13 Apr — Sun 19 Apr · {weekTotals.hours.toFixed(1)}h scheduled · ${weekTotals.wages.toFixed(0)} wages
        </div>
      </div>

      {/* Role filters + week summary */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterChip label="All roles" active={roleFilter === "all"} onClick={() => setRoleFilter("all")} />
          {(Object.keys(rosterRoleLabel) as RosterRole[]).map((r) => (
            <FilterChip
              key={r}
              label={`${rosterRoleLabel[r].emoji} ${rosterRoleLabel[r].label}`}
              color={rosterRoleLabel[r].color}
              active={roleFilter === r}
              onClick={() => setRoleFilter(r)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <DemoButton label="Suggest with AI" icon="✨" />
          <DemoButton label="Export to payroll" icon="💸" />
        </div>
      </div>

      {/* Week grid */}
      <div
        className="demo-roster-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10,
        }}
      >
        {byDay.map(({ day, shifts: dayShifts, totalHours, totalWages }) => (
          <div
            key={day}
            style={{
              background: "var(--navy-40)",
              border: "1px solid var(--mist-9)",
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 320,
            }}
          >
            {/* Day header */}
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--mist-9)",
                background: "rgba(15,25,42,0.55)",
              }}
            >
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 13, color: "var(--cloud)" }}>
                {rosterDays[day]}
              </div>
              <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>
                {dayShifts.length} {dayShifts.length === 1 ? "shift" : "shifts"} · {totalHours.toFixed(1)}h
              </div>
            </div>

            {/* Shifts */}
            <div style={{ padding: 8, display: "grid", gap: 6, flex: 1 }}>
              {dayShifts.length === 0 ? (
                <div style={{ color: "var(--steel)", fontSize: 12, padding: 10, textAlign: "center" }}>
                  No shifts
                </div>
              ) : (
                dayShifts.map((s) => {
                  const role = rosterRoleLabel[s.role];
                  const hours = hoursBetween(s.start, s.end);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      style={{
                        display: "grid",
                        gap: 3,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: role.bg,
                        border: `1px solid ${role.color}33`,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        color: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--cloud)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.employeeName}
                        </span>
                        <span style={{ fontSize: 10, color: role.color, fontWeight: 700 }}>
                          {role.emoji}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--steel)", fontFamily: "var(--font-mono)" }}>
                        {s.start} – {s.end}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5 }}>
                        <span style={{ color: "var(--steel)" }}>{hours.toFixed(1)}h</span>
                        <StatusDot status={s.status} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Day footer — wages */}
            <div
              style={{
                padding: "8px 12px",
                borderTop: "1px solid var(--mist-9)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
              }}
            >
              <span style={{ color: "var(--steel)" }}>Wages</span>
              <span style={{ color: "var(--cloud)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                ${totalWages.toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Week totals footer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryCard label="Weekly hours"   value={`${weekTotals.hours.toFixed(1)}h`}      icon="⏱️" />
        <SummaryCard label="Weekly wages"   value={`$${weekTotals.wages.toFixed(0)}`}      icon="💰" accent />
        <SummaryCard label="Employees"      value={String(new Set(filtered.map((s) => s.employeeName)).size)} icon="👥" />
        <SummaryCard label="Avg hourly rate" value={`$${avgRate(filtered).toFixed(2)}`}     icon="📈" />
      </div>

      {selected && <ShiftDrawer shift={selected} onClose={() => setSelectedId(null)} onStatus={(s) => updateStatus(selected.id, s)} />}

      <style>{`
        @media (max-width: 1100px) {
          .demo-roster-grid {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  return Math.max(0, eh + em / 60 - (sh + sm / 60));
}

function avgRate(list: DemoShift[]): number {
  if (list.length === 0) return 0;
  return list.reduce((sum, s) => sum + s.hourlyRate, 0) / list.length;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterChip({
  label, active, color = "var(--steel)", onClick,
}: {
  label: string; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "var(--green)" : "rgba(15,25,42,0.6)",
        color: active ? "var(--navy)" : color,
        border: active ? "1px solid var(--green)" : "1px solid var(--mist-9)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label, value, icon, accent = false,
}: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: "var(--navy-40)",
        border: "1px solid var(--mist-9)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "var(--steel)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 15 }}>{icon}</div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 800,
          fontSize: 22,
          color: accent ? "var(--green)" : "var(--cloud)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: DemoShift["status"] }) {
  const map: Record<DemoShift["status"], { label: string; color: string }> = {
    scheduled: { label: "Scheduled", color: "var(--steel)" },
    confirmed: { label: "Confirmed", color: "var(--green)" },
    completed: { label: "Done",      color: "#63B3FF" },
    missed:    { label: "Missed",    color: "#FF5A5A" },
  };
  const s = map[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: s.color, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.color }} aria-hidden />
      {s.label}
    </span>
  );
}

function ShiftDrawer({
  shift, onClose, onStatus,
}: {
  shift: DemoShift;
  onClose: () => void;
  onStatus: (s: DemoShift["status"]) => void;
}) {
  const role = rosterRoleLabel[shift.role];
  const hours = hoursBetween(shift.start, shift.end);
  const cost = hours * shift.hourlyRate;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 70 }}
      />
      <aside
        style={{
          position: "fixed",
          top: 40, bottom: 0, right: 0,
          width: "min(420px, 96vw)",
          background: "var(--near-black)",
          borderLeft: "1px solid var(--mist-9)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--mist-9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "var(--near-black)",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: role.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              {role.emoji} {role.label}
            </div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20, color: "var(--cloud)", marginTop: 2 }}>
              {shift.employeeName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid var(--mist-9)", color: "var(--steel)", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Day"     value={rosterDays[shift.dayOfWeek] ?? ""} />
            <Row label="Shift"   value={`${shift.start} – ${shift.end}`} mono />
            <Row label="Hours"   value={`${hours.toFixed(1)} h`} mono />
            <Row label="Rate"    value={`$${shift.hourlyRate.toFixed(2)} / h`} mono />
            <Row label="Wages"   value={`$${cost.toFixed(2)}`} mono bold />
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
              Status
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["scheduled", "confirmed", "completed", "missed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatus(s)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: shift.status === s ? "var(--green)" : "rgba(15,25,42,0.6)",
                    color: shift.status === s ? "var(--navy)" : "var(--cloud)",
                    border: shift.status === s ? "1px solid var(--green)" : "1px solid var(--mist-9)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <DemoButton label="Send SMS reminder"       icon="📱" />
            <DemoButton label="Swap with another staff" icon="🔁" />
            <DemoButton label="Delete shift"            icon="🗑️" />
          </div>
        </div>
      </aside>
    </>
  );
}

function Row({
  label, value, mono = false, bold = false,
}: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "var(--steel)" }}>{label}</span>
      <span
        style={{
          color: "var(--cloud)",
          fontWeight: bold ? 700 : 500,
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          fontSize: bold ? 15 : 13.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DemoButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          const el = document.createElement("div");
          el.textContent = `Demo: "${label}" triggered (nothing actually saved).`;
          el.style.cssText =
            "position:fixed;bottom:24px;right:24px;padding:12px 16px;border-radius:10px;background:var(--navy-40);border:1px solid var(--mist-9);color:var(--cloud);font-size:13px;z-index:999;box-shadow:0 12px 40px rgba(0,0,0,.4);";
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 2400);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(15,25,42,0.55)",
        border: "1px solid var(--mist-9)",
        color: "var(--cloud)",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
