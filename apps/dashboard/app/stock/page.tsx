"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import Modal from "@/components/modal";
import Toast from "@/components/toast";
import EmptyState from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import {
  getStock,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  recordStockCount,
  type StockItem,
} from "@/lib/stock-queries";

const C = { g: "#00B67A", st: "#6B7C93", o: "#FF6B35", r: "#FF4757", mist: "rgba(255,255,255,.07)" };

function statusFor(it: StockItem) {
  if (it.on_hand <= 0) return { label: "Out of stock", color: C.r };
  if (it.on_hand <= it.par_level * 0.5) return { label: "Critical", color: C.r };
  if (it.on_hand <= it.par_level) return { label: "Low - reorder", color: C.o };
  return { label: "OK", color: C.g };
}

function daysToExpiry(d: string | null) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

const EMPTY_FORM = {
  name: "", unit: "each", supplier: "", cost: "0", on_hand: "0",
  par_level: "0", reorder_to: "0", lead_time_days: "2", auto_reorder: false,
  expiry_date: "",
};

export default function StockPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [counting, setCounting] = useState<StockItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [countQty, setCountQty] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(id: string) {
    setLoading(true);
    try {
      const data = await getStock(id);
      setItems(data);
    } catch (e: any) { show(e?.message ?? "Failed to load stock"); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (businessId) load(businessId); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveItem(newItem: boolean) {
    if (!businessId) return;
    if (!form.name) return show("Name required");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        unit: form.unit,
        supplier: form.supplier || null,
        cost: Number(form.cost),
        on_hand: Number(form.on_hand),
        par_level: Number(form.par_level),
        reorder_to: Number(form.reorder_to),
        lead_time_days: Number(form.lead_time_days),
        auto_reorder: form.auto_reorder,
        expiry_date: form.expiry_date || null,
      };
      if (newItem) {
        await createStockItem(businessId, payload);
      } else if (editing) {
        await updateStockItem(editing.id, payload);
      }
      show(newItem ? "Item added" : "Saved");
      setAdding(false); setEditing(null); setForm(EMPTY_FORM);
      await load(businessId);
    } catch (e: any) { show(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function submitCount() {
    if (!counting || !businessId) return;
    setSaving(true);
    try {
      const after = await recordStockCount(businessId, counting, Number(countQty));
      show("Counted. On hand: " + after);
      setCounting(null); setCountQty("");
      await load(businessId);
    } catch (e: any) { show(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  }

  async function remove(it: StockItem) {
    if (!businessId) return;
    if (!confirm(`Delete "${it.name}"?`)) return;
    try {
      await deleteStockItem(it.id);
      setEditing(null);
      await load(businessId);
      show("Deleted");
    } catch (e: any) { show(e?.message ?? "Failed to delete"); }
  }

  function openEdit(it: StockItem) {
    setEditing(it);
    setForm({
      name: it.name, unit: it.unit, supplier: it.supplier ?? "",
      cost: String(it.cost), on_hand: String(it.on_hand),
      par_level: String(it.par_level), reorder_to: String(it.reorder_to),
      lead_time_days: String(it.lead_time_days), auto_reorder: it.auto_reorder,
      expiry_date: it.expiry_date ?? "",
    });
  }

  const lowCount = items.filter(i => i.on_hand <= i.par_level).length;
  const outCount = items.filter(i => i.on_hand <= 0).length;
  const expiringSoon = items.filter(i => {
    const d = daysToExpiry(i.expiry_date);
    return d !== null && d <= 3;
  }).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 20, color: "#fff" }}>Stock</h2>
          <p style={{ color: C.st, fontSize: 12 }}>Par levels, counts and AI reorder suggestions</p>
        </div>
        <button className="bp" onClick={() => { setForm(EMPTY_FORM); setAdding(true); }}>+ Add Stock Item</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Items tracked", value: items.length, color: "#fff" },
          { label: "Low / reorder",  value: lowCount,    color: C.o },
          { label: "Out of stock",   value: outCount,    color: C.r },
          { label: "Expiring soon",  value: expiringSoon, color: C.o },
        ].map((k) => (
          <div key={k.label} className="gs" style={{ padding: 14 }}>
            <div style={{ fontSize: 10.5, color: C.st, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontFamily: "var(--font-outfit)", fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", padding: 48 }}>Loading</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="No stock items yet" description="Add your first stock item to start tracking par levels, reorder triggers and expiry dates." />
      ) : (
        <div className="gs" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 120px 120px 120px 100px", gap: 0, fontSize: 11, color: C.st, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, padding: "10px 16px", borderBottom: `1px solid ${C.mist}` }}>
            <div>Item</div><div>On hand</div><div>Par</div><div>Status</div><div>Expiry</div><div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {items.map((it) => {
            const st = statusFor(it);
            const dte = daysToExpiry(it.expiry_date);
            return (
              <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 120px 120px 120px 100px", alignItems: "center", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.mist}`, fontSize: 13 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600 }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: C.st, marginTop: 2 }}>{(it.supplier ?? "No supplier") + " - $" + it.cost.toFixed(2) + "/" + it.unit}</div>
                </div>
                <div style={{ color: "#fff", fontFamily: "var(--font-outfit)", fontWeight: 700 }}>{it.on_hand} <span style={{ color: C.st, fontSize: 11, fontWeight: 500 }}>{it.unit}</span></div>
                <div style={{ color: C.st }}>{it.par_level} {it.unit}</div>
                <div><span style={{ fontSize: 11, fontWeight: 700, color: st.color, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: `1px solid ${st.color}55` }}>{st.label}</span></div>
                <div style={{ color: dte !== null && dte <= 3 ? C.o : C.st, fontSize: 12 }}>
                  {it.expiry_date ? (dte! < 0 ? "Expired " + Math.abs(dte!) + "d" : dte + "d") : "-"}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button className="bg-btn" style={{ fontSize: 11, padding: "5px 9px" }} onClick={() => { setCountQty(String(it.on_hand)); setCounting(it); }}>Count</button>
                  <button className="bg-btn" style={{ fontSize: 11, padding: "5px 9px" }} onClick={() => openEdit(it)}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Stock Item">
        <StockForm form={form} setForm={setForm} />
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="bg-btn" onClick={() => setAdding(false)}>Cancel</button>
          <button className="bp" onClick={() => saveItem(true)} disabled={saving || !form.name}>{saving ? "Saving..." : "Add Item"}</button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Stock Item">
        <StockForm form={form} setForm={setForm} />
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
          <button className="bg-btn" style={{ color: C.r }} onClick={() => editing && remove(editing)}>Delete</button>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="bg-btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="bp" onClick={() => saveItem(false)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!counting} onClose={() => setCounting(null)} title={"Stock take: " + (counting?.name ?? "")}>
        <div style={{ marginBottom: 12 }}>
          <label>New on-hand quantity ({counting?.unit})</label>
          <input type="number" step="0.01" value={countQty} onChange={(e) => setCountQty(e.target.value)} autoFocus />
        </div>
        <div style={{ fontSize: 12, color: C.st, marginBottom: 14 }}>Previous: {counting?.on_hand} {counting?.unit}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="bg-btn" onClick={() => setCounting(null)}>Cancel</button>
          <button className="bp" onClick={submitCount} disabled={saving}>{saving ? "Saving..." : "Record count"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

function StockForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <>
      <div style={{ marginBottom: 12 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken thigh" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label>Unit</label>
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="each">each</option><option value="kg">kg</option><option value="g">g</option>
            <option value="L">L</option><option value="mL">mL</option><option value="box">box</option>
            <option value="pack">pack</option>
          </select>
        </div>
        <div><label>Supplier</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Optional" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label>Cost / unit ($)</label><input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
        <div><label>On hand</label><input type="number" step="0.01" value={form.on_hand} onChange={(e) => setForm({ ...form, on_hand: e.target.value })} /></div>
        <div><label>Par level</label><input type="number" step="0.01" value={form.par_level} onChange={(e) => setForm({ ...form, par_level: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><label>Reorder to</label><input type="number" step="0.01" value={form.reorder_to} onChange={(e) => setForm({ ...form, reorder_to: e.target.value })} /></div>
        <div><label>Lead time (days)</label><input type="number" min="0" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} /></div>
        <div><label>Expiry</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "#fff" }}>
        <input type="checkbox" checked={form.auto_reorder} onChange={(e) => setForm({ ...form, auto_reorder: e.target.checked })} style={{ width: "auto" }} />
        Auto-reorder when stock drops below par
      </label>
    </>
  );
}
