"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/badge";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getDrivers, createDriver, updateDriver, deleteDriver } from "@/lib/queries";

const C = { g:"#00B67A", o:"#FF6B35", r:"#FF4757", st:"#6B7C93", cl:"#F8FAFB", mist:"rgba(226,232,240,.08)" };

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  provider?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
};

const BLANK: Omit<Driver,"id"|"is_active"|"created_at"> = {
  name:"", phone:"", email:"", provider:"", notes:"",
};

function Av({ n, sz=28 }: { n:string; sz?:number }) {
  return (
    <div style={{ width:sz, height:sz, borderRadius:sz*.3, background:"linear-gradient(135deg,#1C2D48,#0F1F2D)", border:"1px solid rgba(255,255,255,.08)", color:"#8B9DB5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*.36, fontWeight:600, fontFamily:"var(--font-outfit)", flexShrink:0 }}>
      {n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
    </div>
  );
}

export default function DriversPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [drivers,   setDrivers]   = useState<Driver[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<"all"|"active"|"inactive">("all");
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState<"add"|"edit"|"delete"|null>(null);
  const [selected,  setSelected]  = useState<Driver | null>(null);
  const [form,      setForm]      = useState({ ...BLANK });
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!businessId) return;
    getDrivers(businessId).then(d => {
      setDrivers(d as Driver[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [businessId]);

  const filtered = drivers
    .filter(d => filter === "all" ? true : filter === "active" ? d.is_active : !d.is_active)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.phone ?? "").includes(search));

  const openAdd = () => { setForm({ ...BLANK }); setSelected(null); setModal("add"); };
  const openEdit = (d: Driver) => {
    setSelected(d);
    setForm({ name: d.name, phone: d.phone ?? "", email: d.email ?? "", provider: d.provider ?? "", notes: d.notes ?? "" });
    setModal("edit");
  };
  const openDelete = (d: Driver) => { setSelected(d); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) return show("Name is required");
    setSaving(true);
    try {
      if (modal === "add") {
        const d = await createDriver(businessId, { name: form.name.trim(), phone: form.phone || undefined, email: form.email || undefined, provider: form.provider || undefined, notes: form.notes || undefined });
        setDrivers(prev => [d as Driver, ...prev]);
        show("Driver added ✓");
      } else if (modal === "edit" && selected) {
        const d = await updateDriver(selected.id, { name: form.name.trim(), phone: form.phone || null, email: form.email || null, provider: form.provider || null, notes: form.notes || null });
        setDrivers(prev => prev.map(x => x.id === selected.id ? d as Driver : x));
        show("Driver updated ✓");
      }
      closeModal();
    } catch { show("Save failed"); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (d: Driver) => {
    try {
      const updated = await updateDriver(d.id, { is_active: !d.is_active });
      setDrivers(prev => prev.map(x => x.id === d.id ? updated as Driver : x));
      show(`Driver ${!d.is_active ? "activated" : "deactivated"} ✓`);
    } catch { show("Update failed"); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDriver(selected.id);
      setDrivers(prev => prev.filter(x => x.id !== selected.id));
      show("Driver removed ✓");
      closeModal();
    } catch { show("Delete failed"); }
    finally { setSaving(false); }
  };

  const activeCount   = drivers.filter(d => d.is_active).length;
  const inactiveCount = drivers.filter(d => !d.is_active).length;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Drivers</h2>
          <p style={{ color:C.st, fontSize:12 }}>In-house delivery team · {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}</p>
        </div>
        <button className="bp" onClick={openAdd}>+ Add Driver</button>
      </div>

      {/* ── Info banner — no numbers yet ── */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", marginBottom:16, borderRadius:10, background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.18)" }}>
        <span style={{ fontSize:16, flexShrink:0 }}>ℹ️</span>
        <div style={{ fontSize:12, color:C.g, lineHeight:1.6 }}>
          <strong>Rates &amp; capacity not yet configured.</strong> Once you have the numbers, head to{" "}
          <strong>Settings → Delivery Providers</strong> to set the daily rate and orders-per-driver-per-day.
          The delivery prediction engine will use those values automatically.
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…" style={{ width:200 }} />
        {(["all","active","inactive"] as const).map(f => (
          <button key={f} className={`bg-btn ${filter===f?"on":""}`} onClick={() => setFilter(f)} style={{ textTransform:"capitalize" }}>{f}</button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="gc" style={{ overflow:"hidden" }}>
        <table>
          <thead>
            <tr>{["","Name","Phone","Email","Provider","Status",""].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>{loading ? "Loading…" : drivers.length === 0 ? "No drivers yet — add your first driver above" : "No drivers match this filter"}</td>
              </tr>
            ) : filtered.map((d, i) => (
              <tr key={i} style={{ cursor:"pointer" }} onClick={() => openEdit(d)}>
                <td><Av n={d.name} /></td>
                <td>
                  <div style={{ fontWeight:600, color:"#fff", fontSize:13 }}>{d.name}</div>
                  {d.notes && <div style={{ fontSize:10, color:C.st }}>{d.notes}</div>}
                </td>
                <td style={{ fontSize:13, color:C.cl }}>{d.phone || <span style={{ color:C.st }}>—</span>}</td>
                <td style={{ fontSize:12, color:C.st }}>{d.email || "—"}</td>
                <td><Badge type={d.provider ?? undefined}>{d.provider || "—"}</Badge></td>
                <td>
                  <Badge type={d.is_active ? "active" : "inactive"}>{d.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display:"flex", gap:4 }}>
                    <button className="bg-btn" style={{ padding:"4px 10px", fontSize:11 }} onClick={() => handleToggleActive(d)}>
                      {d.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="bg-btn" style={{ padding:"4px 10px", fontSize:11, color:C.r, borderColor:"rgba(255,71,87,.2)" }} onClick={() => openDelete(d)}>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal open={modal === "add" || modal === "edit"} onClose={closeModal} title={modal === "add" ? "Add Driver" : "Edit Driver"}>
        <div style={{ marginBottom:12 }}>
          <label>Full Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jordan Smith" autoFocus />
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+61 400 000 000" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="driver@email.com" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label>Provider / Type</label>
          <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Tasker, In-house, Casual" />
        </div>
        <div style={{ marginBottom:18 }}>
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any additional notes…" style={{ width:"100%" }} />
        </div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={closeModal}>Cancel</button>
          <button className="bp" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Add Driver" : "Save Changes"}</button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={modal === "delete"} onClose={closeModal} title="Remove Driver">
        <p style={{ fontSize:14, color:C.cl, marginBottom:18 }}>
          Are you sure you want to remove <strong>{selected?.name}</strong>? This cannot be undone.
        </p>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={closeModal}>Cancel</button>
          <button className="bp" style={{ background:C.r, borderColor:C.r }} onClick={handleDelete} disabled={saving}>{saving ? "Removing…" : "Remove Driver"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
