"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";
import { UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getMenu, toggleMenuItemAvailability, updateMenuItem, createMenuItem, createMenuCategory, deleteMenuItem } from "@/lib/queries";
import type { MenuCategory, MenuItem } from "@/lib/database.types";

const C = { g:"#00B67A", st:"#6B7C93", r:"#FF4757" };

type MenuSection = MenuCategory & { items: MenuItem[] };

export default function MenuPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [menu,        setMenu]        = useState<MenuSection[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [addingItem,  setAddingItem]  = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [form,        setForm]        = useState({ name:"", price:"", description:"", category_id:"" });
  const [newCatName,  setNewCatName]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  const reloadMenu = (id: string) =>
    getMenu(id).then(data => { setMenu(data as MenuSection[]); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => {
    if (!businessId) return;
    reloadMenu(businessId);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddItem = () => {
    const realCats = menu.filter(s => s.id !== "__uncategorised__");
    setForm({ name:"", price:"", description:"", category_id: realCats[0]?.id ?? "" });
    setAddingItem(true);
  };

  const saveNewItem = async () => {
    if (!businessId || !form.name || !form.price) return show("Name and price are required");
    setSaving(true);
    try {
      await createMenuItem(businessId, {
        category_id: form.category_id || null,
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
      });
      setAddingItem(false);
      show("Item added ✓");
      await reloadMenu(businessId); // always re-fetch so state matches DB
    } catch (e: any) { show(e?.message ?? "Failed to add item"); }
    finally { setSaving(false); }
  };

  const saveNewCategory = async () => {
    if (!businessId || !newCatName.trim()) return show("Enter a category name");
    setSaving(true);
    try {
      await createMenuCategory(businessId, newCatName.trim());
      setNewCatName("");
      setAddingCat(false);
      show("Category added ✓");
      await reloadMenu(businessId);
    } catch (e: any) { show(e?.message ?? "Failed to add category"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteMenuItem(item.id);
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.filter(it => it.id !== item.id) })));
    setEditingItem(null);
    show("Deleted");
  };

  const toggle = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.available);
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.map(it => it.id === item.id ? { ...it, available: !it.available } : it) })));
    show(item.available ? "Hidden" : "Visible ✓");
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name:item.name, price:String(item.price), description:item.description ?? "" });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    await updateMenuItem(editingItem.id, { name:form.name, price:parseFloat(form.price)||editingItem.price, description:form.description });
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.map(it => it.id === editingItem.id ? { ...it, name:form.name, price:parseFloat(form.price)||it.price, description:form.description } : it) })));
    setEditingItem(null);
    show("Saved ✓");
  };

  const bizLogo = "🏪";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Menu Builder</h2>
          <p style={{ color:C.st, fontSize:12 }}>Categories, items, modifiers, bundles</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="bg-btn" onClick={() => setAddingCat(true)}>+ Category</button>
          <button className="bp" onClick={openAddItem}>+ Add Item</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:48 }}>Loading…</div>
      ) : menu.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No menu items yet" description="Add categories and items to build your menu. Changes publish to your storefront instantly." />
      ) : menu.map((section, si) => (
        <div key={si} style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            {section.name}
            <span style={{ fontSize:10, color:C.st, background:"rgba(255,255,255,.05)", padding:"1px 8px", borderRadius:999 }}>{section.items.length}</span>
          </div>

          {section.items.map((item, ii) => (
            <div key={ii} className="gs" style={{ padding:"12px 16px", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:9, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {bizLogo}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:item.available?"#fff":"#6B7C93" }}>{item.name}</div>
                  {item.description && <div style={{ fontSize:11, color:C.st, marginTop:2 }}>{item.description}</div>}
                </div>
                <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-outfit)", color:item.available?"#fff":"#6B7C93", minWidth:55, textAlign:"right" }}>
                  ${item.price.toFixed(2)}
                </div>
                {/* Toggle */}
                <div onClick={() => toggle(item)} style={{ width:42, height:24, borderRadius:12, background:item.available?"rgba(0,182,122,.28)":"rgba(255,255,255,.08)", cursor:"pointer", position:"relative", border:`1px solid ${item.available?"rgba(0,182,122,.35)":"rgba(255,255,255,.08)"}`, flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:item.available?C.g:"#6B7C93", position:"absolute", top:2.5, left:item.available?21:2.5, transition:"all .2s", boxShadow:"0 1px 4px rgba(0,0,0,.3)" }} />
                </div>
                <button className="bg-btn" style={{ fontSize:12, padding:"6px 12px", flexShrink:0 }} onClick={() => openEdit(item)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Edit existing item */}
      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        <div style={{ marginBottom:12 }}><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
        <div style={{ marginBottom:12 }}><label>Price ($)</label><input type="number" step="0.5" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
        <div style={{ marginBottom:18 }}><label>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"space-between" }}>
          <button className="bg-btn" style={{ color:C.r }} onClick={() => editingItem && handleDelete(editingItem)}>Delete</button>
          <div style={{ display:"flex", gap:6 }}>
            <button className="bg-btn" onClick={() => setEditingItem(null)}>Cancel</button>
            <button className="bp" onClick={saveEdit}>Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Add new item */}
      <Modal open={addingItem} onClose={() => setAddingItem(false)} title="Add Menu Item">
        <div style={{ marginBottom:12 }}>
          <label>Category</label>
          <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}>
            <option value="">No category</option>
            {menu.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:12 }}><label>Item Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Margherita Pizza" /></div>
        <div style={{ marginBottom:12 }}><label>Price ($)</label><input type="number" step="0.5" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0.00" /></div>
        <div style={{ marginBottom:18 }}><label>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional short description" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setAddingItem(false)}>Cancel</button>
          <button className="bp" onClick={saveNewItem} disabled={saving}>{saving ? "Saving…" : "Add Item"}</button>
        </div>
      </Modal>

      {/* Add new category */}
      <Modal open={addingCat} onClose={() => setAddingCat(false)} title="Add Category">
        <div style={{ marginBottom:18 }}><label>Category Name</label><input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="e.g. Mains, Desserts, Drinks" autoFocus /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setAddingCat(false)}>Cancel</button>
          <button className="bp" onClick={saveNewCategory} disabled={saving}>{saving ? "Saving…" : "Add Category"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
