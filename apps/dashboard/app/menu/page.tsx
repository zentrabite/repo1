"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";
import { UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getMenu, toggleMenuItemAvailability, updateMenuItem } from "@/lib/queries";
import type { MenuCategory, MenuItem } from "@/lib/database.types";

const C = { g:"#00B67A", st:"#6B7C93" };

type MenuSection = MenuCategory & { items: MenuItem[] };

export default function MenuPage() {
  const { toast, show } = useToast();
  const { businessId, business } = useBusiness();

  const [menu,        setMenu]        = useState<MenuSection[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form,        setForm]        = useState({ name:"", price:"", description:"" });
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!businessId) return;
    getMenu(businessId).then(data => { setMenu(data as MenuSection[]); setLoading(false); });
  }, [businessId]);

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
        <button className="bp" onClick={() => show("Add item — coming soon")}>+ Add Item</button>
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

      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        <div style={{ marginBottom:12 }}><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
        <div style={{ marginBottom:12 }}><label>Price ($)</label><input type="number" step="0.5" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
        <div style={{ marginBottom:18 }}><label>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setEditingItem(null)}>Cancel</button>
          <button className="bp" onClick={saveEdit}>Save Changes</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
