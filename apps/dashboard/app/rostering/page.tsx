"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/stat-card";
import Toast from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getShifts, createShift, updateShift, deleteShift, getRevenueByDay } from "@/lib/queries";
import type { RosterShift } from "@/lib/database.types";

const C = { g:"#00B67A", o:"#FF6B35", am:"#F59E0B", st:"#6B7C93", r:"#DC3545", be:"#63B3FF" };
const ROLE_COLORS: Record<string, string> = {
  kitchen: C.am, front: C.be, driver: C.o, manager: C.g,
};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;   // Monday = 0
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDay(d: Date) {
  return d.toISOString().split("T")[0];
}

const BLANK_FORM = {
  employee_name: "",
  role: "kitchen",
  shift_start: "",
  shift_end: "",
  hourly_rate: 28,
  notes: "",
};

export default function RosteringPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [revByDay, setRevByDay] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      getShifts(businessId, weekStart.toISOString(), weekEnd.toISOString()),
      getRevenueByDay(businessId, 28),    // 4 weeks of history for smart suggestions
    ])
      .then(([s, rd]) => { setShifts(s); setRevByDay(rd); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [businessId, weekStart, weekEnd]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, RosterShift[]>();
    for (let i = 0; i < 7; i++) map.set(fmtDay(addDays(weekStart, i)), []);
    for (const s of shifts) {
      const key = fmtDay(new Date(s.shift_start));
      if (map.has(key)) map.get(key)!.push(s);
    }
    return map;
  }, [shifts, weekStart]);

  // Smart suggestion: avg revenue by weekday from last 4 weeks
  const suggestion = useMemo(() => {
    if (revByDay.length === 0) return null;
    const weekdayTotals = [0,0,0,0,0,0,0];
    const weekdayCounts = [0,0,0,0,0,0,0];
    for (const d of revByDay) {
      const dayIdx = (new Date(d.date).getDay() + 6) % 7;
      weekdayTotals[dayIdx] += d.revenue;
      weekdayCounts[dayIdx] += 1;
    }
    return weekdayTotals.map((tot, i) => ({
      day: DAYS[i],
      avgRevenue: weekdayCounts[i] === 0 ? 0 : tot / weekdayCounts[i],
    }));
  }, [revByDay]);

  // A rough rule of thumb: 1 staff member per $400 of expected revenue, min 2.
  const staffSuggestion = (avgRevenue: number) => Math.max(2, Math.round(avgRevenue / 400));

  const save = async () => {
    if (!businessId) return;
    if (!form.employee_name.trim() || !form.shift_start || !form.shift_end) {
      show("Name, start and end are required");
      return;
    }
    try {
      const payload = {
        employee_name: form.employee_name,
        role: form.role,
        shift_start: new Date(form.shift_start).toISOString(),
        shift_end: new Date(form.shift_end).toISOString(),
        hourly_rate: form.hourly_rate || null,
        notes: form.notes || null,
      };
      if (editingId) {
        await updateShift(editingId, payload);
        show("Shift saved ✓");
      } else {
        await createShift(businessId, payload);
        show("Shift added ✓");
      }
      const s = await getShifts(businessId, weekStart.toISOString(), weekEnd.toISOString());
      setShifts(s);
      setEditingId(null);
      setForm(BLANK_FORM);
    } catch (e: any) {
      show(`Error: ${e.message ?? e}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this shift?")) return;
    await deleteShift(id);
    setShifts(prev => prev.filter(s => s.id !== id));
    show("Shift removed");
  };

  const edit = (s: RosterShift) => {
    setEditingId(s.id);
    setForm({
      employee_name: s.employee_name,
      role: s.role ?? "kitchen",
      shift_start: s.shift_start.slice(0, 16),
      shift_end: s.shift_end.slice(0, 16),
      hourly_rate: Number(s.hourly_rate ?? 0),
      notes: s.notes ?? "",
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const totalHours = shifts.reduce((sum, s) => {
    const h = (new Date(s.shift_end).getTime() - new Date(s.shift_start).getTime()) / 36e5;
    return sum + h;
  }, 0);

  const totalLabour = shifts.reduce((sum, s) => {
    const h = (new Date(s.shift_end).getTime() - new Date(s.shift_start).getTime()) / 36e5;
    return sum + h * Number(s.hourly_rate ?? 0);
  }, 0);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Rostering</h2>
          <p style={{ color:C.st, fontSize:12 }}>Plan staff shifts with sales-aware suggestions.</p>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button className="bg-btn" onClick={() => setWeekStart(d => addDays(d, -7))}>←</button>
          <div style={{ color:"#fff", fontSize:12, padding:"0 8px" }}>{weekLabel}</div>
          <button className="bg-btn" onClick={() => setWeekStart(d => addDays(d, 7))}>→</button>
          <button className="bg-btn" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatCard label="Shifts this week"   value={String(shifts.length)} icon="🗓️" />
        <StatCard label="Total hours"        value={totalHours.toFixed(1)} icon="⏱️" delay={50} />
        <StatCard label="Labour cost"        value={`$${Math.round(totalLabour).toLocaleString()}`} accent icon="💵" delay={100} />
        <StatCard label="Avg shifts/day"     value={(shifts.length/7).toFixed(1)} icon="👥" delay={150} />
      </div>

      {/* Week grid */}
      <div className="gc" style={{ padding:14, marginBottom:14, overflowX:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(140px, 1fr))", gap:8, minWidth:980 }}>
          {DAYS.map((dayLabel, i) => {
            const d = addDays(weekStart, i);
            const dayShifts = shiftsByDay.get(fmtDay(d)) ?? [];
            const sug = suggestion?.[i];
            const recommendedStaff = sug ? staffSuggestion(sug.avgRevenue) : null;

            return (
              <div key={i} style={{ background:"rgba(255,255,255,.02)", borderRadius:8, padding:10, minHeight:200 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.st, textTransform:"uppercase", letterSpacing:.5 }}>{dayLabel}</div>
                    <div style={{ fontSize:14, color:"#fff", fontWeight:600 }}>{d.getDate()}</div>
                  </div>
                  {recommendedStaff !== null && (
                    <div title={`Avg revenue $${Math.round(sug!.avgRevenue)}`} style={{ fontSize:10, color:dayShifts.length >= recommendedStaff ? C.g : C.am, textAlign:"right" }}>
                      Suggest {recommendedStaff}<br /><span style={{ color:C.st }}>have {dayShifts.length}</span>
                    </div>
                  )}
                </div>
                {dayShifts.length === 0 ? (
                  <p style={{ fontSize:10, color:"rgba(255,255,255,.18)", textAlign:"center", margin:"20px 0 0" }}>No shifts</p>
                ) : dayShifts.map(s => {
                  const color = ROLE_COLORS[s.role ?? ""] ?? C.g;
                  return (
                    <div
                      key={s.id}
                      onClick={() => edit(s)}
                      style={{ background:"rgba(255,255,255,.03)", borderLeft:`3px solid ${color}`, borderRadius:4, padding:"6px 8px", marginBottom:5, cursor:"pointer" }}
                      title="Click to edit"
                    >
                      <div style={{ fontSize:11, color:"#fff", fontWeight:600 }}>{s.employee_name}</div>
                      <div style={{ fontSize:10, color:C.st, display:"flex", justifyContent:"space-between" }}>
                        <span>{s.role}</span>
                        <span>
                          {new Date(s.shift_start).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}–
                          {new Date(s.shift_end).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* All shifts table */}
      <div className="gc" style={{ overflow:"hidden", marginBottom:14 }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <span style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff" }}>All shifts this week</span>
        </div>
        <table>
          <thead>
            <tr><th>Employee</th><th>Role</th><th>Start</th><th>End</th><th>Rate</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={7}>Loading…</td></tr>
            ) : shifts.length === 0 ? (
              <tr className="empty-row"><td colSpan={7}>No shifts scheduled for this week — add one below.</td></tr>
            ) : shifts.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight:600, color:"#fff" }}>{s.employee_name}</td>
                <td style={{ color:C.st, textTransform:"capitalize" }}>{s.role}</td>
                <td>{new Date(s.shift_start).toLocaleString()}</td>
                <td>{new Date(s.shift_end).toLocaleString()}</td>
                <td>{s.hourly_rate ? `$${s.hourly_rate}/hr` : "—"}</td>
                <td style={{ textTransform:"capitalize", color:C.st }}>{s.status}</td>
                <td style={{ textAlign:"right" }}>
                  <button className="bg-btn" onClick={() => edit(s)} style={{ marginRight:4 }}>Edit</button>
                  <button className="bg-btn" onClick={() => remove(s.id)} style={{ color:C.r }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / edit form */}
      <div className="gc" style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:13, color:"#fff" }}>
            {editingId ? "Edit shift" : "Add shift"}
          </div>
          {editingId && <button className="bg-btn" onClick={() => { setEditingId(null); setForm(BLANK_FORM); }}>Cancel</button>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Employee name</label>
            <input value={form.employee_name} onChange={e=>setForm(f=>({...f, employee_name:e.target.value}))} placeholder="e.g. Jordan" />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f, role:e.target.value}))}>
              <option value="kitchen">Kitchen</option>
              <option value="front">Front</option>
              <option value="driver">Driver</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Hourly rate</label>
            <input type="number" value={form.hourly_rate} onChange={e=>setForm(f=>({...f, hourly_rate:Number(e.target.value)}))} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Notes</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} placeholder="optional" />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>Start</label>
            <input type="datetime-local" value={form.shift_start} onChange={e=>setForm(f=>({...f, shift_start:e.target.value}))} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, color:C.st, marginBottom:3 }}>End</label>
            <input type="datetime-local" value={form.shift_end} onChange={e=>setForm(f=>({...f, shift_end:e.target.value}))} />
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button className="bp" onClick={save}>{editingId ? "Save changes" : "Add shift"}</button>
        </div>
      </div>

      <p style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"center", marginTop:14 }}>
        Employee accounts, timesheet clock-in/out and Xero payroll export are the next step — ping support when you're ready.
      </p>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
